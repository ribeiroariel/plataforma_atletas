export type LinhaTrainingData = {
  data: string; // yyyy-mm-dd
  tipo: string;
  variavel: string;
  valor: number;
};

export type PontoSemana = { semana: string; total: number };

export type Periodo = "semana" | "mes" | "tudo";

const DIAS_POR_PERIODO: Record<Exclude<Periodo, "tudo">, number> = {
  semana: 7,
  mes: 30,
};

function segundaFeiraDaSemana(dataIso: string): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  const diaSemana = d.getUTCDay();
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setUTCDate(d.getUTCDate() + deslocamento);
  return d.toISOString().slice(0, 10);
}

function somarISO(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function serieSemanal(linhas: LinhaTrainingData[]): PontoSemana[] {
  const somaPorSemana = new Map<string, number>();
  for (const linha of linhas) {
    const semana = segundaFeiraDaSemana(linha.data);
    somaPorSemana.set(semana, (somaPorSemana.get(semana) ?? 0) + linha.valor);
  }
  return [...somaPorSemana.entries()]
    .map(([semana, total]) => ({ semana, total }))
    .sort((a, b) => a.semana.localeCompare(b.semana));
}

export function filtrarPorPeriodo(
  linhas: LinhaTrainingData[],
  periodo: Periodo,
  hojeIso: string,
): LinhaTrainingData[] {
  if (periodo === "tudo") return linhas;
  const inicio = somarISO(hojeIso, -DIAS_POR_PERIODO[periodo]);
  return linhas.filter((l) => l.data > inicio && l.data <= hojeIso);
}

export type Resumo = {
  total: number;
  variacaoPercentual: number | null;
  recorde: boolean;
};

export function resumoPeriodo(
  linhas: LinhaTrainingData[],
  periodo: Periodo,
  hojeIso: string,
): Resumo {
  const serie = serieSemanal(linhas);
  const maiorSemana = serie.reduce((max, p) => Math.max(max, p.total), 0);

  if (periodo === "tudo") {
    const total = linhas.reduce((acc, l) => acc + l.valor, 0);
    return { total, variacaoPercentual: null, recorde: false };
  }

  const dias = DIAS_POR_PERIODO[periodo];
  const inicioAtual = somarISO(hojeIso, -dias);
  const inicioAnterior = somarISO(inicioAtual, -dias);

  const totalAtual = linhas
    .filter((l) => l.data > inicioAtual && l.data <= hojeIso)
    .reduce((acc, l) => acc + l.valor, 0);
  const totalAnterior = linhas
    .filter((l) => l.data > inicioAnterior && l.data <= inicioAtual)
    .reduce((acc, l) => acc + l.valor, 0);

  const variacaoPercentual =
    totalAnterior > 0
      ? ((totalAtual - totalAnterior) / totalAnterior) * 100
      : totalAtual > 0
        ? 100
        : null;

  const recorde = totalAtual > 0 && totalAtual >= maiorSemana;

  return { total: totalAtual, variacaoPercentual, recorde };
}
