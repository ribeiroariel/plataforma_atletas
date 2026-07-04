import { STRAVA } from "./config";

export type TokenStrava = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch em segundos
  scope?: string;
  athlete?: { id: number };
};

export type AtividadeStrava = {
  id: number;
  type: string;
  sport_type?: string;
  distance: number; // metros
  moving_time: number; // segundos
  start_date_local: string; // ISO
};

// Troca o "code" do OAuth por tokens (usado no callback).
export async function trocarCodePorToken(code: string): Promise<TokenStrava> {
  const resp = await fetch(STRAVA.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA.clientId,
      client_secret: STRAVA.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!resp.ok) throw new Error(`Strava token exchange falhou: ${resp.status}`);
  return resp.json();
}

// Renova o access_token quando expira.
export async function renovarToken(refreshToken: string): Promise<TokenStrava> {
  const resp = await fetch(STRAVA.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA.clientId,
      client_secret: STRAVA.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!resp.ok) throw new Error(`Strava refresh falhou: ${resp.status}`);
  return resp.json();
}

// Busca atividades depois de uma data (epoch em segundos).
export async function buscarAtividades(
  accessToken: string,
  aposEpoch: number,
): Promise<AtividadeStrava[]> {
  const todas: AtividadeStrava[] = [];
  for (let pagina = 1; pagina <= 5; pagina++) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(aposEpoch));
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(pagina));

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) throw new Error(`Strava activities falhou: ${resp.status}`);
    const lote: AtividadeStrava[] = await resp.json();
    todas.push(...lote);
    if (lote.length < 100) break;
  }
  return todas;
}

export type LinhaTreino = {
  data: string; // yyyy-mm-dd
  tipo: "corrida" | "bicicleta" | "cardio";
  variavel: "distancia" | "tempo";
  valor: number;
  unidade: "km" | "min";
};

// Classifica o tipo de atividade do Strava no nosso modelo.
function classificar(atividade: AtividadeStrava): LinhaTreino["tipo"] | null {
  const t = (atividade.sport_type ?? atividade.type ?? "").toLowerCase();
  if (t.includes("run")) return "corrida";
  if (t.includes("ride") || t.includes("cycl") || t.includes("bike")) return "bicicleta";
  // natação, elíptico, remo, workout genérico, etc. entram como cardio (tempo)
  return "cardio";
}

// Agrega atividades por (dia, tipo), somando distância (corrida/bike) ou
// tempo (cardio). Devolve linhas prontas para upsert em training_data.
export function agregarAtividades(atividades: AtividadeStrava[]): LinhaTreino[] {
  const mapa = new Map<string, LinhaTreino>();

  for (const a of atividades) {
    const tipo = classificar(a);
    if (!tipo) continue;
    const data = a.start_date_local.slice(0, 10);

    if (tipo === "corrida" || tipo === "bicicleta") {
      const km = a.distance / 1000;
      if (km <= 0) continue;
      const chave = `${data}|${tipo}`;
      const existente = mapa.get(chave);
      if (existente) existente.valor = Math.round((existente.valor + km) * 100) / 100;
      else mapa.set(chave, { data, tipo, variavel: "distancia", valor: Math.round(km * 100) / 100, unidade: "km" });
    } else {
      const min = a.moving_time / 60;
      if (min <= 0) continue;
      const chave = `${data}|cardio`;
      const existente = mapa.get(chave);
      if (existente) existente.valor = Math.round(existente.valor + min);
      else mapa.set(chave, { data, tipo: "cardio", variavel: "tempo", valor: Math.round(min), unidade: "min" });
    }
  }

  return [...mapa.values()];
}
