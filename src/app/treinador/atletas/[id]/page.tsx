import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";
import { TabelaComparativa } from "@/components/evolucao/TabelaComparativa";
import { AnaliseEstatistica } from "@/components/evolucao/AnaliseEstatistica";
import { IconeAcademia, IconePista } from "@/components/icons/IconesTreino";

const ICONE_POR_MODO = {
  semana: IconeAcademia,
  blocos: IconePista,
  generico: IconeAcademia,
} as const;

type Plano = { id: string; nome_arquivo: string; data_criacao: string; modo_treino: string | null; numero_semanas: number | null };

// Só a grade semanal (academia/cardio em ciclo) tem duração inerente — sessões
// de pista (blocos) não expiram dessa forma. dataFim = data_criacao +
// numero_semanas semanas; diasRestantes negativo = mesociclo já encerrado.
function statusMesociclo(plano: Plano, hojeIso: string) {
  if (plano.modo_treino !== "semana" || !plano.numero_semanas) return null;
  const fim = new Date(`${plano.data_criacao}T00:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + plano.numero_semanas * 7);
  const hoje = new Date(`${hojeIso}T00:00:00Z`);
  const diasRestantes = Math.round((fim.getTime() - hoje.getTime()) / 86_400_000);
  return { diasRestantes };
}

function nomeLegivel(nomeArquivo: string) {
  return nomeArquivo.replace(/\.xlsx$/i, "").replace(/[_-]+/g, " ");
}

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
    .select("id, nome_arquivo, data_criacao, modo_treino, numero_semanas")
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

  const hojeIso = new Date().toISOString().slice(0, 10);
  // planos já vem ordenado por data_criacao desc — o primeiro plano em modo
  // "semana" é o mesociclo vigente.
  const planoAtual = (planos ?? []).find((p) => p.modo_treino === "semana" && p.numero_semanas);
  const mesocicloAtual = planoAtual ? statusMesociclo(planoAtual, hojeIso) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 bg-track-night px-6 py-10 text-white">
      <div>
        <Link href="/treinador" className="text-sm text-sky-split hover:underline">
          ← Seus atletas
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{atleta.nome}</h1>
      </div>

      {mesocicloAtual && planoAtual && mesocicloAtual.diasRestantes <= 7 && (
        <div
          className={`rounded-[var(--radius-badge)] border px-4 py-3 text-sm ${
            mesocicloAtual.diasRestantes <= 0
              ? "border-split-ember/40 bg-split-ember/10 text-split-ember"
              : "border-split-ember/25 bg-split-ember/5 text-split-ember/90"
          }`}
        >
          {mesocicloAtual.diasRestantes <= 0
            ? `O mesociclo atual (${nomeLegivel(planoAtual.nome_arquivo)}) encerrou há ${Math.abs(mesocicloAtual.diasRestantes)} dia(s) — hora de montar o próximo treino.`
            : `O mesociclo atual (${nomeLegivel(planoAtual.nome_arquivo)}) termina em ${mesocicloAtual.diasRestantes} dia(s).`}
        </div>
      )}

      <EvolucaoDashboard dados={dados ?? []} />

      <TabelaComparativa dados={dados ?? []} />

      <AnaliseEstatistica dados={dados ?? []} />

      <section className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
        <h2 className="font-display text-lg font-semibold">Observações do atleta</h2>

        {planos && planos.length > 0 ? (
          <div className="flex flex-col gap-4">
            {planos.map((plano) => {
              const obsDoPlano = observacoesPorPlano.get(plano.id) ?? [];
              const totalConcluidas = conclusoesPorPlano.get(plano.id) ?? 0;
              const Icone =
                ICONE_POR_MODO[plano.modo_treino as keyof typeof ICONE_POR_MODO] ?? IconeAcademia;
              const status = statusMesociclo(plano, hojeIso);
              return (
                <div key={plano.id} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/treinador/atletas/${id}/treinos/${plano.id}`}
                      className="flex items-center gap-1.5 text-sm font-medium text-white hover:underline"
                    >
                      <Icone className="h-4 w-4 shrink-0 text-sky-split" />
                      {nomeLegivel(plano.nome_arquivo)}
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {status && (
                        <span
                          className={`tabular-data rounded-[var(--radius-badge)] px-2 py-0.5 text-xs font-medium ${
                            status.diasRestantes <= 0
                              ? "bg-split-ember/20 text-split-ember"
                              : status.diasRestantes <= 7
                                ? "bg-split-ember/10 text-split-ember/90"
                                : "bg-white/10 text-track-fog"
                          }`}
                        >
                          {status.diasRestantes <= 0
                            ? `encerrado há ${Math.abs(status.diasRestantes)}d`
                            : `termina em ${status.diasRestantes}d`}
                        </span>
                      )}
                      {totalConcluidas > 0 && (
                        <span className="tabular-data rounded-[var(--radius-badge)] bg-stadium-blue/20 px-2 py-0.5 text-xs font-medium text-sky-split">
                          {totalConcluidas} concluída{totalConcluidas > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
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
