"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";

export async function criarObservacao(_estadoAnterior: unknown, formData: FormData) {
  const trainingPlanId = String(formData.get("training_plan_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();

  if (!texto) {
    return { erro: "Escreva algo antes de salvar." };
  }
  if (texto.length > 2000) {
    return { erro: "Observação muito longa (máximo 2000 caracteres)." };
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

  const { error } = await supabase.from("observations").insert({
    training_plan_id: trainingPlanId,
    athlete_id: athleteId,
    texto,
  });

  if (error) {
    return { erro: "Não deu para salvar a observação. Tente de novo." };
  }

  revalidatePath(`/atleta/treinos/${trainingPlanId}`);
  return { ok: true };
}
