import { notFound } from "next/navigation";
import { getTreinoData } from "@/lib/treino/getTreinoData";
import { TreinoImpressao } from "@/components/treino/TreinoImpressao";
import { BotaoImprimir } from "@/components/treino/BotaoImprimir";

function tituloLegivel(nomeArquivo: string) {
  return nomeArquivo
    .replace(/\.xlsx$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function formatarDataExtenso(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default async function ImprimirTreinoPage({
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 bg-white px-6 py-10 print:px-0 print:py-0">
      <div className="print:hidden">
        <BotaoImprimir />
      </div>

      <header className="flex flex-col gap-1 border-b border-track-fog/25 pb-4">
        <span className="text-xs font-semibold tracking-[0.2em] text-stadium-blue uppercase">
          Plataforma de treinos
        </span>
        <h1 className="font-display text-2xl font-bold text-track-night">
          {tituloLegivel(plano.nome_arquivo)}
        </h1>
        <p className="text-sm text-track-fog">
          {plano.athleteNome ?? "Atleta"} · {formatarDataExtenso(plano.data_criacao)}
        </p>
      </header>

      {treino ? (
        <TreinoImpressao treino={treino} concluidas={concluidas} registros={registros} />
      ) : (
        <p className="text-sm text-track-fog">Não foi possível carregar o conteúdo desse treino agora.</p>
      )}
    </div>
  );
}
