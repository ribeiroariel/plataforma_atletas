// Datas "de calendário" (yyyy-mm-dd) sem cair na armadilha do UTC: às 22h no
// Brasil o toISOString() já devolve o dia seguinte.

// No navegador: o dia de hoje no fuso do aparelho.
export function hojeLocalIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// No servidor (que roda em UTC): o dia de hoje no horário de Brasília.
export function hojeBrasilIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function somarDias(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function segundaDaSemana(dataIso: string): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  const diaSemana = d.getUTCDay();
  return somarDias(dataIso, diaSemana === 0 ? -6 : 1 - diaSemana);
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_LONGOS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function diaDoMes(dataIso: string): string {
  return String(Number(dataIso.slice(8, 10)));
}

export function mesCurto(dataIso: string): string {
  return MESES_CURTOS[Number(dataIso.slice(5, 7)) - 1] ?? "";
}

export function mesLongo(dataIso: string): string {
  return MESES_LONGOS[Number(dataIso.slice(5, 7)) - 1] ?? "";
}

export function dataCurta(dataIso: string): string {
  return `${diaDoMes(dataIso)} ${mesCurto(dataIso)}`;
}

export function diaDaSemanaLongo(dataIso: string): string {
  return DIAS_LONGOS[new Date(`${dataIso}T00:00:00Z`).getUTCDay()];
}

export function tituloDoPlano(nomeArquivo: string): string {
  return nomeArquivo
    .replace(/\.xlsx$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}
