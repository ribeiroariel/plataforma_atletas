"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";

type Resultado = { ok: true } | { erro: string };

function inteiroEntre(v: number | null, min: number, max: number): boolean {
  return v === null || (Number.isInteger(v) && v >= min && v <= max);
}

// Como o atleta saiu do treino: esforço percebido (1–10) e, se quiser, sono
// da noite anterior (1–5) e dor (0–10). Um registro por sessão do plano.
export async function salvarFeedbackSessao(
  trainingPlanId: string,
  sessionKey: string,
  esforco: number,
  sono: number | null,
  dor: number | null,
  data: string,
): Promise<Resultado> {
  if (!trainingPlanId) return { erro: "Treino inválido." };
  if (!sessionKey || sessionKey.length > 60) return { erro: "Sessão inválida." };
  if (!Number.isInteger(esforco) || esforco < 1 || esforco > 10) return { erro: "Escolha o esforço de 1 a 10." };
  if (!inteiroEntre(sono, 1, 5) || !inteiroEntre(dor, 0, 10)) return { erro: "Valor inválido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe uma data válida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  const { error } = await supabase.from("session_feedback").upsert(
    {
      athlete_id: athleteId,
      training_plan_id: trainingPlanId,
      session_key: sessionKey,
      esforco,
      sono,
      dor,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "training_plan_id,session_key" },
  );

  if (error) {
    console.error("[sessao] salvarFeedbackSessao", error);
    return { erro: "Não deu para salvar como foi o treino. Tente de novo." };
  }

  revalidatePath(`/atleta/treinos/${trainingPlanId}`);
  return { ok: true };
}

// Resposta dentro de um recado — vale pro atleta dono e pro treinador
// vinculado (quem decide é a regra de acesso do banco).
export async function responderRecado(_anterior: unknown, formData: FormData): Promise<Resultado> {
  const observationId = String(formData.get("observation_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const caminho = String(formData.get("caminho") ?? "");

  if (!observationId) return { erro: "Recado inválido." };
  if (!texto) return { erro: "Escreva algo antes de enviar." };
  if (texto.length > 2000) return { erro: "Resposta muito longa (máximo 2000 caracteres)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("observation_replies")
    .insert({ observation_id: observationId, author_id: user.id, texto });

  if (error) {
    console.error("[sessao] responderRecado", error);
    return { erro: "Não deu para enviar a resposta. Tente de novo." };
  }

  if (caminho.startsWith("/atleta/") || caminho.startsWith("/treinador/")) revalidatePath(caminho);
  return { ok: true };
}
