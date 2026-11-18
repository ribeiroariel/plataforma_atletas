import type { SupabaseClient } from "@supabase/supabase-js";

export type Prova = { id: string; athleteId: string; nome: string; data: string; local: string | null };
export type Marca = {
  id: string;
  athleteId: string;
  prova: string;
  valor: number;
  unidade: "s" | "m" | "pts";
  data: string;
  competicao: string | null;
};

// Provas e marcas são tabelas novas (migração de 16/11/2026). Enquanto ela
// não roda no banco, as consultas falham — e aqui isso vira "nada cadastrado"
// mais um aviso, em vez de derrubar a tela.
export async function buscarProvas(
  supabase: SupabaseClient,
  athleteIds: string[],
): Promise<{ provas: Prova[]; disponivel: boolean }> {
  if (athleteIds.length === 0) return { provas: [], disponivel: true };
  const { data, error } = await supabase
    .from("competitions")
    .select("id, athlete_id, nome, data, local")
    .in("athlete_id", athleteIds)
    .order("data", { ascending: true });
  if (error) return { provas: [], disponivel: false };
  return {
    provas: (data ?? []).map((p) => ({ id: p.id, athleteId: p.athlete_id, nome: p.nome, data: p.data, local: p.local })),
    disponivel: true,
  };
}

export async function buscarMarcas(supabase: SupabaseClient, athleteIds: string[]): Promise<Marca[]> {
  if (athleteIds.length === 0) return [];
  const { data } = await supabase
    .from("marks")
    .select("id, athlete_id, prova, valor, unidade, data, competicao")
    .in("athlete_id", athleteIds)
    .order("data", { ascending: true });
  return (data ?? []).map((m) => ({
    id: m.id,
    athleteId: m.athlete_id,
    prova: m.prova,
    valor: Number(m.valor),
    unidade: m.unidade as Marca["unidade"],
    data: m.data,
    competicao: m.competicao,
  }));
}

export function diasAte(dataIso: string, hojeIso: string): number {
  return Math.round(
    (new Date(`${dataIso}T00:00:00Z`).getTime() - new Date(`${hojeIso}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

export function textoContagem(dias: number): string {
  if (dias === 0) return "É hoje";
  if (dias === 1) return "Amanhã";
  return `Faltam ${dias} dias`;
}

// Tempo: até 60 s mostra "10,85 s"; acima vira "1:58,30".
export function formatarMarca(valor: number, unidade: Marca["unidade"]): string {
  if (unidade === "s") {
    if (valor < 60) return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`;
    const min = Math.floor(valor / 60);
    const seg = valor - min * 60;
    return `${min}:${seg.toLocaleString("pt-BR", { minimumIntegerDigits: 2, minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (unidade === "m") return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  return `${valor.toLocaleString("pt-BR")} pts`;
}

export type GrupoMarcas = { prova: string; unidade: Marca["unidade"]; marcas: Marca[]; melhor: Marca };

// Marcas agrupadas por prova, com a melhor de cada uma (tempo: a menor;
// distância e pontos: a maior).
export function agruparMarcas(marcas: Marca[]): GrupoMarcas[] {
  const grupos = new Map<string, Marca[]>();
  for (const m of marcas) {
    const chave = `${m.prova.trim().toLowerCase()}|${m.unidade}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), m]);
  }
  return [...grupos.values()]
    .map((lista) => {
      const ordenadas = [...lista].sort((a, b) => a.data.localeCompare(b.data));
      const melhor = ordenadas.reduce((best, m) =>
        m.unidade === "s" ? (m.valor < best.valor ? m : best) : m.valor > best.valor ? m : best,
      );
      return { prova: ordenadas[ordenadas.length - 1].prova, unidade: ordenadas[0].unidade, marcas: ordenadas, melhor };
    })
    .sort((a, b) => a.prova.localeCompare(b.prova, "pt-BR"));
}
