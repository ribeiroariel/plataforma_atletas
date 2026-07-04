"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 2 * 1024 * 1024;

export async function atualizarFotoPerfil(_estadoAnterior: unknown, formData: FormData) {
  const arquivo = formData.get("foto");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione uma imagem." };
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return { erro: "Imagem muito grande (máximo 2 MB)." };
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return { erro: "Use uma imagem JPEG, PNG ou WEBP." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { erro: "Sessão expirada. Entre novamente." };
  }

  const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const caminho = `${user.id}/foto.${extensao}`;

  const { error: uploadErro } = await supabase.storage
    .from("avatars")
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  if (uploadErro) {
    return { erro: "Não deu para enviar a foto. Tente de novo." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(caminho);
  const url = `${publicUrl}?v=${Date.now()}`;

  await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (athlete) {
    await supabase.from("athletes").update({ avatar_url: url }).eq("id", athlete.id);
  }

  revalidatePath("/atleta");
  revalidatePath("/treinador");

  return { ok: true, url };
}
