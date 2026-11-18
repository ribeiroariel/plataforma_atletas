import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parseTreino } from "@/lib/planilha/parseTreino";
import {
  gruposDaSemana,
  gruposDosBlocos,
  sessoesTreinaveis,
  type GrupoTela,
  type SessaoTela,
} from "@/lib/treino/montarSessoes";
import { formatarNumero } from "@/lib/treino/registros";
import { buscarProvas, diasAte, textoContagem } from "@/lib/treino/provas";
import { semanasSeguidas } from "@/lib/treino/sequencia";
import { escolherPlanoAtivo } from "@/lib/treinador/resumoAtletas";
import {
  dataCurta,
  diaDaSemanaLongo,
  diaDoMes,
  hojeBrasilIso,
  mesLongo,
  segundaDaSemana,
  tituloDoPlano,
} from "@/lib/datas";
import { FotoRotativa } from "@/components/ui/FotoRotativa";
import { Revelar } from "@/components/ui/Revelar";

type Plano = {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  data_criacao: string;
  data_inicio: string | null;
  modo_treino: string | null;
  numero_semanas: number | null;
};

const ROTULO_MODO: Record<string, string> = {
  semana: "Mesociclo",
  blocos: "Sessão de pista",
  generico: "Plano de treino",
};

function saudacao(): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(
      new Date(),
    ),
  );
  if (hora < 5) return "Boa madrugada";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function contarExercicios(sessao: SessaoTela): number {
  return sessao.roteiro.filter((i) => i.tipo === "exercicio").length;
}

