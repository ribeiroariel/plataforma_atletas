import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GraficoComparativo } from "@/components/evolucao/GraficoComparativo";

export default async function CompararAtletasPage() {
  const supabase = await createClient();

  const { data: atletas } = await supabase
    .from("athletes")
    .select("id, nome")
    .order("nome");

  const { data: dados } = await supabase
    .from("training_data")
    .select("athlete_id, data, tipo, variavel, valor");

  const atletasComDados = (atletas ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    linhas: (dados ?? []).filter((d) => d.athlete_id === a.id),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 bg-track-night px-6 py-10 text-white">
      <div>
        <Link href="/treinador" className="text-sm text-sky-split hover:underline">
          ← Seus atletas
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Comparar atletas</h1>
      </div>

      {atletasComDados.length > 0 ? (
        <GraficoComparativo atletas={atletasComDados} />
      ) : (
        <p className="text-sm text-track-fog">
          Nenhum atleta vinculado ainda para comparar.
        </p>
      )}
    </div>
  );
}
