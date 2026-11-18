import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { haQuanto, resumirAtletas } from "@/lib/treinador/resumoAtletas";
import { dataCurta, diaDaSemanaLongo, diaDoMes, hojeBrasilIso, mesLongo, tituloDoPlano } from "@/lib/datas";
import { formatarNumero } from "@/lib/treino/registros";
import { GradeAtletas, type CartaoAtleta } from "@/components/treinador/GradeAtletas";
import { Avatar, LegendaEstados } from "@/components/treinador/pecas";
import { buscarProvas, diasAte, textoContagem } from "@/lib/treino/provas";

export default async function TreinadorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoje = hojeBrasilIso();

  const [{ data: profile }, { atletas, recados }] = await Promise.all([
    supabase.from("profiles").select("nome").eq("user_id", user?.id).single(),
    resumirAtletas(supabase, hoje),
  ]);

  const primeiroNome = (profile?.nome ?? "treinador").split(" ")[0];
  const planejados = atletas.reduce((s, a) => s + a.planejadosSemana, 0);
  const feitos = atletas.reduce((s, a) => s + a.feitosSemana, 0);
  const treinaramHoje = atletas.filter((a) => a.diasSemAtividade === 0).length;
  // Um aviso por atleta (o mais sério na frente), pra faixa não virar parede.
  const atencao = atletas
    .filter((a) => a.alertas.length > 0)
    .map((a) => {
      const ordenados = [...a.alertas].sort((x, y) => Number(y.grave) - Number(x.grave));
      return { atleta: a, grave: ordenados[0].grave, texto: ordenados[0].texto, outros: ordenados.length - 1 };
    })
    .sort((x, y) => Number(y.grave) - Number(x.grave));
  const porId = new Map(atletas.map((a) => [a.id, a]));
  const { provas } = await buscarProvas(supabase, atletas.map((a) => a.id));
  const proximasProvas = provas.filter((p) => p.data >= hoje).slice(0, 8);

  const cartoes: CartaoAtleta[] = atletas.map((a) => ({
    id: a.id,
    nome: a.nome,
    avatarUrl: a.avatarUrl,
    plano: a.ativo ? tituloDoPlano(a.ativo.nome_arquivo) : null,
    semana: a.semana,
    planejadosSemana: a.planejadosSemana,
    feitosSemana: a.feitosSemana,
    feitosPlano: a.feitosPlano,
    totalPlano: a.totalPlano,
    diasSemAtividade: a.diasSemAtividade,
    ultimaAtividade: haQuanto(a.diasSemAtividade),
    kgSemana: a.kgSemana > 0 ? formatarNumero(a.kgSemana, 0) : null,
    alertas: a.alertas,
  }));

  const numeros = [
    { valor: String(atletas.length), rotulo: atletas.length === 1 ? "Atleta" : "Atletas" },
    { valor: planejados ? `${feitos}/${planejados}` : "—", rotulo: "Treinos feitos na semana" },
    { valor: planejados ? `${Math.round((feitos / planejados) * 100)}%` : "—", rotulo: "Adesão da semana" },
    { valor: String(treinaramHoje), rotulo: "Registraram hoje" },
  ];

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-8 pb-7 text-white sm:px-8 sm:pt-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
          <div className="animate-subir">
            <p className="rotulo text-white/55">
              {diaDaSemanaLongo(hoje)} · {diaDoMes(hoje)} de {mesLongo(hoje)}
            </p>
            <h1 className="font-display mt-2 text-5xl leading-[0.92] font-black uppercase sm:text-7xl">
              Sua equipe,
              <br />
              <span className="text-tartan">{primeiroNome}.</span>
            </h1>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-5 lg:grid-cols-4">
            {numeros.map((n) => (
              <div key={n.rotulo} className="flex flex-col-reverse gap-1">
                <dt className="rotulo text-white/45">{n.rotulo}</dt>
                <dd className="font-display text-4xl leading-none font-black tabular-nums sm:text-5xl">{n.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-8 sm:py-10">
        {atletas.length === 0 ? (
          <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-cinza ring-1 ring-ash">
            Nenhum atleta vinculado ainda. Assim que um atleta for ligado à sua conta, ele aparece aqui.
          </p>
        ) : (
          <>
            {atencao.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-extrabold uppercase">Pede atenção</h2>
                  <span className="tabular-data text-xs text-cinza">
                    {atencao.length} atleta{atencao.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                  {atencao.map((al) => (
                    <li key={al.atleta.id} className="shrink-0">
                      <Link
                        href={`/treinador/atletas/${al.atleta.id}`}
                        className={`flex min-h-[52px] items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 text-sm transition-transform hover:-translate-y-0.5 ${
                          al.grave ? "bg-erro text-white" : "bg-white text-ink ring-1 ring-ash"
                        }`}
                      >
                        <Avatar nome={al.atleta.nome} url={al.atleta.avatarUrl} tamanho={40} />
                        <span className="flex flex-col leading-tight">
                          <span className="font-semibold">{al.atleta.nome.split(" ")[0]}</span>
                          <span className={`text-xs ${al.grave ? "text-white/85" : "text-cinza"}`}>
                            {al.texto}
                            {al.outros > 0 ? ` · +${al.outros}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold uppercase">Atletas</h2>
                <LegendaEstados />
              </div>
              <GradeAtletas atletas={cartoes} hoje={hoje} />
            </section>

            {proximasProvas.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="font-display text-2xl font-extrabold uppercase">Próximas provas</h2>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {proximasProvas.map((p) => {
                    const atleta = porId.get(p.athleteId);
                    const dias = diasAte(p.data, hoje);
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/treinador/atletas/${p.athleteId}`}
                          className="flex h-full items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash transition-colors hover:ring-ink/30"
                        >
                          <Avatar nome={atleta?.nome ?? "?"} url={atleta?.avatarUrl ?? null} tamanho={40} />
                          <div className="min-w-0 flex-1">
                            <p className="font-display truncate text-lg leading-tight font-bold uppercase">{p.nome}</p>
                            <p className="tabular-data truncate text-[11px] text-cinza">
                              {atleta?.nome.split(" ")[0]} · {dataCurta(p.data)}
                              {p.local ? ` · ${p.local}` : ""}
                            </p>
                          </div>
                          <span
                            className={`rotulo shrink-0 rounded-full px-3 py-1.5 text-[10px] ${
                              dias <= 7 ? "bg-tartan text-white" : "bg-bone text-ink"
                            }`}
                          >
                            {textoContagem(dias)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Últimos recados</h2>
              {recados.length === 0 ? (
                <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
                  Nenhum recado dos atletas ainda. Eles escrevem no fim da tela de cada treino.
                </p>
              ) : (
                <ul className="grid gap-2 lg:grid-cols-2">
                  {recados.map((r) => {
                    const atleta = porId.get(r.athleteId);
                    const plano = atleta?.planos.find((p) => p.id === r.planoId);
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/treinador/atletas/${r.athleteId}/treinos/${r.planoId}`}
                          className="flex h-full gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash transition-colors hover:ring-ink/30"
                        >
                          <Avatar nome={atleta?.nome ?? "?"} url={atleta?.avatarUrl ?? null} tamanho={36} />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                              <span className="font-semibold">{atleta?.nome ?? "Atleta"}</span>
                              <span className="tabular-data text-[11px] text-cinza">
                                {dataCurta(r.data)}
                                {plano ? ` · ${tituloDoPlano(plano.nome_arquivo)}` : ""}
                              </span>
                            </p>
                            <p className="mt-1 line-clamp-3 text-sm leading-relaxed break-words text-ink/80">{r.texto}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
