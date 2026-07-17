import type { LinhaTrainingData } from "./agregarSemana";
import { testeT, type ResultadoTesteT } from "./testeT";

const DIAS_POR_PERIODO: Record<"semana" | "mes", number> = { semana: 7, mes: 30 };

function somarISO(dataIso: string, dias: number): string {
  const d = new Date(`${dataIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Cada linha de training_data já é um valor diário (constraint única por
// atleta/data/tipo/variável) — então a "amostra" do teste t é só filtrar as
// linhas de cada período, sem precisar agregar nada.
export function compararPeriodos(
  linhas: LinhaTrainingData[],
  periodo: "semana" | "mes",
  hojeIso: string,
): ResultadoTesteT | null {
  const dias = DIAS_POR_PERIODO[periodo];
  const inicioAtual = somarISO(hojeIso, -dias);
  const inicioAnterior = somarISO(inicioAtual, -dias);

  const amostraAtual = linhas.filter((l) => l.data > inicioAtual && l.data <= hojeIso).map((l) => l.valor);
  const amostraAnterior = linhas
    .filter((l) => l.data > inicioAnterior && l.data <= inicioAtual)
    .map((l) => l.valor);

  return testeT(amostraAnterior, amostraAtual);
}
