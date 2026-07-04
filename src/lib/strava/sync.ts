import type { SupabaseClient } from "@supabase/supabase-js";
import { agregarAtividades, buscarAtividades, renovarToken } from "./api";

// Janela de sincronização: últimos 120 dias.
const DIAS_JANELA = 120;

// Garante um access_token válido, renovando (e persistindo) se expirou.
async function tokenValido(
  supabase: SupabaseClient,
  conexao: {
    athlete_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
  },
): Promise<string> {
  const expiraEm = new Date(conexao.expires_at).getTime();
  const margem = 60_000; // renova 1 min antes de expirar
  if (expiraEm - margem > Date.now()) {
    return conexao.access_token;
  }

  const novo = await renovarToken(conexao.refresh_token);
  await supabase
    .from("strava_connections")
    .update({
      access_token: novo.access_token,
      refresh_token: novo.refresh_token,
      expires_at: new Date(novo.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("athlete_id", conexao.athlete_id);

  return novo.access_token;
}

export async function sincronizarStrava(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<{ inseridas: number } | { erro: string }> {
  const { data: conexao } = await supabase
    .from("strava_connections")
    .select("athlete_id, access_token, refresh_token, expires_at")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (!conexao) return { erro: "Nenhuma conta do Strava conectada." };

  let accessToken: string;
  try {
    accessToken = await tokenValido(supabase, conexao);
  } catch {
    return { erro: "Não deu para renovar o acesso ao Strava. Reconecte a conta." };
  }

  const aposEpoch = Math.floor((Date.now() - DIAS_JANELA * 24 * 60 * 60 * 1000) / 1000);

  let linhas;
  try {
    const atividades = await buscarAtividades(accessToken, aposEpoch);
    linhas = agregarAtividades(atividades);
  } catch {
    return { erro: "Não deu para buscar as atividades do Strava agora." };
  }

  if (linhas.length === 0) return { inseridas: 0 };

  const registros = linhas.map((l) => ({ athlete_id: athleteId, ...l }));
  const { error } = await supabase
    .from("training_data")
    .upsert(registros, { onConflict: "athlete_id,data,tipo,variavel" });

  if (error) return { erro: "Não deu para gravar os dados sincronizados." };
  return { inseridas: linhas.length };
}
