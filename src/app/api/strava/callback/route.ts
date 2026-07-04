import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";
import { stravaConfigurado } from "@/lib/strava/config";
import { trocarCodePorToken } from "@/lib/strava/api";
import { sincronizarStrava } from "@/lib/strava/sync";

function voltar(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/atleta/evolucao?strava=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  if (!stravaConfigurado()) return voltar(request, "indisponivel");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const erro = params.get("error");

  if (erro) return voltar(request, "negado");

  const stateCookie = request.cookies.get("strava_oauth_state")?.value;
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return voltar(request, "erro");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return voltar(request, "erro");

  let token;
  try {
    token = await trocarCodePorToken(code);
  } catch {
    return voltar(request, "erro");
  }

  const { error } = await supabase.from("strava_connections").upsert({
    athlete_id: athleteId,
    strava_athlete_id: token.athlete?.id ?? 0,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(token.expires_at * 1000).toISOString(),
    scope: token.scope ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return voltar(request, "erro");

  // sincronização inicial (não bloqueia o redirect se falhar)
  await sincronizarStrava(supabase, athleteId).catch(() => {});

  const resp = voltar(request, "conectado");
  resp.cookies.delete("strava_oauth_state");
  return resp;
}
