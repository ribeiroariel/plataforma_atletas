import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTreinoData } from "@/lib/treino/getTreinoData";
import { TreinoView } from "@/components/treino/TreinoView";
import { ObservacaoForm } from "@/components/treino/ObservacaoForm";

function tituloLegivel(nomeArquivo: string) {
  return nomeArquivo
    .replace(/\.xlsx$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export default async function TreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await getTreinoData(id);

  if (!dados) {
    notFound();
  }

  const { plano, treino, concluidas, registros } = dados;

  const supabase = await createClient();
  const { data: downloadUrl } = await supabase.storage
    .from("training-plans")
    .createSignedUrl(plano.arquivo_url, 300);

  const { data: observacoes } = await supabase
    .from("observations")
    .select("id, texto, data")
    .eq("training_plan_id", plano.id)
    .order("data", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-6 bg-lane-chalk px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <Link href="/atleta" className="text-sm text-stadium-blue hover:underline">
          ← Voltar
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-track-night">
            {tituloLegivel(plano.nome_arquivo)}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/atleta/treinos/${plano.id}/imprimir`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[var(--radius-badge)] bg-stadium-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-deep-lane"
            >
              Baixar PDF
            </a>
            {downloadUrl?.signedUrl && (
              <a
                href={downloadUrl.signedUrl}
                className="rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 text-sm text-track-night hover:bg-white"
              >
                .xlsx original
              </a>
            )}
          </div>
        </div>
      </div>

      {treino ? (
        <TreinoView
          treino={treino}
          trainingPlanId={plano.id}
          concluidas={concluidas}
          registros={registros}
        />
      ) : (
        <p className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white px-4 py-6 text-sm text-track-fog">
          Não foi possível carregar o conteúdo desse treino agora.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4">
        <h2 className="font-display text-base font-semibold text-track-night">
          Suas observações
        </h2>

        {observacoes && observacoes.length > 0 && (
          <ul className="flex flex-col gap-2 border-b border-track-fog/15 pb-3">
            {observacoes.map((obs) => (
              <li key={obs.id} className="text-sm text-track-night/90">
                <span className="tabular-data mr-2 text-xs text-track-fog">{obs.data}</span>
                {obs.texto}
              </li>
            ))}
          </ul>
        )}

        <ObservacaoForm trainingPlanId={plano.id} />
      </section>
    </div>
  );
}
