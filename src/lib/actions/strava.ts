"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";
import { sincronizarStrava } from "@/lib/strava/sync";

export async function sincronizar(): Promise<
  { ok: true; inseridas: number } | { erro: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  const r = await sincronizarStrava(supabase, athleteId);
  if ("erro" in r) return r;

  revalidatePath("/atleta/evolucao");
  return { ok: true, inseridas: r.inseridas };
}

export async function desconectar(): Promise<{ ok: true } | { erro: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  const { error } = await supabase
    .from("strava_connections")
    .delete()
    .eq("athlete_id", athleteId);
  if (error) return { erro: "Não deu para desconectar agora." };

  revalidatePath("/atleta/evolucao");
  return { ok: true };
}
