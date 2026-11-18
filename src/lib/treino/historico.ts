import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTreino, unidadesRegistraveis } from "@/lib/planilha/parseTreino";
import { estimar1RM } from "./rm";
import { normalizarRotulo } from "./registros";

export type SerieHistorico = { serie: number; kg: number; reps?: number };

export type EntradaHistorico = {
  data: string;
  planoId: string;
  sessionKey: string;
  series: SerieHistorico[];
};

export type HistoricoExercicio = {
  chave: string; // nome normalizado (sem acento, minúsculo)
  nome: string;
  entradas: EntradaHistorico[]; // da mais antiga pra mais recente
  recordeKg: number; // maior carga numa única série
  recordeData: string;
  melhor1RM: number | null; // melhor 1RM estimado (só quando há repetições)
};

type LinhaLog = {
  training_plan_id: string;
  session_key: string;
  item_index: number;
  serie: number;
  valor: number | string;
  data: string;
  reps?: number | null;
};

// Tudo que o atleta já registrou de carga, organizado por exercício.
//
// exercise_logs só guarda "plano, sessão, posição" — o nome do exercício está
// na planilha. Então abre cada planilha que tem registro e casa a posição com
// o nome. Agrupa por nome EXATO (sem acento/maiúsculas): "Agachamento livre"
// e "Agachamento barra costas" são exercícios diferentes e não se misturam.
export async function buscarHistorico(supabase: SupabaseClient, athleteId: string): Promise<HistoricoExercicio[]> {
  const base = "training_plan_id, session_key, item_index, serie, valor, data";
  let logs: LinhaLog[] | null;
  const comReps = await supabase.from("exercise_logs").select(`${base}, reps`).eq("athlete_id", athleteId).eq("metrica", "kg");
  if (comReps.error) {
    // Coluna "reps" ainda não existe (migração de 16/11/2026 não rodou).
    const semReps = await supabase.from("exercise_logs").select(base).eq("athlete_id", athleteId).eq("metrica", "kg");
    logs = semReps.data as LinhaLog[] | null;
  } else {
    logs = comReps.data as LinhaLog[] | null;
  }
  if (!logs || logs.length === 0) return [];

  const idsPlanos = [...new Set(logs.map((l) => l.training_plan_id))];
  const { data: planos } = await supabase.from("training_plans").select("id, arquivo_url").in("id", idsPlanos);

  // plano -> sessão -> posição -> nome do exercício
  const nomes = new Map<string, Map<string, Map<number, string>>>();
  await Promise.all(
    (planos ?? []).map(async (plano) => {
      const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);
      if (!arquivo) return;
      try {
        const treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
        const sessoes =
          treino.tipo === "semana"
            ? treino.semanas.flatMap((s) => s.dias).filter((d) => !d.descanso)
            : treino.tipo === "blocos"
              ? treino.sessao
              : [];
        const porSessao = new Map<string, Map<number, string>>();
        for (const sessao of sessoes) {
          porSessao.set(sessao.chave, new Map(unidadesRegistraveis(sessao).map((u) => [u.itemIndex, u.rotulo])));
        }
        nomes.set(plano.id, porSessao);
      } catch {
        // planilha ilegível: os registros dela ficam de fora do histórico
      }
    }),
  );

  const grupos = new Map<string, { nome: string; entradas: Map<string, EntradaHistorico> }>();
  for (const log of logs) {
    const nome = nomes.get(log.training_plan_id)?.get(log.session_key)?.get(log.item_index);
    if (!nome) continue;
    const chave = normalizarRotulo(nome);
    const grupo = grupos.get(chave) ?? { nome, entradas: new Map<string, EntradaHistorico>() };
    const idEntrada = `${log.data}|${log.training_plan_id}|${log.session_key}`;
    const entrada = grupo.entradas.get(idEntrada) ?? {
      data: log.data,
      planoId: log.training_plan_id,
      sessionKey: log.session_key,
      series: [],
    };
    entrada.series.push({ serie: log.serie, kg: Number(log.valor), ...(log.reps ? { reps: log.reps } : {}) });
    grupo.entradas.set(idEntrada, entrada);
    grupos.set(chave, grupo);
  }

  return [...grupos.entries()]
    .map(([chave, g]) => {
      const entradas = [...g.entradas.values()]
        .map((e) => ({ ...e, series: e.series.sort((a, b) => a.serie - b.serie) }))
        .sort((a, b) => a.data.localeCompare(b.data));
      let recordeKg = 0;
      let recordeData = entradas[0]?.data ?? "";
      let melhor1RM: number | null = null;
      for (const e of entradas) {
        for (const s of e.series) {
          if (s.kg > recordeKg) {
            recordeKg = s.kg;
            recordeData = e.data;
          }
          if (s.reps) melhor1RM = Math.max(melhor1RM ?? 0, estimar1RM(s.kg, s.reps));
        }
      }
      return { chave, nome: g.nome, entradas, recordeKg, recordeData, melhor1RM };
    })
    .sort((a, b) => b.entradas[b.entradas.length - 1].data.localeCompare(a.entradas[a.entradas.length - 1].data));
}

// Recorde atual de cada exercício, pra tela de treino avisar quando cair.
export function recordesPorExercicio(historico: HistoricoExercicio[]): Record<string, number> {
  return Object.fromEntries(historico.map((h) => [h.chave, h.recordeKg]));
}

export type RecenteSessao = {
  data: string;
  planoId: string;
  sessionKey: string;
  series: { kg: number; reps?: number }[];
};

// Os últimos treinos de cada exercício, enxutos, pra tela de treino calcular
// a carga sugerida sem mandar o histórico inteiro pro celular.
export function recentesPorExercicio(historico: HistoricoExercicio[], quantos = 4): Record<string, RecenteSessao[]> {
  return Object.fromEntries(
    historico.map((h) => [
      h.chave,
      h.entradas.slice(-quantos).map((e) => ({
        data: e.data,
        planoId: e.planoId,
        sessionKey: e.sessionKey,
        series: e.series.map((x) => (x.reps ? { kg: x.kg, reps: x.reps } : { kg: x.kg })),
      })),
    ]),
  );
}
