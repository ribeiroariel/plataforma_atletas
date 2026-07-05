"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TIPOS_IMG = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMG = 5 * 1024 * 1024;

export async function criarPost(_estadoAnterior: unknown, formData: FormData): Promise<{ ok: true } | { erro: string }> {
  const texto = String(formData.get("texto") ?? "").trim();
  const foto = formData.get("foto");

  const temFoto = foto instanceof File && foto.size > 0;
  if (!texto && !temFoto) {
    return { erro: "Escreva algo ou escolha uma foto." };
  }
  if (texto.length > 1000) {
    return { erro: "Texto muito longo (máximo 1000 caracteres)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  let imageUrl: string | null = null;

  if (temFoto) {
    const file = foto as File;
    if (file.size > MAX_IMG) return { erro: "Imagem muito grande (máximo 5 MB)." };
    if (!TIPOS_IMG.includes(file.type)) return { erro: "Use JPEG, PNG ou WEBP." };

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErro } = await supabase.storage
      .from("feed-images")
      .upload(caminho, file, { contentType: file.type });
    if (upErro) return { erro: "Não deu para enviar a foto." };

    imageUrl = supabase.storage.from("feed-images").getPublicUrl(caminho).data.publicUrl;
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    texto: texto || null,
    image_url: imageUrl,
  });
  if (error) return { erro: "Não deu para publicar. Tente de novo." };

  revalidatePath("/feed");
  return { ok: true };
}

export async function alternarCurtida(postId: string, curtidoAtual: boolean): Promise<{ ok: true } | { erro: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  if (curtidoAtual) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  }
  revalidatePath("/feed");
  return { ok: true };
}

export async function comentar(postId: string, texto: string): Promise<{ ok: true } | { erro: string }> {
  const limpo = texto.trim();
  if (!limpo) return { erro: "Escreva um comentário." };
  if (limpo.length > 500) return { erro: "Comentário muito longo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    user_id: user.id,
    texto: limpo,
  });
  if (error) return { erro: "Não deu para comentar." };

  revalidatePath("/feed");
  return { ok: true };
}

export async function apagarPost(postId: string): Promise<{ ok: true } | { erro: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { erro: "Não deu para apagar." };
  revalidatePath("/feed");
  return { ok: true };
}
