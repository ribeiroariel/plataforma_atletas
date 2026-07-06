import { createClient } from "@/lib/supabase/server";
import { parseTreino, type TreinoParseado } from "@/lib/planilha/parseTreino";
import type { RegistroExercicio, RegistroMapa } from "@/components/treino/ExercicioRegistro";

export type TreinoData = {
  plano: {
    id: string;
    athlete_id: string;
    nome_arquivo: string;
    arquivo_url: string;
    data_criacao: string;
    athleteNome: string | null;
  };
  treino: TreinoParseado | null;
  concluidas: string[];
  registros: RegistroMapa;
};

// Reúne tudo que uma tela de treino (visualização ou impressão) precisa:
// busca o plano + arquivo original, faz o parse e junta conclusões/registros.
export async function getTreinoData(id: string): Promise<TreinoData | null> {
  const supabase = await createClient();

  const { data: plano } = await supabase
    .from("training_plans")
    .select("id, athlete_id, nome_arquivo, arquivo_url, data_criacao, athletes(nome)")
    .eq("id", id)
    .single();

  if (!plano) return null;

  const { data: arquivo } = await supabase.storage
    .from("training-plans")
    .download(plano.arquivo_url);

  const { data: conclusoes } = await supabase
    .from("training_completions")
    .select("session_key")
    .eq("training_plan_id", plano.id);

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("session_key, item_index, metrica, valor, data")
    .eq("training_plan_id", plano.id);

  const registros: RegistroMapa = {};
  for (const l of logs ?? []) {
    registros[`${l.session_key}:${l.item_index}`] = {
      metrica: l.metrica as RegistroExercicio["metrica"],
      valor: Number(l.valor),
      data: l.data,
    };
  }

  const treino = arquivo ? parseTreino(Buffer.from(await arquivo.arrayBuffer())) : null;

  const athletes = plano.athletes as { nome: string } | { nome: string }[] | null;
  const athleteNome = Array.isArray(athletes) ? (athletes[0]?.nome ?? null) : (athletes?.nome ?? null);

  return {
    plano: {
      id: plano.id,
      athlete_id: plano.athlete_id,
      nome_arquivo: plano.nome_arquivo,
      arquivo_url: plano.arquivo_url,
      data_criacao: plano.data_criacao,
      athleteNome,
    },
    treino,
    concluidas: (conclusoes ?? []).map((c) => c.session_key),
    registros,
  };
}
