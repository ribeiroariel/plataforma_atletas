import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegistroExercicio, RegistroMapa } from "./registros";

type LinhaLog = {
  session_key: string;
  item_index: number;
  serie: number;
  metrica: string;
  valor: number | string;
  data: string;
  reps?: number | null;
};

// Lê os registros de um plano já no formato de mapa usado pelas telas.
// A coluna "reps" só existe depois da migração de 16/11/2026: se ainda não
// rodou, a consulta com ela falha — então tenta de novo sem, pra tela nunca
// ficar sem os registros por causa disso.
export async function buscarRegistrosDoPlano(supabase: SupabaseClient, planoId: string): Promise<RegistroMapa> {
  const base = "session_key, item_index, serie, metrica, valor, data";
  let linhas: LinhaLog[] | null = null;

  const comReps = await supabase.from("exercise_logs").select(`${base}, reps`).eq("training_plan_id", planoId);
  if (comReps.error) {
    const semReps = await supabase.from("exercise_logs").select(base).eq("training_plan_id", planoId);
    linhas = semReps.data as LinhaLog[] | null;
  } else {
    linhas = comReps.data as LinhaLog[] | null;
  }

  const registros: RegistroMapa = {};
  for (const l of linhas ?? []) {
    registros[`${l.session_key}:${l.item_index}:${l.serie}`] = {
      metrica: l.metrica as RegistroExercicio["metrica"],
      valor: Number(l.valor),
      data: l.data,
      ...(l.reps ? { reps: l.reps } : {}),
    };
  }
  return registros;
}

export type FeedbackSessao = { esforco: number; sono: number | null; dor: number | null; data: string };

// Esforço/bem-estar por sessão de um plano. Tabela nova: se ainda não existe,
// devolve vazio.
export async function buscarFeedbackDoPlano(
  supabase: SupabaseClient,
  planoId: string,
): Promise<Record<string, FeedbackSessao>> {
  const { data } = await supabase
    .from("session_feedback")
    .select("session_key, esforco, sono, dor, data")
    .eq("training_plan_id", planoId);
  const mapa: Record<string, FeedbackSessao> = {};
  for (const f of data ?? []) {
    mapa[f.session_key] = { esforco: f.esforco, sono: f.sono, dor: f.dor, data: f.data };
  }
  return mapa;
}

export type Resposta = { id: string; texto: string; autor: string; meu: boolean; quando: string };

// Respostas da conversa, agrupadas pelo recado a que pertencem.
export async function buscarRespostas(
  supabase: SupabaseClient,
  idsRecados: string[],
  meuUserId: string | undefined,
): Promise<Record<string, Resposta[]>> {
  if (idsRecados.length === 0) return {};
  const { data } = await supabase
    .from("observation_replies")
    .select("id, observation_id, author_id, texto, created_at")
    .in("observation_id", idsRecados)
    .order("created_at", { ascending: true });
  if (!data || data.length === 0) return {};

  const autores = [...new Set(data.map((r) => r.author_id))];
  const { data: perfis } = await supabase.from("profiles").select("user_id, nome").in("user_id", autores);
  const nomeDe = new Map((perfis ?? []).map((p) => [p.user_id, p.nome as string]));

  const mapa: Record<string, Resposta[]> = {};
  for (const r of data) {
    (mapa[r.observation_id] ??= []).push({
      id: r.id,
      texto: r.texto,
      autor: (nomeDe.get(r.author_id) ?? "Alguém").split(" ")[0],
      meu: r.author_id === meuUserId,
      quando: String(r.created_at).slice(0, 10),
    });
  }
  return mapa;
}
