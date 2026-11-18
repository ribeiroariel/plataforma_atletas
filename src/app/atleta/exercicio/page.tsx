import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buscarHistorico } from "@/lib/treino/historico";
import { formatarNumero, normalizarRotulo } from "@/lib/treino/registros";
import { estimar1RM } from "@/lib/treino/rm";
import { dataCurta } from "@/lib/datas";
import { GraficoExercicio, type PontoExercicio } from "@/components/evolucao/GraficoExercicio";

// Histórico de um exercício: todas as cargas que o atleta já lançou nele,
// em qualquer plano. Chega-se aqui tocando no nome do exercício no treino.
export default async function ExercicioPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string }>;
}) {
  const { nome = "" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: athlete } = await supabase.from("athletes").select("id").eq("user_id", user?.id).single();

  const historico = athlete ? await buscarHistorico(supabase, athlete.id) : [];
  const exercicio = historico.find((h) => h.chave === normalizarRotulo(nome));

  const pontos: PontoExercicio[] = (exercicio?.entradas ?? []).map((e) => {
    const rms = e.series.filter((s) => s.reps).map((s) => estimar1RM(s.kg, s.reps ?? 0));
    return {
      data: e.data,
      maior: Math.max(...e.series.map((s) => s.kg)),
      soma: e.series.reduce((t, s) => t + s.kg, 0),
      ...(rms.length ? { rm: Math.round(Math.max(...rms) * 10) / 10 } : {}),
    };
  });
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const variacao = primeiro && ultimo && pontos.length > 1 ? ((ultimo.maior - primeiro.maior) / primeiro.maior) * 100 : null;

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-6 pb-7 text-white sm:px-8 sm:pt-10">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          <Link
            href="/atleta/evolucao"
            className="rotulo -ml-2 flex min-h-[40px] w-fit items-center gap-1.5 rounded-full px-2 text-white/60 transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Evolução
          </Link>
          <div>
            <p className="rotulo text-tartan">Histórico do exercício</p>
            <h1 className="font-display mt-1 text-4xl leading-[0.95] font-black break-words uppercase sm:text-6xl">
              {exercicio?.nome ?? (nome || "Exercício")}
            </h1>
          </div>
          {exercicio && (
            <dl className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
              {[
                { v: `${formatarNumero(exercicio.recordeKg)} kg`, r: "Recorde", d: dataCurta(exercicio.recordeData) },
                {
                  v: exercicio.melhor1RM ? `${formatarNumero(exercicio.melhor1RM)} kg` : "—",
                  r: "1RM estimado",
                  d: exercicio.melhor1RM ? undefined : "registre as reps",
                },
                {
                  v: String(exercicio.entradas.length),
                  r: exercicio.entradas.length === 1 ? "Treino" : "Treinos",
                  d: variacao !== null ? `${variacao >= 0 ? "+" : ""}${variacao.toFixed(0)}% desde o início` : undefined,
                },
              ].map((n) => (
                <div key={n.r} className="flex min-w-0 flex-col">
                  <dd className="font-display truncate text-3xl leading-none font-black tabular-nums sm:text-5xl">{n.v}</dd>
                  <dt className="rotulo mt-1 text-white/45">{n.r}</dt>
                  {n.d && <span className="tabular-data mt-0.5 text-[11px] text-sinal">{n.d}</span>}
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        {!exercicio ? (
          <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-cinza ring-1 ring-ash">
            Ainda não há cargas registradas nesse exercício. Assim que você lançar a primeira série, o histórico aparece
            aqui.
          </p>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-4 ring-1 ring-ash sm:p-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold uppercase">Maior carga por treino</h2>
                <p className="rotulo flex items-center gap-4 text-[10px] text-cinza">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="h-0.5 w-5 bg-tartan" /> carga
                  </span>
                  {pontos.some((p) => p.rm) && (
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="h-0 w-5 border-t-2 border-dashed border-ink" /> 1RM est.
                    </span>
                  )}
                </p>
              </div>
              {pontos.length > 1 ? (
                <GraficoExercicio pontos={pontos} />
              ) : (
                <p className="py-10 text-center text-sm text-cinza">
                  Só um treino registrado até agora — o gráfico aparece a partir do segundo.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Todos os registros</h2>
              <ol className="flex flex-col gap-2">
                {[...exercicio.entradas].reverse().map((e) => {
                  const maior = Math.max(...e.series.map((s) => s.kg));
                  const ehRecorde = maior === exercicio.recordeKg && e.data === exercicio.recordeData;
                  return (
                    <li key={`${e.data}-${e.planoId}-${e.sessionKey}`}>
                      <Link
                        href={`/atleta/treinos/${e.planoId}?sessao=${e.sessionKey}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white p-4 ring-1 ring-ash transition-colors hover:ring-ink/30"
                      >
                        <span className="tabular-data w-16 shrink-0 text-xs text-cinza">{dataCurta(e.data)}</span>
                        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                          {e.series.map((s) => (
                            <span key={s.serie} className="rounded-lg bg-bone px-2.5 py-1.5">
                              <span className="font-display text-lg leading-none font-extrabold tabular-nums">
                                {formatarNumero(s.kg)}
                              </span>
                              {s.reps ? <span className="text-xs text-cinza">×{s.reps}</span> : null}
                            </span>
                          ))}
                          <span className="rotulo self-center text-[10px] text-cinza">kg</span>
                        </span>
                        {ehRecorde && <span className="rotulo rounded-md bg-sinal px-2 py-1 text-[10px] text-ink">★ recorde</span>}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
