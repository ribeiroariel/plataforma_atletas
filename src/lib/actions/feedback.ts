"use server";

import { createClient } from "@/lib/supabase/server";

const CATEGORIAS = ["ideia", "problema", "elogio", "outro"] as const;
const MAX_MENSAGEM = 2000;

export async function enviarFeedback(
  _estadoAnterior: unknown,
  formData: FormData,
): Promise<{ ok: true } | { erro: string }> {
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  const categoriaBruta = String(formData.get("categoria") ?? "").trim();

  if (!mensagem) {
    return { erro: "Escreva sua sugestão antes de enviar." };
  }
  if (mensagem.length > MAX_MENSAGEM) {
    return { erro: `Mensagem muito longa (máximo ${MAX_MENSAGEM} caracteres).` };
  }

  const categoria = (CATEGORIAS as readonly string[]).includes(categoriaBruta)
    ? categoriaBruta
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    mensagem,
    categoria,
  });
  if (error) {
    console.error("[feedback] falha ao inserir feedback:", error);
    return { erro: "Não deu para enviar. Tente de novo." };
  }

  return { ok: true };
}
