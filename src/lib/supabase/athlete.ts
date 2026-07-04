import type { SupabaseClient } from "@supabase/supabase-js";

export async function getAthleteId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id ?? null;
}
