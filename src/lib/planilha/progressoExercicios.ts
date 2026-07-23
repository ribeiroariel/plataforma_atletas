import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTreino, unidadesRegistraveis, type ModoSemana, type BlocoSessao } from "./parseTreino";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type ProgressoExercicio = {
  exercicio: string;
  pontos: { data: string; valor: number }[];
};

// Junta exercise_logs (que só guarda session_key/item_index/serie, sem o
// nome do exercício) com o texto original de cada planilha do atleta, pra
// poder mostrar progressão por exercício específico — mesma técnica usada
// na skill analise-estatistica-treinos (scripts/parse_treino.py), agora em
// TypeScript porque aqui já temos o parser original disponível.
//
// Agrupa por nome normalizado EXATO (sem acento, minúsculo), nunca por
// aproximação — "Agachamento livre" e "Agachamento barra costas" são
// exercícios diferentes de verdade e não devem virar um grupo só. Só
// considera metrica='kg' (carga), que é o caso de uso pedido; soma as
// séries do mesmo dia (várias séries do mesmo exercício no mesmo dia viram
// um ponto só, o volume daquele dia nesse exercício).
export async function buscarProgressoExercicios(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<ProgressoExercicio[]> {
  const { data: planos } = await supabase
    .from("training_plans")
    .select("id, arquivo_url, modo_treino")
    .eq("athlete_id", athleteId)
    .in("modo_treino", ["semana", "blocos"]);

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("training_plan_id, session_key, item_index, valor, data")
    .eq("athlete_id", athleteId)
    .eq("metrica", "kg");

  if (!planos || planos.length === 0 || !logs || logs.length === 0) return [];

  const logsPorPlano = new Map<string, typeof logs>();
  for (const log of logs) {
    const lista = logsPorPlano.get(log.training_plan_id) ?? [];
    lista.push(log);
    logsPorPlano.set(log.training_plan_id, lista);
  }

  // grupo normalizado -> { rotuloOriginal, pontosPorData: soma do dia }
  const grupos = new Map<string, { rotulo: string; pontosPorData: Map<string, number> }>();

  for (const plano of planos) {
    const logsDoPlano = logsPorPlano.get(plano.id);
    if (!logsDoPlano || logsDoPlano.length === 0) continue;

    const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);
    if (!arquivo) continue;

    let treino;
    try {
      treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
    } catch {
      continue;
    }

    // session_key -> item_index -> rótulo
    const mapaSessoes = new Map<string, Map<number, string>>();
    if (treino.tipo === "semana") {
      for (const semana of (treino as ModoSemana).semanas) {
        for (const dia of semana.dias) {
          if (dia.descanso) continue;
          const unidades = unidadesRegistraveis(dia);
          mapaSessoes.set(dia.chave, new Map(unidades.map((u) => [u.itemIndex, u.rotulo])));
        }
      }
    } else if (treino.tipo === "blocos") {
      for (const bloco of treino.sessao as BlocoSessao[]) {
        const unidades = unidadesRegistraveis(bloco);
        mapaSessoes.set(bloco.chave, new Map(unidades.map((u) => [u.itemIndex, u.rotulo])));
      }
    } else {
      continue;
    }

    for (const log of logsDoPlano) {
      const rotulo = mapaSessoes.get(log.session_key)?.get(log.item_index);
      if (!rotulo) continue;

      const chave = normalizar(rotulo);
      const grupo = grupos.get(chave) ?? { rotulo, pontosPorData: new Map<string, number>() };
      grupo.pontosPorData.set(log.data, (grupo.pontosPorData.get(log.data) ?? 0) + Number(log.valor));
      grupos.set(chave, grupo);
    }
  }

  return [...grupos.values()]
    .map((g) => ({
      exercicio: g.rotulo,
      pontos: [...g.pontosPorData.entries()]
        .map(([data, valor]) => ({ data, valor }))
        .sort((a, b) => a.data.localeCompare(b.data)),
    }))
    .filter((p) => p.pontos.length > 0)
    .sort((a, b) => b.pontos[b.pontos.length - 1].data.localeCompare(a.pontos[a.pontos.length - 1].data));
}
