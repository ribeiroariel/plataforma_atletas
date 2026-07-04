// Config do Strava. O CLIENT_ID é público (aparece na URL de autorização);
// o CLIENT_SECRET é usado só no servidor (route handlers / server actions) e
// NUNCA deve ter o prefixo NEXT_PUBLIC_.
export const STRAVA = {
  clientId: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? "",
  clientSecret: process.env.STRAVA_CLIENT_SECRET ?? "",
  authorizeUrl: "https://www.strava.com/oauth/authorize",
  tokenUrl: "https://www.strava.com/oauth/token",
  // leitura de atividades; nada de escrita na conta Strava do atleta
  scope: "activity:read",
};

export function stravaConfigurado() {
  return Boolean(STRAVA.clientId && STRAVA.clientSecret);
}

// caminho fixo do callback (o Strava valida só o domínio, não o path)
export const STRAVA_CALLBACK_PATH = "/api/strava/callback";
