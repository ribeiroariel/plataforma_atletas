import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconeAcademia, IconePista } from "@/components/icons/IconesTreino";

const ICONE_POR_MODO = {
  semana: IconeAcademia,
  blocos: IconePista,
  generico: IconeAcademia,
} as const;

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  return { dia, mes: meses[Number(mes) - 1] };
}

function tituloLegivel(nomeArquivo: string) {
  return nomeArquivo
    .replace(/\.xlsx$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export default async function AtletaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nome, avatar_url")
    .eq("user_id", user?.id)
    .single();

  const { data: planos } = await supabase
    .from("training_plans")
    .select("id, nome_arquivo, arquivo_url, data_criacao, modo_treino")
    .eq("athlete_id", athlete?.id ?? "")
    .order("data_criacao", { ascending: false });

  const planosComLink = await Promise.all(
    (planos ?? []).map(async (plano) => {
      const { data } = await supabase.storage
        .from("training-plans")
        .createSignedUrl(plano.arquivo_url, 300);
      return { ...plano, downloadUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-1 flex-col gap-6 bg-lane-chalk px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-track-night">
          Olá, {athlete?.nome ?? "atleta"}
        </h1>
        <p className="text-sm text-track-fog">Seus treinos</p>
      </div>

      {planosComLink.length === 0 ? (
        <p className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white px-4 py-6 text-center text-sm text-track-fog">
          Nenhum treino ainda. Quando seu treinador subir um plano, ele aparece aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {planosComLink.map((plano) => {
            const { dia, mes } = formatarData(plano.data_criacao);
            const Icone =
              ICONE_POR_MODO[plano.modo_treino as keyof typeof ICONE_POR_MODO] ?? IconeAcademia;
            return (
              <div
                key={plano.id}
                className="flex items-center gap-4 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white px-4 py-3"
              >
                <div className="tabular-data flex shrink-0 flex-col items-center leading-none text-deep-lane">
                  <span className="font-display text-xl font-bold">{dia}</span>
                  <span className="text-[10px] tracking-wide text-track-fog">{mes}</span>
                </div>
                <Icone className="h-5 w-5 shrink-0 text-stadium-blue" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-track-night">
                    {tituloLegivel(plano.nome_arquivo)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`/atleta/treinos/${plano.id}/imprimir`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 text-sm text-track-night hover:bg-lane-chalk"
                  >
                    PDF
                  </a>
                  {plano.downloadUrl && (
                    <a
                      href={plano.downloadUrl}
                      className="hidden rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 text-sm text-track-night hover:bg-lane-chalk sm:inline-block"
                    >
                      .xlsx
                    </a>
                  )}
                  <Link
                    href={`/atleta/treinos/${plano.id}`}
                    className="rounded-[var(--radius-badge)] bg-stadium-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-deep-lane"
                  >
                    Ver treino
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
