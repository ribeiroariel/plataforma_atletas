import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GraficoComparativo } from "@/components/evolucao/GraficoComparativo";
import { haQuanto, resumirAtletas } from "@/lib/treinador/resumoAtletas";
import { hojeBrasilIso } from "@/lib/datas";
import { formatarNumero } from "@/lib/treino/registros";
import { Avatar, SemanaPontos } from "@/components/treinador/pecas";

export default async function CompararAtletasPage() {
  const supabase = await createClient();
  const hoje = hojeBrasilIso();

  const [{ atletas }, { data: dados }] = await Promise.all([
    resumirAtletas(supabase, hoje),
    supabase.from("training_data").select("athlete_id, data, tipo, variavel, valor"),
  ]);

  const atletasComDados = atletas.map((a) => ({
    id: a.id,
    nome: a.nome,
    linhas: (dados ?? []).filter((d) => d.athlete_id === a.id),
  }));

  // Do mais em dia pro menos em dia na semana; empate decide pelo plano.
  const ranking = [...atletas].sort((a, b) => {
    const fa = a.planejadosSemana ? a.feitosSemana / a.planejadosSemana : -1;
    const fb = b.planejadosSemana ? b.feitosSemana / b.planejadosSemana : -1;
    if (fb !== fa) return fb - fa;
    return (b.totalPlano ? b.feitosPlano / b.totalPlano : 0) - (a.totalPlano ? a.feitosPlano / a.totalPlano : 0);
  });

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-8 pb-7 text-white sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <p className="rotulo text-tartan">Comparar</p>
          <h1 className="font-display mt-1 text-5xl leading-[0.92] font-black uppercase sm:text-6xl">
            Lado a lado.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60">
            Quem está em dia nesta semana e como o volume de cada um vem andando ao longo do tempo.
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-8 sm:py-10">
        {atletas.length === 0 ? (
          <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-cinza ring-1 ring-ash">
            Nenhum atleta vinculado ainda para comparar.
          </p>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Esta semana</h2>
              <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-ash">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="rotulo text-[10px] text-cinza">
                      <th className="px-4 py-3 font-medium">Atleta</th>
                      <th className="w-44 px-3 py-3 font-medium">Semana</th>
                      <th className="px-3 py-3 text-right font-medium">Feitos</th>
                      <th className="px-3 py-3 text-right font-medium">Do plano</th>
                      <th className="px-3 py-3 text-right font-medium">Kg</th>
                      <th className="px-3 py-3 text-right font-medium">Km</th>
                      <th className="px-4 py-3 text-right font-medium">Último registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((a, i) => (
                      <tr key={a.id} className="border-t border-ash transition-colors hover:bg-bone/60">
                        <td className="px-4 py-3">
                          <Link href={`/treinador/atletas/${a.id}`} className="flex items-center gap-3">
                            <span className="font-display w-6 text-xl font-extrabold text-ink/20 tabular-nums">{i + 1}</span>
                            <Avatar nome={a.nome} url={a.avatarUrl} tamanho={36} />
                            <span className="font-semibold underline-offset-4 hover:underline">{a.nome}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <SemanaPontos dias={a.semana} hoje={hoje} />
                        </td>
                        <td className="font-display px-3 py-3 text-right text-xl font-extrabold tabular-nums">
                          {a.planejadosSemana ? `${a.feitosSemana}/${a.planejadosSemana}` : "—"}
                        </td>
                        <td className="font-display px-3 py-3 text-right text-xl font-extrabold tabular-nums">
                          {a.totalPlano ? `${Math.round((a.feitosPlano / a.totalPlano) * 100)}%` : "—"}
                        </td>
                        <td className="tabular-data px-3 py-3 text-right">
                          {a.kgSemana > 0 ? formatarNumero(a.kgSemana, 0) : "—"}
                        </td>
                        <td className="tabular-data px-3 py-3 text-right">
                          {a.kmSemana > 0 ? formatarNumero(a.kmSemana) : "—"}
                        </td>
                        <td className="tabular-data px-4 py-3 text-right text-xs text-cinza">
                          {haQuanto(a.diasSemAtividade)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Volume por semana</h2>
              <GraficoComparativo atletas={atletasComDados} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
