import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parseTreino } from "@/lib/planilha/parseTreino";
import { mapearSessoesParaCalendario, type SessaoDoDia } from "@/lib/planilha/calendario";
import {
  dataCurta,
  diaDaSemanaLongo,
  diaDoMes,
  hojeBrasilIso,
  mesLongo,
  segundaDaSemana,
  somarDias,
  tituloDoPlano,
} from "@/lib/datas";

type SessaoAgenda = SessaoDoDia & { planoId: string };

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function mesVizinho(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function Chevron({ lado }: { lado: "esq" | "dir" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d={lado === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesPedido } = await searchParams;
  const hoje = hojeBrasilIso();
  const mes = mesPedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesPedido) ? mesPedido : hoje.slice(0, 7);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase.from("athletes").select("id").eq("user_id", user?.id).single();
  const athleteId = athlete?.id ?? "";

  const [{ data: planos }, { data: conclusoes }, { data: logs }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, nome_arquivo, arquivo_url, data_criacao, data_inicio, modo_treino")
      .eq("athlete_id", athleteId)
      .order("data_criacao", { ascending: false }),
    supabase.from("training_completions").select("training_plan_id, session_key").eq("athlete_id", athleteId),
    supabase.from("exercise_logs").select("training_plan_id, session_key").eq("athlete_id", athleteId),
  ]);

  const concluidos = new Set((conclusoes ?? []).map((c) => `${c.training_plan_id}:${c.session_key}`));
  const comRegistro = new Set((logs ?? []).map((l) => `${l.training_plan_id}:${l.session_key}`));

  const semanais = (planos ?? []).filter((p) => p.modo_treino === "semana");
  const avulsos = (planos ?? []).filter((p) => p.modo_treino !== "semana");

  const mapeados = await Promise.all(
    semanais.map(async (plano) => {
      const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);
      if (!arquivo) return [];
      try {
        const treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
        if (treino.tipo !== "semana") return [];
        return mapearSessoesParaCalendario(treino, plano.data_inicio ?? plano.data_criacao).map((s) => ({
          ...s,
          planoId: plano.id,
        }));
      } catch {
        return [];
      }
    }),
  );

  // Dois planos podem cair no mesmo dia (um novo começando antes do antigo
  // terminar): fica valendo o mais recente, que vem primeiro na lista.
  const porData = new Map<string, SessaoAgenda>();
  for (const sessao of mapeados.flat()) {
    const atual = porData.get(sessao.data);
    if (!atual || (atual.descanso && !sessao.descanso)) porData.set(sessao.data, sessao);
  }

  const primeiroDia = `${mes}-01`;
  const inicioGrade = segundaDaSemana(primeiroDia);
  const fimMes = somarDias(`${mesVizinho(mes, 1)}-01`, -1);
  const totalDias = Math.ceil((Number(diaDoMes(fimMes)) + (new Date(`${primeiroDia}T00:00:00Z`).getUTCDay() + 6) % 7) / 7) * 7;
  const dias = Array.from({ length: totalDias }, (_, i) => somarDias(inicioGrade, i));

  const proximos = [...porData.values()]
    .filter((s) => !s.descanso && s.resumo && s.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);

  const doMes = dias.filter((d) => d.startsWith(mes)).map((d) => porData.get(d)).filter((s) => s && !s.descanso && s.resumo);
  const feitosNoMes = doMes.filter((s) => s && concluidos.has(`${s.planoId}:${s.sessionKey}`)).length;

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-8 pb-6 text-white sm:px-8 sm:pt-12">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rotulo text-tartan">Agenda</p>
            <h1 className="font-display mt-1 text-5xl leading-none font-black uppercase sm:text-6xl">
              {mesLongo(primeiroDia)} <span className="text-white/35">{mes.slice(0, 4)}</span>
            </h1>
            <p className="tabular-data mt-2 text-xs text-white/55">
              {doMes.length > 0 ? `${feitosNoMes} de ${doMes.length} treinos do mês concluídos` : "Sem treinos mapeados neste mês"}
            </p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Trocar de mês">
            <Link
              href={`/atleta/agenda?mes=${mesVizinho(mes, -1)}`}
              aria-label="Mês anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Chevron lado="esq" />
            </Link>
            <Link
              href="/atleta/agenda"
              className="rotulo flex h-11 items-center rounded-full bg-white/10 px-4 transition-colors hover:bg-white/20"
            >
              Hoje
            </Link>
            <Link
              href={`/atleta/agenda?mes=${mesVizinho(mes, 1)}`}
              aria-label="Próximo mês"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Chevron lado="dir" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 py-6 sm:px-8 sm:py-8">
        <section className="animate-subir overflow-hidden rounded-2xl bg-ash ring-1 ring-ash">
          <div className="grid grid-cols-7 gap-px">
            {DIAS.map((d) => (
              <div key={d} className="rotulo bg-white py-2 text-center text-[10px] text-cinza">
                {d}
              </div>
            ))}
            {dias.map((dia) => {
              const sessao = porData.get(dia);
              const foraDoMes = !dia.startsWith(mes);
              const ehHoje = dia === hoje;
              const chave = sessao ? `${sessao.planoId}:${sessao.sessionKey}` : "";
              const feito = !!sessao && concluidos.has(chave);
              const parcial = !!sessao && !feito && comRegistro.has(chave);
              const temTreino = !!sessao && !sessao.descanso && !!sessao.resumo;
              const perdido = temTreino && !feito && !parcial && dia < hoje;

              const corpo = (
                <>
                  <span
                    className={`font-display flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none font-extrabold tabular-nums ${
                      ehHoje ? "bg-tartan text-white" : ""
                    }`}
                  >
                    {diaDoMes(dia)}
                  </span>
                  {temTreino && (
                    <span className="hidden text-[11px] leading-tight font-medium sm:line-clamp-2">{sessao.resumo}</span>
                  )}
                  {sessao?.descanso && <span className="hidden text-[11px] text-cinza sm:block">Descanso</span>}
                  {temTreino && (
                    <span
                      className={`mt-auto h-1.5 w-full rounded-full ${
                        feito ? "bg-ok" : parcial ? "bg-sinal" : perdido ? "bg-ash" : "bg-tartan"
                      }`}
                    />
                  )}
                </>
              );
              const classe = `flex min-h-[4.25rem] flex-col items-center gap-1 p-1.5 sm:min-h-[6.5rem] sm:items-start sm:p-2.5 ${
                foraDoMes ? "bg-bone/70 text-cinza/50" : "bg-white text-ink"
              }`;

              return temTreino ? (
                <Link
                  key={dia}
                  href={`/atleta/treinos/${sessao.planoId}?sessao=${sessao.sessionKey}`}
                  aria-label={`${diaDaSemanaLongo(dia)}, ${dataCurta(dia)}: ${sessao.resumo}${feito ? " (concluído)" : ""}`}
                  className={`${classe} transition-colors hover:bg-bone`}
                >
                  {corpo}
                </Link>
              ) : (
                <div key={dia} className={classe}>
                  {corpo}
                </div>
              );
            })}
          </div>
        </section>

        <ul className="rotulo -mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1 text-cinza">
          {[
            ["bg-tartan", "Planejado"],
            ["bg-sinal", "Com registros"],
            ["bg-ok", "Concluído"],
            ["bg-ash", "Não feito"],
          ].map(([cor, nome]) => (
            <li key={nome} className="flex items-center gap-2">
              <span aria-hidden className={`h-1.5 w-5 rounded-full ${cor}`} />
              {nome}
            </li>
          ))}
        </ul>

        {proximos.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">Próximos treinos</h2>
            <ul className="flex flex-col gap-2">
              {proximos.map((s) => (
                <li key={`${s.planoId}:${s.sessionKey}`}>
                  <Link
                    href={`/atleta/treinos/${s.planoId}?sessao=${s.sessionKey}`}
                    className="group flex items-center gap-4 rounded-2xl bg-white p-3 pr-4 ring-1 ring-ash transition-all hover:-translate-y-0.5 hover:ring-ink/30"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${
                        s.data === hoje ? "bg-tartan text-white" : "bg-bone"
                      }`}
                    >
                      <span className="font-display text-2xl leading-none font-extrabold tabular-nums">{diaDoMes(s.data)}</span>
                      <span className="rotulo text-[9px] opacity-80">{s.diaLabel.slice(0, 3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="rotulo text-cinza">{s.data === hoje ? "Hoje" : diaDaSemanaLongo(s.data)}</p>
                      <p className="font-display truncate text-xl leading-tight font-bold uppercase">{s.resumo}</p>
                    </div>
                    <span className="text-cinza transition-transform group-hover:translate-x-1 group-hover:text-ink">
                      <Chevron lado="dir" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {avulsos.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">Sessões avulsas</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {avulsos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/atleta/treinos/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash transition-colors hover:ring-ink/30"
                  >
                    <div className="min-w-0">
                      <p className="rotulo text-cinza">{dataCurta(p.data_criacao)}</p>
                      <p className="font-display truncate text-lg leading-tight font-bold uppercase">
                        {tituloDoPlano(p.nome_arquivo)}
                      </p>
                    </div>
                    <span className="text-cinza">
                      <Chevron lado="dir" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(planos ?? []).length === 0 && (
          <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
            Nenhum plano ainda. Quando seu treinador subir um treino, os dias aparecem aqui.
          </p>
        )}
      </div>
    </div>
  );
}
