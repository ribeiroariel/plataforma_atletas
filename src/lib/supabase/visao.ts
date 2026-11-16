import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPapel, type Papel } from "./profile";

export const COOKIE_VISAO = "visao";

export type Visao = {
  papel: Papel | null;
  // Qual "lado" do site a pessoa está olhando agora.
  visao: Papel;
  // Treinador que também tem cadastro de atleta: pode alternar entre os dois.
  duplo: boolean;
};

// Quem é treinador e também treina tem as duas visões. A escolhida fica num
// cookie (gravado pelo proxy ao entrar em /atleta ou /treinador) pra que
// páginas comuns, como o feed, mostrem o menu do lado em que a pessoa estava.
export async function resolverVisao(supabase: SupabaseClient, userId: string | undefined): Promise<Visao> {
  if (!userId) return { papel: null, visao: "athlete", duplo: false };

  const papel = await getPapel(supabase, userId);
  if (papel !== "coach") return { papel, visao: "athlete", duplo: false };

  const { data: atleta } = await supabase.from("athletes").select("id").eq("user_id", userId).maybeSingle();
  const duplo = !!atleta;
  const escolhida = (await cookies()).get(COOKIE_VISAO)?.value;

  return { papel, visao: duplo && escolhida === "athlete" ? "athlete" : "coach", duplo };
}
