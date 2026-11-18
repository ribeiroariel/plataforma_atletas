import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";
import { TabelaComparativa } from "@/components/evolucao/TabelaComparativa";
import { ProgressoExercicios } from "@/components/evolucao/ProgressoExercicios";
import { buscarProgressoExercicios } from "@/lib/planilha/progressoExercicios";
import { haQuanto, resumirAtletas } from "@/lib/treinador/resumoAtletas";
import { dataCurta, diaDoMes, hojeBrasilIso, tituloDoPlano } from "@/lib/datas";
import { formatarNumero } from "@/lib/treino/registros";
import { Anel, Avatar, LegendaEstados } from "@/components/treinador/pecas";
import { buscarRespostas } from "@/lib/treino/logs";
import { agruparMarcas, buscarMarcas, buscarProvas, diasAte, formatarMarca, textoContagem } from "@/lib/treino/provas";
import { Recado } from "@/components/treino/Recado";
import { BotaoDataInicio } from "@/components/treino/BotaoDataInicio";

const ROTULO_MODO: Record<string, string> = {
  semana: "Mesociclo",
  blocos: "Sessão de pista",
  generico: "Plano de treino",
};

const COR_DIA: Record<string, string> = {
  feito: "bg-ok text-white",
  parcial: "bg-sinal text-ink",
  perdido: "bg-white text-ink ring-1 ring-erro/50",
  planejado: "bg-white text-ink ring-1 ring-ash",
  descanso: "border border-dashed border-ash text-cinza",
  vazio: "border border-dashed border-ash text-cinza/60",
};

const NOTA_DIA: Record<string, string> = {
  feito: "Concluído",
  parcial: "Começou",
  perdido: "Não fez",
  planejado: "Planejado",
  descanso: "Descanso",
  vazio: "—",
};

