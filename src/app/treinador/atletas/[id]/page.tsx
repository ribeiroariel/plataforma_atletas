import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";

export default async function AtletaDoTreinadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: atleta } = await supabase
    .from("athletes")
    .select("id, nome")
    .eq("id", id)
    .single();

  if (!atleta) {
    notFound();
  }

  const { data: dados } = await supabase
    .from("training_data")
    .select("data, tipo, variavel, valor")
    .eq("athlete_id", atleta.id);

  const { data: planos } = await supabase
    .from("training_plans")
    .select("id, nome_arquivo, data_criacao")
    .eq("athlete_id", atleta.id)
    .order("data_criacao", { ascending: false });

  const { data: observacoes } = await supabase
    .from("observations")
    .select("id, training_plan_id, texto, data")
    .eq("athlete_id", atleta.id)
    .order("data", { ascending: false });

  const observacoesPorPlano = new Map<string, typeof observacoes>();
  (observacoes ?? []).forEach((obs) => {
    const lista = observacoesPorPlano.get(obs.training_plan_id) ?? [];
    lista.push(obs);
    observacoesPorPlano.set(obs.training_plan_id, lista);
  });

  return (
    <div className="flex flex-1 flex-col gap-6 bg-track-night px-6 py-10 text-white">
      <div>
        <Link href="/treinador" className="text-sm text-sky-split hover:underline">
          ← Seus atletas
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{atleta.nome}</h1>
      </div>

      <EvolucaoDashboard dados={dados ?? []} />

      <section className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
        <h2 className="font-display text-lg font-semibold">Observações do atleta</h2>

        {planos && planos.length > 0 ? (
          <div className="flex flex-col gap-4">
            {planos.map((plano) => {
              const obsDoPlano = observacoesPorPlano.get(plano.id) ?? [];
              return (
                <div key={plano.id} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
                  <p className="text-sm font-medium text-white">
                    {plano.nome_arquivo.replace(/\.xlsx$/i, "").replace(/[_-]+/g, " ")}
                  </p>
                  {obsDoPlano.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {obsDoPlano.map((obs) => (
                        <li key={obs.id} className="text-sm text-white/70">
                          <span className="tabular-data mr-2 text-xs text-track-fog">{obs.data}</span>
                          {obs.texto}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-track-fog">Sem observações ainda.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-track-fog">Nenhum treino enviado para esse atleta ainda.</p>
        )}
      </section>
    </div>
  );
}
