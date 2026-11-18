// Contas de força: 1RM estimado e montagem de barra.

// Carga máxima estimada para 1 repetição (fórmula de Epley). Com 1 rep é a
// própria carga; acima de ~12 reps a estimativa fica cada vez menos confiável.
export function estimar1RM(kg: number, reps: number): number {
  if (!(kg > 0) || !(reps >= 1)) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

// O inverso: que carga corresponde a "n" repetições para um dado 1RM.
export function cargaParaReps(umRM: number, reps: number): number {
  if (!(umRM > 0) || !(reps >= 1)) return 0;
  if (reps === 1) return umRM;
  return umRM / (1 + reps / 30);
}

// Quantas repetições, em média, se espera conseguir com um percentual do 1RM.
export function repsEsperadas(percentual: number): number {
  if (percentual >= 100) return 1;
  return Math.max(1, Math.round(30 * (100 / percentual - 1)));
}

export function arredondarCarga(kg: number, passo = 2.5): number {
  return Math.round(kg / passo) * passo;
}

export const ANILHAS_PADRAO = [25, 20, 15, 10, 5, 2.5, 1.25];

export type Montagem = {
  // Anilhas de UM lado da barra, da maior pra menor.
  porLado: number[];
  // Carga realmente montada (pode ser menor que a pedida se não fechar).
  montada: number;
  // Quanto ficou faltando pra chegar na carga pedida.
  sobra: number;
};

// Quais anilhas colocar de cada lado pra chegar numa carga total.
export function montarBarra(cargaTotal: number, barra = 20, anilhas: number[] = ANILHAS_PADRAO): Montagem {
  const porLado: number[] = [];
  if (!(cargaTotal > barra)) return { porLado, montada: Math.min(cargaTotal, barra), sobra: 0 };

  // Trabalha em gramas pra não acumular erro de vírgula (1,25 + 2,5 ...).
  let restante = Math.round(((cargaTotal - barra) / 2) * 1000);
  for (const anilha of [...anilhas].sort((a, b) => b - a)) {
    const g = Math.round(anilha * 1000);
    while (restante >= g) {
      porLado.push(anilha);
      restante -= g;
    }
  }
  const montada = barra + 2 * porLado.reduce((s, a) => s + a, 0);
  return { porLado, montada, sobra: Math.round((cargaTotal - montada) * 100) / 100 };
}

// Junta anilhas repetidas: [20, 20, 5] -> "2×20 + 5".
export function descreverAnilhas(porLado: number[]): string {
  if (porLado.length === 0) return "só a barra";
  const grupos = new Map<number, number>();
  for (const a of porLado) grupos.set(a, (grupos.get(a) ?? 0) + 1);
  return [...grupos.entries()]
    .map(([kg, n]) => `${n > 1 ? `${n}×` : ""}${String(kg).replace(".", ",")}`)
    .join(" + ");
}
