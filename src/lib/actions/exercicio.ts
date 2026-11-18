"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";
import { paceParaMinutos, numero } from "./valores";

type Resultado = { ok: true } | { erro: string };

// corporal: exercício com o peso do corpo — o valor é o número de repetições.
type Metrica = "kg" | "distancia" | "tempo" | "pace" | "corporal";

// Mapeamento métrica -> (tipo, variavel, unidade, agregação) para consolidar em
// training_data. A combinação satisfaz o check `combinacao_valida` do schema.
//   kg        -> academia / volume_carga / kg     (SOMA do dia)
//   distancia -> corrida  / distancia    / km     (SOMA do dia)
//   tempo     -> cardio   / tempo        / min    (SOMA do dia)
//   pace      -> corrida  / pace         / min/km (MÉDIA simples do dia)
// Peso corporal não entra no volume de carga da Evolução (não tem kg).
const MAPA: Record<
  Exclude<Metrica, "corporal">,
  { tipo: string; variavel: string; unidade: string; agregacao: "soma" | "media" }
> = {
  kg: { tipo: "academia", variavel: "volume_carga", unidade: "kg", agregacao: "soma" },
  distancia: { tipo: "corrida", variavel: "distancia", unidade: "km", agregacao: "soma" },
  tempo: { tipo: "cardio", variavel: "tempo", unidade: "min", agregacao: "soma" },
  pace: { tipo: "corrida", variavel: "pace", unidade: "min/km", agregacao: "media" },
};

function ehMetrica(v: string): v is Metrica {
  return v === "kg" || v === "distancia" || v === "tempo" || v === "pace" || v === "corporal";
}

// CONSOLIDAÇÃO NA EVOLUÇÃO — importante:
// Nos dias em que o atleta usa o registro por exercício, o exercise_logs é a
// FONTE DE VERDADE daquele (data, tipo, variavel): este recálculo pode
// sobrescrever um valor que tenha sido digitado no formulário manual agregado
// (registrarTreino), porque agrega TODOS os logs do atleta naquela data/métrica.
// Busca todos os exercise_logs do atleta com aquela data e métrica; se houver
// >=1, faz upsert em training_data com SOMA (ou MÉDIA para pace); se sobrar 0
// (o último foi removido), apaga a linha correspondente de training_data.
// recalcularAgregado soma TODOS os exercise_logs do atleta naquele dia/
// métrica, sem se importar com item_index nem serie — então múltiplas
// séries do mesmo exercício (cada uma sua própria linha) já entram
// corretamente na soma de volume do dia, sem precisar de nenhuma mudança
// aqui: mais linhas de série = mais termos na soma = volume real.
async function recalcularAgregado(
  supabase: SupabaseClient,
  athleteId: string,
  data: string,
  metrica: Metrica,
): Promise<void> {
  if (metrica === "corporal") return;
  const { tipo, variavel, unidade, agregacao } = MAPA[metrica];

  const { data: logs, error } = await supabase
    .from("exercise_logs")
    .select("valor")
    .eq("athlete_id", athleteId)
    .eq("data", data)
    .eq("metrica", metrica);

  if (error) {
    console.error("[exercicio] recalcularAgregado select", error);
    return;
  }

  const valores = (logs ?? []).map((l) => Number(l.valor)).filter((n) => Number.isFinite(n));

  if (valores.length === 0) {
    const { error: delErro } = await supabase
      .from("training_data")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("data", data)
      .eq("tipo", tipo)
      .eq("variavel", variavel);
    if (delErro) console.error("[exercicio] recalcularAgregado delete", delErro);
    return;
  }

  const soma = valores.reduce((acc, n) => acc + n, 0);
  const valor = agregacao === "media" ? soma / valores.length : soma;

  const { error: upErro } = await supabase
    .from("training_data")
    .upsert(
      { athlete_id: athleteId, data, tipo, variavel, valor, unidade },
      { onConflict: "athlete_id,data,tipo,variavel" },
    );
  if (upErro) console.error("[exercicio] recalcularAgregado upsert", upErro);
}