function Seta() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function AtletaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nome")
    .eq("user_id", user?.id)
    .single();

  const hoje = hojeBrasilIso();
  const segunda = segundaDaSemana(hoje);

  const [{ data: planosBrutos }, { data: dadosSemana }, sequencia, { provas }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, nome_arquivo, arquivo_url, data_criacao, data_inicio, modo_treino, numero_semanas")
      .eq("athlete_id", athlete?.id ?? "")
      .order("data_criacao", { ascending: false }),
    supabase
      .from("training_data")
      .select("data, tipo, variavel, valor")
      .eq("athlete_id", athlete?.id ?? "")
      .gte("data", segunda),
    athlete?.id ? semanasSeguidas(supabase, athlete.id, hoje) : Promise.resolve(0),
    buscarProvas(supabase, athlete?.id ? [athlete.id] : []),
  ]);

  const proximaProva = provas.find((p) => p.data >= hoje);

  const planos = (planosBrutos ?? []) as Plano[];
  const ativo = escolherPlanoAtivo(planos, hoje);

  let grupos: GrupoTela[] | null = null;
  let concluidas = new Set<string>();

  if (ativo) {
    const [{ data: arquivo }, { data: conclusoes }] = await Promise.all([
      supabase.storage.from("training-plans").download(ativo.arquivo_url),
      supabase.from("training_completions").select("session_key").eq("training_plan_id", ativo.id),
    ]);
    concluidas = new Set((conclusoes ?? []).map((c) => c.session_key));
    if (arquivo) {
      try {
        const treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
        if (treino.tipo === "semana") grupos = gruposDaSemana(treino, ativo.data_inicio ?? ativo.data_criacao);
        else if (treino.tipo === "blocos") grupos = gruposDosBlocos(treino);
      } catch {
        grupos = null;
      }
    }
  }

  const treinaveis = grupos ? sessoesTreinaveis(grupos) : [];
  const feitasNoPlano = treinaveis.filter((s) => concluidas.has(s.chave)).length;
  const semanaAtual = grupos?.find((g) => g.sessoes.some((s) => s.data === hoje)) ?? null;
  const sessaoDeHoje = semanaAtual?.sessoes.find((s) => s.data === hoje) ?? null;
  const proxima = treinaveis.find((s) => !concluidas.has(s.chave)) ?? null;

  // O destaque: o treino de hoje se houver (e não for descanso); senão, o
  // próximo que ainda não foi feito.
  const hojeTemTreino = !!sessaoDeHoje && !sessaoDeHoje.descanso && sessaoDeHoje.roteiro.length > 0;
  const destaque = hojeTemTreino ? sessaoDeHoje : proxima;
  const destaqueFeito = !!destaque && concluidas.has(destaque.chave);

  const kgSemana = (dadosSemana ?? [])
    .filter((d) => d.tipo === "academia" && d.variavel === "volume_carga")
    .reduce((soma, d) => soma + Number(d.valor), 0);
  const kmSemana = (dadosSemana ?? [])
    .filter((d) => d.variavel === "distancia")
    .reduce((soma, d) => soma + Number(d.valor), 0);
  const treinaveisSemana = semanaAtual?.sessoes.filter((s) => !s.descanso && s.roteiro.length > 0) ?? [];
  const feitasSemana = treinaveisSemana.filter((s) => concluidas.has(s.chave)).length;

  const primeiroNome = (athlete?.nome ?? "atleta").split(" ")[0];
  const diaDoAno = Math.floor(new Date(`${hoje}T00:00:00Z`).getTime() / 86_400_000);
  const outros = planos.filter((p) => p.id !== ativo?.id);

  return (
    <div className="flex flex-1 flex-col bg-bone">
      {/* Abertura */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <FotoRotativa inicio={diaDoAno} alvoXLargo={0.72} sizes="(min-width: 768px) calc(100vw - 15rem), 100vw" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/30 md:bg-gradient-to-r md:from-ink md:via-ink/80 md:to-ink/10"
        />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pt-10 pb-8 sm:px-8 md:pt-16 md:pb-12">
          <div className="animate-subir">
            <p className="rotulo text-white/60">
              {diaDaSemanaLongo(hoje)} · {diaDoMes(hoje)} de {mesLongo(hoje)}
            </p>
            <h1 className="font-display mt-2 text-5xl leading-[0.92] font-black uppercase sm:text-7xl">
              {saudacao()},
              <br />
              <span className="text-tartan">{primeiroNome}.</span>
            </h1>
            {(sequencia > 1 || proximaProva) && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {sequencia > 1 && (
                  <li className="rotulo flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[10px] text-white backdrop-blur">
                    <span className="font-display text-lg leading-none font-extrabold text-sinal tabular-nums">{sequencia}</span>
                    semanas seguidas treinando
                  </li>
                )}
                {proximaProva && (
                  <li>
                    <Link
                      href="/atleta/provas"
                      className="rotulo flex items-center gap-2 rounded-full bg-tartan px-3 py-2 text-[10px] text-white transition-colors hover:bg-tartan-escuro"
                    >
                      {textoContagem(diasAte(proximaProva.data, hoje))} · {proximaProva.nome}
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Treino em destaque */}
          {ativo && destaque ? (
            <Link
              href={`/atleta/treinos/${ativo.id}?sessao=${destaque.chave}`}
              className="group animate-subir flex max-w-xl flex-col gap-4 rounded-2xl bg-white p-5 text-ink shadow-2xl shadow-black/30 transition-transform [animation-delay:120ms] hover:-translate-y-0.5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rotulo flex items-center gap-2 text-tartan">
                  {!destaqueFeito && hojeTemTreino && (
                    <span aria-hidden className="animate-pulsar h-2 w-2 rounded-full bg-tartan" />
                  )}
                  {hojeTemTreino ? (destaqueFeito ? "Treino de hoje · feito" : "Treino de hoje") : "Próximo treino"}
                </span>
                <span className="tabular-data text-xs text-cinza">
                  {destaque.rotulo}
                  {destaque.data ? ` · ${dataCurta(destaque.data)}` : ""}
                </span>
              </div>
              <div>
                <h2 className="font-display text-3xl leading-none font-extrabold break-words uppercase sm:text-4xl">
                  {destaque.titulo || destaque.rotulo}
                </h2>
                <p className="mt-2 text-sm text-cinza">
                  {contarExercicios(destaque)} {contarExercicios(destaque) === 1 ? "item" : "itens"} ·{" "}
                  {tituloDoPlano(ativo.nome_arquivo)}
                </p>
              </div>
              <span className="flex min-h-[52px] items-center justify-between rounded-xl bg-tartan px-5 text-sm font-bold tracking-wide text-white uppercase transition-colors group-hover:bg-tartan-escuro">
                {destaqueFeito ? "Rever registros" : "Abrir e registrar"}
                <span className="transition-transform group-hover:translate-x-1">
                  <Seta />
                </span>
              </span>
            </Link>
          ) : ativo ? (
            <Link
              href={`/atleta/treinos/${ativo.id}`}
              className="animate-subir flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-6 text-ink shadow-2xl shadow-black/30 [animation-delay:120ms]"
            >
              <span className="rotulo text-ok">{treinaveis.length > 0 ? "Plano completo" : "Seu plano"}</span>
              <h2 className="font-display text-3xl leading-none font-extrabold uppercase">
                {tituloDoPlano(ativo.nome_arquivo)}
              </h2>
              <p className="text-sm text-cinza">
                {treinaveis.length > 0
                  ? "Todos os treinos desse plano estão concluídos. Toque para rever."
                  : "Toque para abrir a planilha."}
              </p>
            </Link>
          ) : (
            <div className="animate-subir max-w-xl rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur [animation-delay:120ms]">
              <h2 className="font-display text-2xl font-extrabold uppercase">Nenhum treino por aqui ainda</h2>
              <p className="mt-1 text-sm text-white/70">
                Assim que seu treinador subir um plano, ele aparece nesta tela pronto pra registrar.
              </p>
            </div>
          )}

          {hojeTemTreino === false && sessaoDeHoje?.descanso && (
            <p className="rotulo -mt-4 text-sinal">Hoje é dia de descanso — recuperar também é treino.</p>
          )}
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-10">
        {/* Semana */}
        {ativo && semanaAtual && (
          <Revelar>
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold uppercase">Sua semana</h2>
                <p className="tabular-data text-xs text-cinza">
                  {semanaAtual.rotulo} · {feitasSemana}/{treinaveisSemana.length} feitos
                </p>
              </div>
              <div className="sem-barra -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
                {semanaAtual.sessoes.map((s) => {
                  const feito = concluidas.has(s.chave);
                  const ehHoje = s.data === hoje;
                  const abre = !s.descanso && s.roteiro.length > 0;
                  const corpo = (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="rotulo text-[10px] opacity-70">{s.rotuloCurto}</span>
                        {feito ? (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok text-white">
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden>
                              <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        ) : ehHoje ? (
                          <span className="rotulo text-[9px] text-tartan">hoje</span>
                        ) : null}
                      </div>
                      <span className="font-display text-3xl leading-none font-extrabold tabular-nums">
                        {s.data ? diaDoMes(s.data) : ""}
                      </span>
                      <span className="line-clamp-2 min-h-[2rem] text-xs leading-tight opacity-75">
                        {s.descanso ? "Descanso" : s.titulo}
                      </span>
                    </>
                  );
                  const base = `flex min-w-[6.5rem] shrink-0 flex-col gap-2 rounded-xl p-3 sm:min-w-0 ${
                    ehHoje ? "bg-ink text-white" : abre ? "bg-white text-ink ring-1 ring-ash" : "border border-dashed border-ash text-cinza"
                  }`;
                  return abre ? (
                    <Link
                      key={s.chave}
                      href={`/atleta/treinos/${ativo.id}?sessao=${s.chave}`}
                      className={`${base} transition-transform hover:-translate-y-0.5`}
                    >
                      {corpo}
                    </Link>
                  ) : (
                    <div key={s.chave} className={base}>
                      {corpo}
                    </div>
                  );
                })}
              </div>
            </section>
          </Revelar>
        )}

        {/* Números */}
        <Revelar>
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ash ring-1 ring-ash lg:grid-cols-4">
            {[
              {
                valor: treinaveisSemana.length ? `${feitasSemana}/${treinaveisSemana.length}` : "—",
                rotulo: "Treinos na semana",
              },
              { valor: kgSemana > 0 ? formatarNumero(kgSemana, 0) : "—", rotulo: "Kg somados na semana" },
              { valor: kmSemana > 0 ? formatarNumero(kmSemana) : "—", rotulo: "Km na semana" },
              {
                valor: treinaveis.length ? `${Math.round((feitasNoPlano / treinaveis.length) * 100)}%` : "—",
                rotulo: "Do plano concluído",
              },
            ].map((n) => (
              <div key={n.rotulo} className="flex flex-col gap-1 bg-white p-5">
                <span className="font-display text-4xl leading-none font-black tabular-nums sm:text-5xl">{n.valor}</span>
                <span className="rotulo text-cinza">{n.rotulo}</span>
              </div>
            ))}
          </section>
          <Link
            href="/atleta/evolucao"
            className="rotulo mt-3 inline-flex min-h-[40px] items-center gap-2 text-ink underline-offset-4 hover:underline"
          >
            Ver evolução completa <Seta />
          </Link>
        </Revelar>

        {/* Planos */}
        {planos.length > 0 && (
          <Revelar>
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Seus planos</h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[...(ativo ? [ativo] : []), ...outros].map((plano) => {
                  const atual = plano.id === ativo?.id;
                  return (
                    <li key={plano.id}>
                      <Link
                        href={`/atleta/treinos/${plano.id}`}
                        className="group flex h-full items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-ash transition-all hover:-translate-y-0.5 hover:ring-ink/30"
                      >
                        <div
                          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${
                            atual ? "bg-tartan text-white" : "bg-bone text-ink"
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
                          {atual && treinaveis.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ash">
                                <div
                                  className="h-full rounded-full bg-tartan"
                                  style={{ width: `${(feitasNoPlano / treinaveis.length) * 100}%` }}
                                />
                              </div>
                              <span className="tabular-data text-[11px] text-cinza">
                                {feitasNoPlano}/{treinaveis.length}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-cinza transition-all group-hover:translate-x-1 group-hover:text-ink">
                          <Seta />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Revelar>
        )}
      </div>
    </div>
  );
}