function Seta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function AtletaDoTreinadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const hoje = hojeBrasilIso();

  const [{ atletas, recados }, { data: dados }, { data: conclusoes }] = await Promise.all([
    resumirAtletas(supabase, hoje, id),
    supabase.from("training_data").select("data, tipo, variavel, valor").eq("athlete_id", id),
    supabase.from("training_completions").select("training_plan_id").eq("athlete_id", id),
  ]);

  const atleta = atletas[0];
  if (!atleta) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [progressoExercicios, respostas, { provas }, marcas] = await Promise.all([
    buscarProgressoExercicios(supabase, atleta.id),
    buscarRespostas(supabase, recados.map((r) => r.id), user?.id),
    buscarProvas(supabase, [atleta.id]),
    buscarMarcas(supabase, [atleta.id]),
  ]);
  const proximasProvas = provas.filter((p) => p.data >= hoje);
  const melhoresMarcas = agruparMarcas(marcas);

  const conclusoesPorPlano = new Map<string, number>();
  for (const c of conclusoes ?? []) {
    conclusoesPorPlano.set(c.training_plan_id, (conclusoesPorPlano.get(c.training_plan_id) ?? 0) + 1);
  }
  const recadosPorPlano = new Map<string, number>();
  for (const r of recados) recadosPorPlano.set(r.planoId, (recadosPorPlano.get(r.planoId) ?? 0) + 1);

  const base = `/treinador/atletas/${id}`;

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-6 pb-7 text-white sm:px-8 sm:pt-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Link
            href="/treinador"
            className="rotulo -ml-2 flex min-h-[40px] w-fit items-center gap-1.5 rounded-full px-2 text-white/60 transition-colors hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Equipe
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar nome={atleta.nome} url={atleta.avatarUrl} tamanho={76} className="ring-2 ring-white/20" />
              <div className="min-w-0">
                <p className="rotulo text-tartan">
                  {atleta.ativo ? tituloDoPlano(atleta.ativo.nome_arquivo) : "Sem plano enviado"}
                </p>
                <h1 className="font-display mt-1 text-5xl leading-[0.92] font-black break-words uppercase sm:text-6xl">
                  {atleta.nome}
                </h1>
                <p className="tabular-data mt-2 text-xs text-white/55">Último registro {haQuanto(atleta.diasSemAtividade)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {atleta.ativo && (
                <Link
                  href={`${base}/treinos/${atleta.ativo.id}`}
                  className="flex min-h-[48px] items-center gap-2 rounded-full bg-tartan px-5 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-tartan-escuro"
                >
                  Ver execução <Seta />
                </Link>
              )}
              <Link
                href={`${base}/calendario`}
                className="flex min-h-[48px] items-center rounded-full border border-white/25 px-5 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-white hover:text-ink"
              >
                Calendário
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-8 sm:py-10">
        {atleta.alertas.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {atleta.alertas.map((al, i) => (
              <li
                key={i}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  al.grave ? "bg-erro text-white" : "bg-sinal/40 text-ink"
                }`}
              >
                {al.texto}
                {al.tipo === "mesociclo" && al.grave ? " — hora de montar o próximo" : ""}
              </li>
            ))}
          </ul>
        )}

        {/* Semana + adesão */}
        <section className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Esta semana</h2>
              <LegendaEstados />
            </div>
            <ol className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
              {atleta.semana.map((d) => {
                const corpo = (
                  <>
                    <span className="rotulo text-[10px] opacity-75">{d.rotuloCurto}</span>
                    <span className="font-display text-3xl leading-none font-extrabold tabular-nums">{diaDoMes(d.data)}</span>
                    <span className="line-clamp-2 min-h-[2rem] text-xs leading-tight opacity-85">{d.titulo || "Sem treino"}</span>
                    <span className="rotulo text-[9px] opacity-75">{NOTA_DIA[d.estado]}</span>
                  </>
                );
                const classe = `flex min-w-[6.5rem] shrink-0 flex-col gap-1.5 rounded-xl p-3 sm:min-w-0 ${COR_DIA[d.estado]} ${
                  d.data === hoje ? "outline outline-2 outline-offset-2 outline-ink" : ""
                }`;
                return (
                  <li key={d.data} className="contents">
                    {d.sessionKey && atleta.ativo ? (
                      <Link
                        href={`${base}/treinos/${atleta.ativo.id}?sessao=${d.sessionKey}`}
                        className={`${classe} transition-transform hover:-translate-y-0.5`}
                      >
                        {corpo}
                      </Link>
                    ) : (
                      <div className={classe}>{corpo}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-ash">
            <div className="flex items-center gap-4">
              <Anel fracao={atleta.totalPlano ? atleta.feitosPlano / atleta.totalPlano : 0} rotulo="do plano concluído" tamanho={84} />
              <div>
                <p className="font-display text-xl leading-tight font-extrabold uppercase">Plano atual</p>
                <p className="text-sm text-cinza">
                  {atleta.totalPlano
                    ? `${atleta.feitosPlano} de ${atleta.totalPlano} treinos concluídos`
                    : "Sem treinos mapeados"}
                </p>
                {atleta.diasRestantes !== null && atleta.diasRestantes > 0 && (
                  <p className="tabular-data mt-1 text-[11px] text-cinza">faltam {atleta.diasRestantes} dias</p>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-t border-ash pt-4">
              {[
                { v: atleta.planejadosSemana ? `${atleta.feitosSemana}/${atleta.planejadosSemana}` : "—", r: "Na semana" },
                { v: atleta.kgSemana > 0 ? formatarNumero(atleta.kgSemana, 0) : "—", r: "Kg na semana" },
                { v: atleta.kmSemana > 0 ? formatarNumero(atleta.kmSemana) : "—", r: "Km na semana" },
              ].map((n) => (
                <div key={n.r} className="flex flex-col-reverse">
                  <dt className="rotulo text-[9px] text-cinza">{n.r}</dt>
                  <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">{n.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Planos + recados */}
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">Planos</h2>
            {atleta.planos.length === 0 ? (
              <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
                Nenhum treino enviado para esse atleta ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {atleta.planos.map((plano) => {
                  const atual = plano.id === atleta.ativo?.id;
                  const feitas = conclusoesPorPlano.get(plano.id) ?? 0;
                  const nRecados = recadosPorPlano.get(plano.id) ?? 0;
                  return (
                    <li key={plano.id}>
                      <Link
                        href={`${base}/treinos/${plano.id}`}
                        className="group flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-ash transition-all hover:-translate-y-0.5 hover:ring-ink/30"
                      >
                        <div
                          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${
                            atual ? "bg-tartan text-white" : "bg-bone"
                          }`}
                        >
                          <span className="font-display text-2xl leading-none font-extrabold tabular-nums">
                            {diaDoMes(plano.data_inicio ?? plano.data_criacao)}
                          </span>
                          <span className="rotulo text-[9px] opacity-80">
                            {dataCurta(plano.data_inicio ?? plano.data_criacao).split(" ")[1]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="rotulo text-cinza">
                            {ROTULO_MODO[plano.modo_treino ?? "generico"] ?? "Plano de treino"}
                            {plano.numero_semanas ? ` · ${plano.numero_semanas} sem.` : ""}
                            {atual ? " · atual" : ""}
                          </p>
                          <p className="font-display mt-0.5 truncate text-xl leading-tight font-bold uppercase">
                            {tituloDoPlano(plano.nome_arquivo)}
                          </p>
                          <p className="tabular-data mt-1 text-[11px] text-cinza">
                            {feitas} sess{feitas === 1 ? "ão concluída" : "ões concluídas"}
                            {nRecados ? ` · ${nRecados} recado${nRecados > 1 ? "s" : ""}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-cinza transition-all group-hover:translate-x-1 group-hover:text-ink">
                          <Seta />
                        </span>
                      </Link>
                      {plano.modo_treino === "semana" && (
                        <div className="mt-2 pl-1">
                          <BotaoDataInicio
                            trainingPlanId={plano.id}
                            athleteId={atleta.id}
                            dataInicio={plano.data_inicio}
                            dataCriacao={plano.data_criacao}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">Recados do atleta</h2>
            {recados.length === 0 ? (
              <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
                Sem recados ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recados.slice(0, 12).map((r) => {
                  const plano = atleta.planos.find((p) => p.id === r.planoId);
                  return (
                    <Recado
                      key={r.id}
                      id={r.id}
                      texto={r.texto}
                      data={r.data}
                      autor={plano ? tituloDoPlano(plano.nome_arquivo) : undefined}
                      respostas={respostas[r.id] ?? []}
                      caminho={base}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {(proximasProvas.length > 0 || melhoresMarcas.length > 0) && (
          <section className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Próximas provas</h2>
              {proximasProvas.length === 0 ? (
                <p className="rounded-2xl bg-white px-5 py-6 text-center text-sm text-cinza ring-1 ring-ash">
                  Nenhuma prova marcada.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {proximasProvas.map((p) => (
                    <li key={p.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-ash">
                      <div className="min-w-0 flex-1">
                        <p className="font-display truncate text-xl leading-tight font-bold uppercase">{p.nome}</p>
                        <p className="tabular-data text-[11px] text-cinza">
                          {dataCurta(p.data)}
                          {p.local ? ` · ${p.local}` : ""}
                        </p>
                      </div>
                      <span className="rotulo shrink-0 rounded-full bg-ink px-3 py-1.5 text-[10px] text-white">
                        {textoContagem(diasAte(p.data, hoje))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Melhores marcas</h2>
              {melhoresMarcas.length === 0 ? (
                <p className="rounded-2xl bg-white px-5 py-6 text-center text-sm text-cinza ring-1 ring-ash">
                  Nenhuma marca registrada.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {melhoresMarcas.map((g) => (
                    <li key={`${g.prova}-${g.unidade}`} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-ash">
                      <span className="rotulo text-cinza">{g.prova}</span>
                      <span className="font-display text-3xl leading-none font-black tabular-nums">
                        {formatarMarca(g.melhor.valor, g.unidade)}
                      </span>
                      <span className="tabular-data mt-1 text-[11px] text-cinza">
                        {dataCurta(g.melhor.data)} {g.melhor.data.slice(0, 4)} · {g.marcas.length} {g.marcas.length === 1 ? "marca" : "marcas"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-extrabold uppercase">Evolução</h2>
          <EvolucaoDashboard dados={dados ?? []} />
          <ProgressoExercicios dados={progressoExercicios} />
          <TabelaComparativa dados={dados ?? []} />
        </section>
      </div>
    </div>
  );
}
