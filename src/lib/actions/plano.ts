"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true } | { erro: string };

// Só o treinador vinculado ao atleta dono do plano pode chamar isso — a RLS
// (training_plans_update_coach_linked) garante isso; se o update não afetar
// nenhuma linha (usuário não é o treinador certo, ou o plano não existe),
// tratamos como erro em vez de sucesso silencioso.
export async function atualizarDataInicioPlano(
  trainingPlanId: string,
  athleteId: string,
  dataInicio: string,
): Promise<Resultado> {
  if (!trainingPlanId) return { erro: "Plano inválido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) return { erro: "Informe uma data válida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("training_plans")
    .update({ data_inicio: dataInicio })
    .eq("id", trainingPlanId)
    .select("id");

  if (error) return { erro: "Não deu para salvar. Tente de novo." };
  if (!data || data.length === 0) return { erro: "Não foi possível editar esse plano." };

  revalidatePath(`/treinador/atletas/${athleteId}`);
  revalidatePath(`/treinador/atletas/${athleteId}/calendario`);
  return { ok: true };
}