export async function registrarExercicio(
  trainingPlanId: string,
  sessionKey: string,
  itemIndex: number,
  serie: number,
  metrica: string,
  valorBruto: string,
  data: string,
  // Repetições daquela série (só carga). undefined = não mexe; null = apaga.
  reps?: number | null,
): Promise<Resultado> {
  if (!trainingPlanId) return { erro: "Treino inválido." };
  if (!sessionKey || sessionKey.length > 60) return { erro: "Sessão inválida." };
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return { erro: "Exercício inválido." };
  if (!Number.isInteger(serie) || serie < 1 || serie > 20) return { erro: "Série inválida." };
  if (!ehMetrica(metrica)) return { erro: "Escolha uma métrica válida." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe uma data válida." };

  if (reps !== undefined && reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 200)) {
    return { erro: "As repetições precisam ser um número entre 1 e 200." };
  }

  const hoje = new Date().toISOString().slice(0, 10);
  if (data > hoje) return { erro: "A data não pode ser no futuro." };

  const valor = metrica === "pace" ? paceParaMinutos(valorBruto) : numero(valorBruto);
  if (valor === null || valor <= 0) return { erro: "O valor precisa ser um número positivo." };
  if (metrica === "corporal" && (!Number.isInteger(valor) || valor > 500)) {
    return { erro: "Informe as repetições como número inteiro." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  // Estado anterior do log (se existir): se a métrica/data mudou, o agregado
  // antigo também precisa ser recalculado depois do upsert.
  const { data: anterior } = await supabase
    .from("exercise_logs")
    .select("metrica, data")
    .eq("training_plan_id", trainingPlanId)
    .eq("session_key", sessionKey)
    .eq("item_index", itemIndex)
    .eq("serie", serie)
    .maybeSingle();

  const agora = new Date().toISOString();
  const linha: Record<string, string | number | null> = {
    athlete_id: athleteId,
    training_plan_id: trainingPlanId,
    session_key: sessionKey,
    item_index: itemIndex,
    serie,
    metrica,
    valor,
    data,
    updated_at: agora,
  };
  const conflito = { onConflict: "training_plan_id,session_key,item_index,serie" };
  const comReps = metrica === "kg" && reps !== undefined;

  let { error } = await supabase.from("exercise_logs").upsert(comReps ? { ...linha, reps } : linha, conflito);
  // A coluna "reps" só existe depois de rodar a migração de 16/11/2026. Se
  // ainda não rodou, grava a carga mesmo assim, sem as repetições.
  if (error && comReps && /reps/i.test(error.message ?? "")) {
    ({ error } = await supabase.from("exercise_logs").upsert(linha, conflito));
  }

  if (error) {
    console.error("[exercicio] registrarExercicio upsert", error);
    // 23514 = regra de valores do banco. Pra "corporal" quer dizer que a
    // migração de 16/11/2026 ainda não rodou.
    if (metrica === "corporal" && error.code === "23514") {
      return { erro: "O registro de peso corporal ainda não está ligado. Avise o treinador." };
    }
    return { erro: "Não deu para salvar o registro. Tente de novo." };
  }

  await recalcularAgregado(supabase, athleteId, data, metrica);
  if (anterior && ehMetrica(anterior.metrica) && (anterior.metrica !== metrica || anterior.data !== data)) {
    await recalcularAgregado(supabase, athleteId, anterior.data, anterior.metrica);
  }

  revalidatePath("/atleta/evolucao");
  revalidatePath(`/atleta/treinos/${trainingPlanId}`);
  return { ok: true };
}

export async function removerExercicio(
  trainingPlanId: string,
  sessionKey: string,
  itemIndex: number,
  serie: number,
): Promise<Resultado> {
  if (!trainingPlanId) return { erro: "Treino inválido." };
  if (!sessionKey || sessionKey.length > 60) return { erro: "Sessão inválida." };
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return { erro: "Exercício inválido." };
  if (!Number.isInteger(serie) || serie < 1 || serie > 20) return { erro: "Série inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  // Precisamos da métrica/data ANTES de apagar para recalcular o agregado certo.
  const { data: log } = await supabase
    .from("exercise_logs")
    .select("metrica, data")
    .eq("training_plan_id", trainingPlanId)
    .eq("session_key", sessionKey)
    .eq("item_index", itemIndex)
    .eq("serie", serie)
    .maybeSingle();

  if (!log) return { ok: true }; // nada para remover

  const { error } = await supabase
    .from("exercise_logs")
    .delete()
    .eq("training_plan_id", trainingPlanId)
    .eq("session_key", sessionKey)
    .eq("item_index", itemIndex)
    .eq("serie", serie);

  if (error) {
    console.error("[exercicio] removerExercicio delete", error);
    return { erro: "Não deu para remover o registro. Tente de novo." };
  }

  if (ehMetrica(log.metrica)) {
    await recalcularAgregado(supabase, athleteId, log.data, log.metrica);
  }

  revalidatePath("/atleta/evolucao");
  revalidatePath(`/atleta/treinos/${trainingPlanId}`);
  return { ok: true };
}
