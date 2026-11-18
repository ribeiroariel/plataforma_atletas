import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseTreino } from "@/lib/planilha/parseTreino";
import { gruposDaSemana, gruposDosBlocos } from "@/lib/treino/montarSessoes";
import { buscarFeedbackDoPlano, buscarRegistrosDoPlano, buscarRespostas } from "@/lib/treino/logs";
import { buscarHistorico, recentesPorExercicio, recordesPorExercicio } from "@/lib/treino/historico";
import { Recado } from "@/components/treino/Recado";
import { dataCurta, hojeBrasilIso, tituloDoPlano } from "@/lib/datas";
import { TreinoInterativo } from "@/components/treino/TreinoInterativo";
import { ObservacaoForm } from "@/components/treino/ObservacaoForm";

const ROTULO_MODO: Record<string, string> = {
  semana: "Mesociclo",
  blocos: "Sessão de pista",
  generico: "Plano de treino",
};

export default async function TreinoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessao?: string }>;
}) {
  const { id } = await params;
  const { sessao } = await searchParams;
  const supabase = await createClient();

  const { data: plano } = await supabase
    .from("training_plans")
    .select("id, athlete_id, nome_arquivo, arquivo_url, data_criacao, data_inicio")
    .eq("id", id)
    .single();

  if (!plano) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: arquivo }, { data: downloadUrl }, { data: observacoes }, { data: conclusoes }, registros, feedbacks, historico] =
    await Promise.all([
      supabase.storage.from("training-plans").download(plano.arquivo_url),
      supabase.storage.from("training-plans").createSignedUrl(plano.arquivo_url, 300),
      supabase
        .from("observations")
        .select("id, texto, data")
        .eq("training_plan_id", plano.id)
        .order("data", { ascending: false }),
      supabase.from("training_completions").select("session_key").eq("training_plan_id", plano.id),
      buscarRegistrosDoPlano(supabase, plano.id),
      buscarFeedbackDoPlano(supabase, plano.id),
      buscarHistorico(supabase, plano.athlete_id),
    ]);

  const concluidas = (conclusoes ?? []).map((c) => c.session_key);
  const respostas = await buscarRespostas(supabase, (observacoes ?? []).map((o) => o.id), user?.id);

  const treino = arquivo ? parseTreino(Buffer.from(await arquivo.arrayBuffer())) : null;
  const grupos =
    treino?.tipo === "semana"
      ? gruposDaSemana(treino, plano.data_inicio ?? plano.data_criacao)
      : treino?.tipo === "blocos"
        ? gruposDosBlocos(treino)
        : null;

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-4 pt-5 pb-6 text-white sm:px-8 sm:pt-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/atleta"
              className="rotulo -ml-2 flex min-h-[40px] items-center gap-1.5 rounded-full px-2 text-white/60 transition-colors hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Hoje
            </Link>
            {downloadUrl?.signedUrl && (
              <a
                href={downloadUrl.signedUrl}
                className="rotulo flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/20 px-3 text-white/70 transition-colors hover:border-white/50 hover:text-white"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M12 4v11M7 11l5 5 5-5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Planilha
              </a>
            )}
          </div>
          <div>
            <p className="rotulo text-tartan">
              {ROTULO_MODO[treino?.tipo ?? "generico"]} · desde {dataCurta(plano.data_inicio ?? plano.data_criacao)}
            </p>
            <h1 className="font-display mt-1 text-4xl leading-[0.98] font-black break-words uppercase sm:text-5xl">
              {tituloDoPlano(plano.nome_arquivo)}
            </h1>
            {treino?.tipo === "blocos" && treino.objetivo && (
              <p className="mt-2 max-w-xl text-sm text-white/60">{treino.objetivo}</p>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">
        {grupos ? (
          <TreinoInterativo
            planoId={plano.id}
            grupos={grupos}
            registrosIniciais={registros}
            concluidasIniciais={concluidas}
            sessaoInicial={sessao}
            hoje={hojeBrasilIso()}
            recordes={recordesPorExercicio(historico)}
            recentes={recentesPorExercicio(historico)}
            feedbacksIniciais={feedbacks}
          />
        ) : treino?.tipo === "generico" ? (
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ash">
            <table className="w-full text-left text-sm">
              <tbody>
                {treino.linhas.map((linha, i) => (
                  <tr key={i} className="border-b border-ash last:border-0">
                    {linha.map((celula, j) => (
                      <td key={j} className="px-4 py-2.5 align-top text-ink/85">
                        {celula}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
            Não foi possível carregar o conteúdo desse treino agora. Tente de novo em instantes.
          </p>
        )}

        {treino?.tipo === "semana" && treino.legenda && (
          <p className="tabular-data rounded-xl bg-white px-4 py-3 text-xs leading-relaxed text-ink/60 ring-1 ring-ash">
            {treino.legenda}
          </p>
        )}

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="rotulo text-ink">Recado para o treinador</h2>
            <span aria-hidden className="h-px flex-1 bg-ash" />
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-ash sm:p-5">
            <ObservacaoForm trainingPlanId={plano.id} />
          </div>

          {observacoes && observacoes.length > 0 && (
            <ul className="flex flex-col gap-3">
              {observacoes.map((obs) => (
                <Recado
                  key={obs.id}
                  id={obs.id}
                  texto={obs.texto}
                  data={obs.data}
                  respostas={respostas[obs.id] ?? []}
                  caminho={`/atleta/treinos/${plano.id}`}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
