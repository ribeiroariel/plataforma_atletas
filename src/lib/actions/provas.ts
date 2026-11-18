"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";
import { numero } from "./valores";

type Resultado = { ok: true } | { erro: string };

type Acesso = { supabase: SupabaseClient; athleteId: string; erro?: undefined } | { erro: string };

async function atletaLogado(): Promise<Acesso> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };
  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };
  return { supabase, athleteId };
}

function atualizarTelas() {
  revalidatePath("/atleta/provas");
  revalidatePath("/atleta");
}

export async function criarProva(_anterior: unknown, formData: FormData): Promise<Resultado> {
  const nome = String(formData.get("nome") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const local = String(formData.get("local") ?? "").trim();

  if (!nome) return { erro: "Dê um nome para a prova." };
  if (nome.length > 120 || local.length > 120) return { erro: "Texto muito longo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe a data da prova." };

  const s = await atletaLogado();
  if (s.erro !== undefined) return { erro: s.erro };

  const { error } = await s.supabase
    .from("competitions")
    .insert({ athlete_id: s.athleteId, nome, data, local: local || null });
  if (error) {
    console.error("[provas] criarProva", error);
    return { erro: "Não deu para salvar a prova. Tente de novo." };
  }
  atualizarTelas();
  return { ok: true };
}

export async function removerProva(id: string): Promise<Resultado> {
  const s = await atletaLogado();
  if (s.erro !== undefined) return { erro: s.erro };
  const { error } = await s.supabase.from("competitions").delete().eq("id", id).eq("athlete_id", s.athleteId);
  if (error) return { erro: "Não deu para remover. Tente de novo." };
  atualizarTelas();
  return { ok: true };
}

// Converte "10,85", "10.85" ou "1:58,30" (min:seg) em número. Para tempos o
// resultado é sempre em segundos.
function valorDaMarca(texto: string, unidade: string): number | null {
  const limpo = texto.trim();
  if (unidade === "s") {
    const minSeg = limpo.match(/^(\d+):(\d{1,2}(?:[.,]\d+)?)$/);
    if (minSeg) return Number(minSeg[1]) * 60 + Number(minSeg[2].replace(",", "."));
  }
  return numero(limpo);
}

export async function criarMarca(_anterior: unknown, formData: FormData): Promise<Resultado> {
  const prova = String(formData.get("prova") ?? "").trim();
  const unidade = String(formData.get("unidade") ?? "");
  const data = String(formData.get("data") ?? "");
  const competicao = String(formData.get("competicao") ?? "").trim();
  const valor = valorDaMarca(String(formData.get("valor") ?? ""), unidade);

  if (!prova) return { erro: "Diga qual é a prova (ex.: 100 m, salto em distância)." };
  if (prova.length > 60 || competicao.length > 120) return { erro: "Texto muito longo." };
  if (!["s", "m", "pts"].includes(unidade)) return { erro: "Escolha o tipo de marca." };
  if (valor === null || valor <= 0) return { erro: "Informe a marca (ex.: 10,85 ou 1:58,30)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe a data." };
  if (data > new Date().toISOString().slice(0, 10)) return { erro: "A data não pode ser no futuro." };

  const s = await atletaLogado();
  if (s.erro !== undefined) return { erro: s.erro };

  const { error } = await s.supabase
    .from("marks")
    .insert({ athlete_id: s.athleteId, prova, valor, unidade, data, competicao: competicao || null });
  if (error) {
    console.error("[provas] criarMarca", error);
    return { erro: "Não deu para salvar a marca. Tente de novo." };
  }
  atualizarTelas();
  return { ok: true };
}

export async function removerMarca(id: string): Promise<Resultado> {
  const s = await atletaLogado();
  if (s.erro !== undefined) return { erro: s.erro };
  const { error } = await s.supabase.from("marks").delete().eq("id", id).eq("athlete_id", s.athleteId);
  if (error) return { erro: "Não deu para remover. Tente de novo." };
  atualizarTelas();
  return { ok: true };
}
