import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";
import { IconeAcademia, IconePista } from "@/components/icons/IconesTreino";

const ICONE_POR_MODO = {
  semana: IconeAcademia,
  blocos: IconePista,
  generico: IconeAcademia,
} as const;

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
    .select("id, nome_arquivo, data_criacao, modo_treino")
    .eq("athlete_id", atleta.id)
    .order("data_criacao", { ascending: false });

  const { data: observacoes } = await supabase
    .from("observations")
    .select("id, training_plan_id, texto, data")
    .eq("athlete_id", atleta.id)
    .order("data", { ascending: false });

  const { data: conclusoes } = await supabase
    .from("training_completions")
    .select("training_plan_id")
    .eq("athlete_id", atleta.id);

  const observacoesPorPlano = new Map<string, typeof observacoes>();
  (observacoes ?? []).forEach((obs) => {
    const lista = observacoesPorPlano.get(obs.training_plan_id) ?? [];
    lista.push(obs);
    observacoesPorPlano.set(obs.training_plan_id, lista);
  });

  const conclusoesPorPlano = new Map<string, number>();
  (conclusoes ?? []).forEach((c) => {
    conclusoesPorPlano.set(
      c.training_plan_id,
      (conclusoesPorPlano.get(c.training_plan_id) ?? 0) + 1,
    );
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
              const totalConcluidas = conclusoesPorPlano.get(plano.id) ?? 0;
              const Icone =
                ICONE_POR_MODO[plano.modo_treino as keyof typeof ICONE_POR_MODO] ?? IconeAcademia;
              return (
                <div key={plano.id} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-white">
                      <Icone className="h-4 w-4 shrink-0 text-sky-split" />
                      {plano.nome_arquivo.replace(/\.xlsx$/i, "").replace(/[_-]+/g, " ")}
                    </p>
                    {totalConcluidas > 0 && (
                      <span className="tabular-data shrink-0 rounded-[var(--radius-badge)] bg-stadium-blue/20 px-2 py-0.5 text-xs font-medium text-sky-split">
                        {totalConcluidas} concluída{totalConcluidas > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
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
