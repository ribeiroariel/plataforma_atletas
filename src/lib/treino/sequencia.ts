import type { SupabaseClient } from "@supabase/supabase-js";
import { segundaDaSemana, somarDias } from "@/lib/datas";

// Quantas semanas seguidas o atleta treinou (pelo menos um registro ou treino
// concluído em cada uma). A semana atual só entra na conta se já tiver
// treino; se ainda não tiver, a sequência não quebra — conta-se a partir da
// semana passada.
export async function semanasSeguidas(supabase: SupabaseClient, athleteId: string, hoje: string): Promise<number> {
  const desde = somarDias(hoje, -370);
  const [{ data: logs }, { data: conclusoes }, { data: dados }] = await Promise.all([
    supabase.from("exercise_logs").select("data").eq("athlete_id", athleteId).gte("data", desde),
    supabase.from("training_completions").select("completed_at").eq("athlete_id", athleteId).gte("completed_at", desde),
    supabase.from("training_data").select("data").eq("athlete_id", athleteId).gte("data", desde),
  ]);

  const semanas = new Set<string>();
  for (const l of logs ?? []) semanas.add(segundaDaSemana(l.data));
  for (const d of dados ?? []) semanas.add(segundaDaSemana(d.data));
  for (const c of conclusoes ?? []) semanas.add(segundaDaSemana(String(c.completed_at).slice(0, 10)));

  let semana = segundaDaSemana(hoje);
  if (!semanas.has(semana)) semana = somarDias(semana, -7);

  let total = 0;
  while (semanas.has(semana)) {
    total += 1;
    semana = somarDias(semana, -7);
  }
  return total;
}
