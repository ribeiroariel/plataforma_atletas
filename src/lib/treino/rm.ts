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

// Anilhas disponíveis na academia (kg).
export const ANILHAS_PADRAO = [20, 15, 10, 5, 2.5];

export type Montagem = {
  // Anilhas de UM lado da barra, da maior pra menor (a maior vai mais perto
  // do centro).
  porLado: number[];
  // Carga que fica de fato na barra.
  montada: number;
  // Quanto a montagem passou da carga pedida (quando não fecha exato, arredonda
  // pra CIMA até a próxima carga possível). 0 = fechou exato.
  acima: number;
};

// Quais anilhas colocar de cada lado pra chegar numa carga total. Quando a
// conta não fecha com as anilhas que existem, sobe até a próxima carga que
// dá pra montar (ex.: 62 kg na barra de 20 -> 62,5 kg... e com só 2,5 como
// menor anilha, o passo é 5 kg: 62 -> 65).
export function montarBarra(cargaTotal: number, barra = 20, anilhas: number[] = ANILHAS_PADRAO): Montagem {
  const porLado: number[] = [];
  if (!(cargaTotal > barra)) return { porLado, montada: barra, acima: Math.max(0, barra - cargaTotal) };

  // Trabalha em gramas pra não acumular erro de vírgula.
  const ordenadas = [...anilhas].sort((x, y) => y - x);
  const menor = Math.round(ordenadas[ordenadas.length - 1] * 1000);
  const precisaPorLado = Math.round(((cargaTotal - barra) / 2) * 1000);
  let restante = Math.ceil(precisaPorLado / menor) * menor;

  for (const anilha of ordenadas) {
    const g = Math.round(anilha * 1000);
    while (restante >= g) {
      porLado.push(anilha);
      restante -= g;
    }
  }
  const montada = barra + 2 * porLado.reduce((t, x) => t + x, 0);
  return { porLado, montada, acima: Math.round((montada - cargaTotal) * 100) / 100 };
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
