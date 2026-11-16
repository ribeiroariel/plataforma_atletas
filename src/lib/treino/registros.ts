import type { Metrica, OpcaoMetrica } from "@/lib/planilha/sugerirMetrica";
import { numero } from "@/lib/actions/valores";

export type { Metrica };
export type RegistroExercicio = { metrica: Metrica; valor: number; data: string };
// Mapa de registros já salvos: chave = `${sessionKey}:${itemIndex}:${serie}`.
export type RegistroMapa = Record<string, RegistroExercicio>;

export function chaveRegistro(sessionKey: string, itemIndex: number, serie: number): string {
  return `${sessionKey}:${itemIndex}:${serie}`;
}

// Extrai, do mapa completo de registros, só os de um exercício específico —
// indexados por número de série.
export function registrosDoExercicio(
  mapa: RegistroMapa,
  sessionKey: string,
  itemIndex: number,
): Record<number, RegistroExercicio> {
  const prefixo = `${sessionKey}:${itemIndex}:`;
  const resultado: Record<number, RegistroExercicio> = {};
  for (const [chave, valor] of Object.entries(mapa)) {
    if (chave.startsWith(prefixo)) {
      const serie = Number(chave.slice(prefixo.length));
      if (Number.isFinite(serie)) resultado[serie] = valor;
    }
  }
  return resultado;
}

export function registrosDaSessao(mapa: RegistroMapa, sessionKey: string): RegistroExercicio[] {
  const prefixo = `${sessionKey}:`;
  return Object.entries(mapa)
    .filter(([chave]) => chave.startsWith(prefixo))
    .map(([, valor]) => valor);
}

// Soma das cargas (kg) lançadas numa sessão — a mesma conta que alimenta o
// "volume de academia" da Evolução.
export function volumeDaSessao(mapa: RegistroMapa, sessionKey: string): number {
  return registrosDaSessao(mapa, sessionKey)
    .filter((r) => r.metrica === "kg")
    .reduce((soma, r) => soma + r.valor, 0);
}

export function rotuloOpcao(opcao: OpcaoMetrica): string {
  switch (opcao) {
    case "kg":
      return "Carga";
    case "tempo_min":
      return "Minutos";
    case "tempo_seg":
      return "Segundos";
    case "distancia":
      return "Km";
    case "pace":
      return "Pace";
  }
}

export function unidadeOpcao(opcao: OpcaoMetrica): string {
  switch (opcao) {
    case "kg":
      return "kg";
    case "tempo_min":
      return "min";
    case "tempo_seg":
      return "s";
    case "distancia":
      return "km";
    case "pace":
      return "/km";
  }
}

// Converte minutos decimais de volta para "m:ss" (exibição de pace salvo).
export function minutosParaPace(min: number): string {
  const totalSeg = Math.round(min * 60);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatarNumero(valor: number, casas = 1): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor);
}

// Texto que vai dentro do campo para um registro já salvo.
export function textoDoRegistro(registro: RegistroExercicio | undefined, opcao: OpcaoMetrica): string {
  if (!registro) return "";
  if (registro.metrica === "pace") return minutosParaPace(registro.valor);
  if (opcao === "tempo_seg") return String(Math.round(registro.valor * 60));
  return String(registro.valor).replace(".", ",");
}

// O servidor sempre trata "tempo" como minutos — quando a opção escolhida é
// segundos (tiros curtos, ex.: 200/300/400m), convertemos antes de enviar.
export function valorParaServidor(bruto: string, opcao: OpcaoMetrica): string {
  if (opcao !== "tempo_seg") return bruto;
  const segundos = numero(bruto);
  if (segundos === null) return bruto;
  return String(segundos / 60);
}

// Quantas séries mostrar de saída, a partir do texto da planilha
// ("4x8-10" -> 4, "3-4x8-10" -> 4, "4 séries de 6-8 reps" -> 4). É só um
// ponto de partida: o atleta sempre pode adicionar ou tirar série.
export function detectarNumeroSeries(detalhe?: string): number {
  if (!detalhe) return 1;
  const nxm = detalhe.match(/(\d+)(?:-(\d+))?\s*[x×]/);
  if (nxm) {
    const n = nxm[2] ? Math.max(Number(nxm[1]), Number(nxm[2])) : Number(nxm[1]);
    if (Number.isFinite(n) && n > 0 && n <= 20) return n;
  }
  const series = detalhe.match(/(\d+)\s*s[ée]ries/i);
  if (series) {
    const n = Number(series[1]);
    if (Number.isFinite(n) && n > 0 && n <= 20) return n;
  }
  return 1;
}

// Tempo de descanso (em segundos) lido do texto da planilha, ex.:
// "desc.: 2-3min" -> 150, "descanso 90s" -> 90. Faixas viram o ponto médio.
// Sem nada reconhecível, devolve null.
export function detectarDescanso(detalhe?: string): number | null {
  if (!detalhe) return null;
  // Vale a ÚLTIMA menção: em "pausa de 1'' em cima, pausa 60''" a primeira é
  // a pausa dentro da repetição e só a última é o descanso entre séries.
  const trechos = [...detalhe.matchAll(/(?:desc(?:anso)?|pausa|interv(?:alo)?)\.?\s*:?\s*(?:de\s*)?([^|·;,]+)/gi)];
  const trecho = trechos[trechos.length - 1];
  if (!trecho) return null;

  // Notação de cronômetro: 1'30'' = 90s, 90'' = 90s, 3' = 3min.
  const dentroDoLimite = (seg: number) => (seg > 0 && seg <= 900 ? seg : null);
  const minSeg = trecho[1].match(/(\d+)\s*['′’]\s*(\d{1,2})\s*(?:''|"|″|”)/);
  if (minSeg) return dentroDoLimite(Number(minSeg[1]) * 60 + Number(minSeg[2]));
  const soSeg = trecho[1].match(/(\d+)\s*(?:''|"|″|”)/);
  if (soSeg) return dentroDoLimite(Number(soSeg[1]));
  const soMin = trecho[1].match(/(\d+(?:[.,]\d+)?)\s*['′’]/);
  if (soMin) return dentroDoLimite(Math.round(Number(soMin[1].replace(",", ".")) * 60));

  const faixa = trecho[1].match(/(\d+(?:[.,]\d+)?)(?:\s*(?:-|a|–)\s*(\d+(?:[.,]\d+)?))?\s*(min|seg|s\b|m\b)/i);
  if (!faixa) return null;
  const a = Number(faixa[1].replace(",", "."));
  const b = faixa[2] ? Number(faixa[2].replace(",", ".")) : a;
  const media = (a + b) / 2;
  const emMinutos = /^m/i.test(faixa[3]);
  const segundos = Math.round(emMinutos ? media * 60 : media);
  return segundos > 0 && segundos <= 900 ? segundos : null;
}

export function normalizarRotulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
