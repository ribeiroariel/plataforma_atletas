import type { SupabaseClient } from "@supabase/supabase-js";

export type Papel = "athlete" | "coach";

export async function getPapel(
  supabase: SupabaseClient,
  userId: string,
): Promise<Papel | null> {
  const { data } = await supabase
    .from("profiles")
    .select("papel")
    .eq("user_id", userId)
    .single();

  return (data?.papel as Papel | undefined) ?? null;
}

export function rotaPapel(papel: Papel | null): string {
  return papel === "coach" ? "/treinador" : "/atleta";
}
