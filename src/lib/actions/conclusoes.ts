"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";

export async function alternarConclusao(
  trainingPlanId: string,
  sessionKey: string,
  concluidoAtual: boolean,
): Promise<{ ok: true; concluido: boolean } | { erro: string }> {
  if (!sessionKey || sessionKey.length > 60) {
    return { erro: "Sessão inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { erro: "Sessão expirada. Entre novamente." };
  }

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) {
    return { erro: "Não foi possível identificar seu cadastro de atleta." };
  }

  if (concluidoAtual) {
    const { error } = await supabase
      .from("training_completions")
      .delete()
      .eq("training_plan_id", trainingPlanId)
      .eq("session_key", sessionKey);
    if (error) return { erro: "Não deu para atualizar. Tente de novo." };
    revalidatePath(`/atleta/treinos/${trainingPlanId}`);
    return { ok: true, concluido: false };
  }

  const { error } = await supabase.from("training_completions").insert({
    training_plan_id: trainingPlanId,
    athlete_id: athleteId,
    session_key: sessionKey,
  });
  if (error) return { erro: "Não deu para atualizar. Tente de novo." };
  revalidatePath(`/atleta/treinos/${trainingPlanId}`);
  return { ok: true, concluido: true };
}
