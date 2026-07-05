// Helpers de parsing de valores numéricos usados pelos registros de treino
// (formulário manual agregado em registro.ts e registro por exercício em
// exercicio.ts). Mantidos aqui para não duplicar a lógica de pace/número.

// Converte "5:30" (min:seg) ou "5,5" em minutos decimais.
export function paceParaMinutos(valor: string): number | null {
  const texto = valor.trim();
  const mmss = texto.match(/^(\d+):([0-5]\d)$/);
  if (mmss) return Number(mmss[1]) + Number(mmss[2]) / 60;
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Converte "5,5" ou "5.5" em número decimal (aceita vírgula pt-BR).
export function numero(valor: string): number | null {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
