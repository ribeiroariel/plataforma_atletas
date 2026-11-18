import { estimar1RM } from "./rm";

// Carga sugerida para o próximo treino de um exercício.
//
// A conta, em ordem:
// 1. 1RM estimado: a melhor série (carga × repetições, fórmula de Epley) dos
//    dois treinos mais recentes desse exercício, somando às repetições a
//    reserva (RIR) prescrita. Recente, e não o recorde de sempre: o recorde
//    pode ser de meses atrás.
// 2. % do 1RM para hoje: se a planilha diz o percentual ("85% da carga
//    máxima"), usa ele. Senão, sai das repetições prescritas somadas às
//    repetições "de reserva" (RIR, ou 10 − RPE): 8 reps com RIR 2 = a carga
//    que daria 10 repetições até a falha.
// 3. Ajuste: +2,5% de progressão numa semana normal; −10% numa semana leve.
// 4. Sem repetições registradas não dá pra estimar o 1RM: aí parte da maior
//    carga do último treino e aplica o mesmo ajuste.
//
// A sugestão nunca passa de 10% acima da última carga (nem fica acima dela
// numa semana leve), e é arredondada pro que dá pra montar: 2 kg em halter,
// 2,5 kg no resto.

export type SerieRecente = { kg: number; reps?: number };
export type EntradaRecente = { data: string; series: SerieRecente[] };

export type SugestaoCarga = {
  // Carga sugerida para cada série, seguindo o desenho do último treino
  // (pirâmide continua pirâmide).
  porSerie: number[];
  topo: number;
  base: "rm" | "ultima";
  rm: number | null;
  percentual: number | null; // fração do 1RM usada (0–1)
  ajuste: number; // +0.025, -0.1 ou 0
  leve: boolean;
  ultimaTopo: number;
};

const PROGRESSAO = 0.025;
const SEMANA_LEVE = -0.1;

function media(a: number, b?: number): number {
  return b === undefined ? a : (a + b) / 2;
}

// "8-10" -> 9; "12" -> 12; "4,3" (pirâmide) -> 4.
// Números seguidos de unidade de tempo ou distância ("3x40s", "6x200m") não
// são repetições.
export function repsAlvo(detalhe?: string): number | null {
  if (!detalhe) return null;
  const nxm = detalhe.match(/\d+(?:-\d+)?\s*[x×]\s*(\d+)(?:\s*-\s*(\d+))?(?![\d.,]*\s*(?:s\b|seg|min|''|"|m\b|km))/i);
  let alvo: number | null = null;
  if (nxm) alvo = Math.floor(media(Number(nxm[1]), nxm[2] ? Number(nxm[2]) : undefined));
  else {
    const soltas = detalhe.match(/(\d+)(?:\s*-\s*(\d+))?\s*repeti/i);
    if (soltas) alvo = Math.floor(media(Number(soltas[1]), soltas[2] ? Number(soltas[2]) : undefined));
  }
  // Acima de ~20 repetições a conta do 1RM não vale mais.
  return alvo !== null && alvo >= 1 && alvo <= 20 ? alvo : null;
}

// Repetições de reserva: "RIR 1-2" -> 1,5; "RPE 8" -> 2. Sem nada -> 0.
export function reservaPrescrita(detalhe?: string): number {
  if (!detalhe) return 0;
  const rir = detalhe.match(/RIR\s*(\d+)(?:\s*-\s*(\d+))?/i);
  if (rir) return media(Number(rir[1]), rir[2] ? Number(rir[2]) : undefined);
  const rpe = detalhe.match(/RPE\s*(\d+(?:[.,]\d)?)/i);
  if (rpe) return Math.max(0, 10 - Number(rpe[1].replace(",", ".")));
  return 0;
}

// "85% da carga máxima" -> 0,85. Ignora números fora de 40–105%.
export function percentualPrescrito(detalhe?: string): number | null {
  if (!detalhe) return null;
  const m = detalhe.match(/(\d{2,3}(?:[.,]\d)?)\s*%/);
  if (!m) return null;
  const p = Number(m[1].replace(",", ".")) / 100;
  return p >= 0.4 && p <= 1.05 ? p : null;
}

function passoDoExercicio(rotulo: string): number {
  return /halter|dumbbell/i.test(rotulo) ? 2 : 2.5;
}

function arredondar(kg: number, passo: number): number {
  return Math.max(passo, Math.round(kg / passo) * passo);
}

export function sugerirCarga({
  recentes,
  rotulo,
  detalhe,
  leve,
}: {
  // Treinos anteriores desse exercício, do mais antigo pro mais recente.
  recentes: EntradaRecente[];
  rotulo: string;
  detalhe?: string;
  leve: boolean;
}): SugestaoCarga | null {
  const comCarga = recentes.filter((e) => e.series.some((s) => s.kg > 0));
  const ultima = comCarga[comCarga.length - 1];
  if (!ultima) return null;

  const ultimaTopo = Math.max(...ultima.series.map((s) => s.kg));
  const passo = passoDoExercicio(rotulo);

  // Supõe que o atleta seguiu a mesma reserva (RIR) da planilha também no
  // treino anterior: 10 reps com RIR 2 contam como 12 até a falha. Sem isso,
  // toda prescrição com RIR puxaria a sugestão pra baixo da última carga.
  const reserva = reservaPrescrita(detalhe);
  const rms = comCarga
    .slice(-2)
    .flatMap((e) => e.series)
    .filter((s) => s.reps && s.reps <= 15)
    .map((s) => estimar1RM(s.kg, (s.reps ?? 0) + reserva));
  const rm = rms.length ? Math.max(...rms) : null;

  const pctPlanilha = percentualPrescrito(detalhe);
  const reps = repsAlvo(detalhe);

  let topo: number;
  let base: SugestaoCarga["base"];
  let percentual: number | null = null;
  let ajuste: number;

  if (rm && (pctPlanilha || reps)) {
    base = "rm";
    // Percentual da planilha já é a intenção do treinador pra semana: não
    // leva progressão nem desconto por cima.
    percentual = pctPlanilha ?? 1 / (1 + (reps! + reserva) / 30);
    ajuste = pctPlanilha ? 0 : leve ? SEMANA_LEVE : PROGRESSAO;
    topo = rm * percentual * (1 + ajuste);
  } else {
    base = "ultima";
    ajuste = leve ? SEMANA_LEVE : PROGRESSAO;
    topo = ultimaTopo * (1 + ajuste);
  }

  // Trava de segurança: no máximo +10% sobre a última carga; numa semana
  // leve, nunca acima dela.
  topo = Math.min(topo, ultimaTopo * (leve ? 1 : 1.1));
  topo = arredondar(topo, passo);

  // Mantém o desenho das séries do último treino (ex.: pirâmide 80/85/90).
  const fator = topo / ultimaTopo;
  const porSerie = ultima.series.map((s) => arredondar(s.kg * fator, passo));

  return { porSerie, topo, base, rm, percentual, ajuste, leve, ultimaTopo };
}

// Semana leve: pelo nome da semana/sessão na planilha ("deload", "semana
// leve", "redução", "regenerativa"...).
const RE_LEVE = /deload|descarga|semana leve|\bleve\b|regenera|recupera[cç][aã]o|redu[cç][aã]o|polimento|taper/i;

export function ehSemanaLeve(...textos: (string | undefined)[]): boolean {
  return RE_LEVE.test(textos.filter(Boolean).join(" "));
}
