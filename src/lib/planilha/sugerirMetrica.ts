// Sugere, a partir do texto de um exercício/série (rótulo + a linha de
// detalhe de séries/reps que ficou junto dele na planilha), quais métricas
// fazem sentido para o atleta preencher — e, quando só existe uma métrica
// plausível, ela vira a opção fixa (sem dropdown). Heurística baseada em
// padrões comuns de planilha de treino:
//   - distância curta em metros (ex.: "7x200m", "6x400m") -> tempo em segundos
//   - distância em km ou metros longos (ex.: "8km", "1200m") -> tempo (min) ou pace
//   - série de carga (ex.: "4x8-10", "3-4x8-10") -> kg
//   - qualquer outro texto -> mantém as 5 opções (ambíguo)
//
// "tempo_min" e "tempo_seg" são duas opções distintas (não uma métrica só
// com unidade variável) porque o pedido era poder ESCOLHER segundos
// explicitamente quando a sugestão automática não tem certeza — nos dois
// casos o valor enviado ao servidor é a mesma métrica "tempo" (sempre em
// minutos), só a conversão de exibição/entrada muda.

export type Metrica = "kg" | "distancia" | "tempo" | "pace" | "corporal";
export type OpcaoMetrica = "kg" | "corporal" | "distancia" | "pace" | "tempo_min" | "tempo_seg";

export type SugestaoMetrica = { opcoes: OpcaoMetrica[] };

const TODAS_OPCOES: OpcaoMetrica[] = ["kg", "corporal", "tempo_min", "tempo_seg", "distancia", "pace"];

// Exercícios que normalmente se fazem só com o peso do corpo. Pra esses, a
// opção "Peso corporal" vem primeiro (mas "Carga" continua disponível, pra
// quem usa colete ou anilha). "Flexão plantar" e "mesa/cadeira flexora" ficam
// de fora: costumam ser com carga.
const RE_CORPORAL =
  /\b(flex[aã]o(?! plantar)|barra fixa|pull[- ]?ups?|chin[- ]?ups?|n[oó]rdica|mergulho|paralelas|dips?|burpees?|polichinelos?|abdominal|abdominais|canivete|sit[- ]?ups?|crunch|pistol|superman|hiperextens[aã]o|lombar no|elevação de pernas|prancha|saltos?|pliometri)/i;

// Sem \b antes do dígito de propósito: "7x200m"/"6x400m" (tiros de pista
// coladas ao multiplicador, sem espaço) têm "x" e o dígito como dois
// caracteres de palavra adjacentes — não há fronteira aí, então exigir \b
// no início faria o regex nunca casar exatamente o padrão mais comum de
// planilha de pista. O \b no final (antes de "m"/"km") já evita falsos
// positivos como "min" ou "kg".
function extrairKm(texto: string): number | null {
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*km\b/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function extrairMetros(texto: string): number | null {
  const m = texto.match(/(\d+(?:[.,]\d+)?)\s*m(?:etros)?\b/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function ehSerieDeCarga(texto: string): boolean {
  return /\b\d+\s*[x×]\s*\d+\b/.test(texto);
}

export function sugerirMetricas(rotulo: string, detalhe?: string): SugestaoMetrica {
  const texto = `${rotulo ?? ""} ${detalhe ?? ""}`.toLowerCase();

  const km = extrairKm(texto);
  if (km !== null) {
    return { opcoes: ["tempo_min", "pace"] };
  }

  const metros = extrairMetros(texto);
  if (metros !== null) {
    return metros < 1000 ? { opcoes: ["tempo_seg"] } : { opcoes: ["tempo_min", "pace"] };
  }

  if (RE_CORPORAL.test(rotulo ?? "")) {
    return { opcoes: ["corporal", "kg"] };
  }

  if (ehSerieDeCarga(texto)) {
    return { opcoes: ["kg", "corporal"] };
  }

  return { opcoes: TODAS_OPCOES };
}

// Converte a métrica salva no servidor (sempre "tempo" em minutos) para a
// opção de UI equivalente, escolhendo segundos só quando a sugestão atual
// não considerar minutos plausível.
export function metricaServidorParaOpcao(metrica: Metrica, sugestao: SugestaoMetrica): OpcaoMetrica {
  if (metrica !== "tempo") return metrica;
  const somenteSegundos = sugestao.opcoes.includes("tempo_seg") && !sugestao.opcoes.includes("tempo_min");
  return somenteSegundos ? "tempo_seg" : "tempo_min";
}

export function opcaoParaMetricaServidor(opcao: OpcaoMetrica): Metrica {
  return opcao === "tempo_min" || opcao === "tempo_seg" ? "tempo" : opcao;
}
