import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarGrupos } from "@/lib/treinador/resumoAtletas";
import type { RegistroExercicio, RegistroMapa } from "@/lib/treino/registros";
import { dataCurta, hojeBrasilIso, tituloDoPlano } from "@/lib/datas";
import { TreinoInterativo } from "@/components/treino/TreinoInterativo";

// Visão do treinador sobre o que um atleta vinculado executou num plano —
// somente leitura, com a mesma navegação por semana e dia que o atleta usa.
export default async function TreinoExecutadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; planoId: string }>;
  searchParams: Promise<{ sessao?: string }>;
}) {
  const { id, planoId } = await params;
  const { sessao } = await searchParams;
  const supabase = await createClient();

  const { data: atleta } = await supabase.from("athletes").select("id, nome").eq("id", id).single();
  if (!atleta) notFound();

  const { data: plano } = await supabase
    .from("training_plans")
    .select("id, athlete_id, nome_arquivo, arquivo_url, data_criacao, data_inicio")
    .eq("id", planoId)
    .eq("athlete_id", id)
    .single();
  if (!plano) notFound();

  const [grupos, { data: observacoes }, { data: conclusoes }, { data: logs }] = await Promise.all([
    carregarGrupos(supabase, plano),
    supabase.from("observations").select("id, texto, data").eq("training_plan_id", plano.id).order("data", { ascending: false }),
    supabase.from("training_completions").select("session_key").eq("training_plan_id", plano.id),
    supabase.from("exercise_logs").select("session_key, item_index, serie, metrica, valor, data").eq("training_plan_id", plano.id),
  ]);

  const registros: RegistroMapa = {};
  for (const l of logs ?? []) {
    registros[`${l.session_key}:${l.item_index}:${l.serie}`] = {
      metrica: l.metrica as RegistroExercicio["metrica"],
      valor: Number(l.valor),
      data: l.data,
    };
  }

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-4 pt-5 pb-6 text-white sm:px-8 sm:pt-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <Link
            href={`/treinador/atletas/${id}`}
            className="rotulo -ml-2 flex min-h-[40px] w-fit items-center gap-1.5 rounded-full px-2 text-white/60 transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {atleta.nome}
          </Link>
          <div>
            <p className="rotulo text-tartan">Execução · desde {dataCurta(plano.data_inicio ?? plano.data_criacao)}</p>
            <h1 className="font-display mt-1 text-4xl leading-[0.98] font-black break-words uppercase sm:text-5xl">
              {tituloDoPlano(plano.nome_arquivo)}
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8">
        {grupos ? (
          <TreinoInterativo
            planoId={plano.id}
            grupos={grupos}
            registrosIniciais={registros}
            concluidasIniciais={(conclusoes ?? []).map((c) => c.session_key)}
            sessaoInicial={sessao}
            hoje={hojeBrasilIso()}
            somenteLeitura
          />
        ) : (
          <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
            Esse formato de planilha ainda não tem visão de treino executado.
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-extrabold uppercase">Recados do atleta</h2>
          {observacoes && observacoes.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {observacoes.map((obs) => (
                <li key={obs.id} className="flex gap-3 rounded-xl bg-white px-4 py-3 text-sm text-ink/85 ring-1 ring-ash">
                  <span className="tabular-data shrink-0 pt-0.5 text-[11px] text-cinza">{dataCurta(obs.data)}</span>
                  <span className="min-w-0 break-words">{obs.texto}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-cinza">Sem recados nesse plano.</p>
          )}
        </section>
      </div>
    </div>
  );
}
