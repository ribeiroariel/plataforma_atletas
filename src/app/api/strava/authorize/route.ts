import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STRAVA, STRAVA_CALLBACK_PATH, stravaConfigurado } from "@/lib/strava/config";

export async function GET(request: NextRequest) {
  if (!stravaConfigurado()) {
    return NextResponse.redirect(new URL("/atleta/evolucao?strava=indisponivel", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${request.nextUrl.origin}${STRAVA_CALLBACK_PATH}`;

  const url = new URL(STRAVA.authorizeUrl);
  url.searchParams.set("client_id", STRAVA.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", STRAVA.scope);
  url.searchParams.set("state", state);

  const resp = NextResponse.redirect(url);
  resp.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return resp;
}
