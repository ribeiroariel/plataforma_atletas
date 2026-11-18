import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTreino } from "@/lib/planilha/parseTreino";
import { mapearSessoesParaCalendario, type SessaoDoDia } from "@/lib/planilha/calendario";

export type SessaoAgenda = SessaoDoDia & { planoId: string };

export type PlanoAgenda = {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  data_criacao: string;
  data_inicio: string | null;
  modo_treino: string | null;
};

export type Agenda = {
  planos: PlanoAgenda[];
  semanais: PlanoAgenda[];
  avulsos: PlanoAgenda[];
  porData: Map<string, SessaoAgenda>;
  concluidos: Set<string>; // `${planoId}:${sessionKey}`
  comRegistro: Set<string>;
};

export function mesVizinho(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(ano, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function mesValido(mes: string | undefined, hoje: string): string {
  return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : hoje.slice(0, 7);
}

export function ehTreino(s: SessaoAgenda | undefined): s is SessaoAgenda {
  return !!s && !s.descanso && !!s.resumo;
}

// Coloca cada dia dos planos semanais de um atleta numa data de calendário,
// junto com o que já foi concluído ou começado. Serve tanto pra agenda do
// atleta quanto pro calendário que o treinador vê.
export async function montarAgenda(supabase: SupabaseClient, athleteId: string): Promise<Agenda> {
  const [{ data: planosBrutos }, { data: conclusoes }, { data: logs }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, nome_arquivo, arquivo_url, data_criacao, data_inicio, modo_treino")
      .eq("athlete_id", athleteId)
      .order("data_criacao", { ascending: false }),
    supabase.from("training_completions").select("training_plan_id, session_key").eq("athlete_id", athleteId),
    supabase.from("exercise_logs").select("training_plan_id, session_key").eq("athlete_id", athleteId),
  ]);

  const planos = (planosBrutos ?? []) as PlanoAgenda[];
  const semanais = planos.filter((p) => p.modo_treino === "semana");
  const avulsos = planos.filter((p) => p.modo_treino !== "semana");

  const mapeados = await Promise.all(
    semanais.map(async (plano): Promise<SessaoAgenda[]> => {
      const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);
      if (!arquivo) return [];
      try {
        const treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
        if (treino.tipo !== "semana") return [];
        return mapearSessoesParaCalendario(treino, plano.data_inicio ?? plano.data_criacao, plano.data_inicio)
          .filter((s) => !s.antesDoInicio)
          .map((s) => ({ ...s, planoId: plano.id }));
      } catch {
        return [];
      }
    }),
  );

  // Dois planos podem cair no mesmo dia (um novo começando antes do antigo
  // terminar): fica valendo o mais recente, que vem primeiro na lista.
  const porData = new Map<string, SessaoAgenda>();
  for (const sessao of mapeados.flat()) {
    const atual = porData.get(sessao.data);
    if (!atual || (!ehTreino(atual) && ehTreino(sessao))) porData.set(sessao.data, sessao);
  }

  return {
    planos,
    semanais,
    avulsos,
    porData,
    concluidos: new Set((conclusoes ?? []).map((c) => `${c.training_plan_id}:${c.session_key}`)),
    comRegistro: new Set((logs ?? []).map((l) => `${l.training_plan_id}:${l.session_key}`)),
  };
}
