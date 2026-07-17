// Sugere, a partir do texto de um exercício/série (o "rótulo" já extraído
// pelo parser), quais métricas fazem sentido para o atleta preencher — e,
// quando só existe uma métrica plausível, ela vira a opção fixa (sem
// dropdown). Heurística baseada em padrões comuns de planilha de treino:
//   - distância curta em metros (ex.: "6x200m", "4x400m") -> tempo em segundos
//   - distância em km ou metros longos (ex.: "8km", "1200m") -> tempo (min) ou pace
//   - série de carga sem distância (ex.: "4x8", "3x10") -> kg
//   - qualquer outro texto -> mantém as 4 opções (ambíguo)

export type Metrica = "kg" | "distancia" | "tempo" | "pace";

export type SugestaoMetrica = {
  opcoes: Metrica[];
  unidadeTempo: "seg" | "min";
};

const TODAS_OPCOES: Metrica[] = ["kg", "tempo", "distancia", "pace"];

function extrairKm(texto: string): number | null {
  const m = texto.match(/\b(\d+(?:[.,]\d+)?)\s*km\b/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function extrairMetros(texto: string): number | null {
  const m = texto.match(/\b(\d+(?:[.,]\d+)?)\s*m(?:etros)?\b/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function ehSerieDeCarga(texto: string): boolean {
  return /\b\d+\s*[x×]\s*\d+\b/.test(texto);
}

export function sugerirMetricas(rotulo: string): SugestaoMetrica {
  const texto = String(rotulo ?? "").toLowerCase();

  const km = extrairKm(texto);
  if (km !== null) {
    return { opcoes: ["tempo", "pace"], unidadeTempo: "min" };
  }

  const metros = extrairMetros(texto);
  if (metros !== null) {
    return metros < 1000
      ? { opcoes: ["tempo"], unidadeTempo: "seg" }
      : { opcoes: ["tempo", "pace"], unidadeTempo: "min" };
  }

  if (ehSerieDeCarga(texto)) {
    return { opcoes: ["kg"], unidadeTempo: "min" };
  }

  return { opcoes: TODAS_OPCOES, unidadeTempo: "min" };
}
