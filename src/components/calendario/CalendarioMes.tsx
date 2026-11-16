import Link from "next/link";
import { dataCurta, diaDaSemanaLongo, diaDoMes, mesLongo, segundaDaSemana, somarDias } from "@/lib/datas";
import { ehTreino, mesVizinho, type Agenda, type SessaoAgenda } from "@/lib/treino/agenda";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function Chevron({ lado }: { lado: "esq" | "dir" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d={lado === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function diasDaGrade(mes: string): string[] {
  const primeiroDia = `${mes}-01`;
  const inicio = segundaDaSemana(primeiroDia);
  const fimMes = somarDias(`${mesVizinho(mes, 1)}-01`, -1);
  const fim = somarDias(segundaDaSemana(fimMes), 6);
  const dias: string[] = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) dias.push(d);
  return dias;
}

export function resumoDoMes(agenda: Agenda, mes: string): { total: number; feitos: number } {
  const doMes = diasDaGrade(mes)
    .filter((d) => d.startsWith(mes))
    .map((d) => agenda.porData.get(d))
    .filter(ehTreino);
  return {
    total: doMes.length,
    feitos: doMes.filter((s) => agenda.concluidos.has(`${s.planoId}:${s.sessionKey}`)).length,
  };
}

// Cabeçalho escuro com o mês e as setas — igual na agenda do atleta e no
// calendário do treinador.
export function CabecalhoMes({
  mes,
  sobretitulo,
  nota,
  hrefMes,
  voltar,
}: {
  mes: string;
  sobretitulo: string;
  nota: string;
  hrefMes: (mes?: string) => string;
  voltar?: { href: string; rotulo: string };
}) {
  return (
    <header className="raias bg-ink px-5 pt-6 pb-6 text-white sm:px-8 sm:pt-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        {voltar && (
          <Link
            href={voltar.href}
            className="rotulo -ml-2 flex min-h-[40px] w-fit items-center gap-1.5 rounded-full px-2 text-white/60 transition-colors hover:text-white"
          >
            <Chevron lado="esq" />
            {voltar.rotulo}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rotulo text-tartan">{sobretitulo}</p>
            <h1 className="font-display mt-1 text-5xl leading-none font-black uppercase sm:text-6xl">
              {mesLongo(`${mes}-01`)} <span className="text-white/35">{mes.slice(0, 4)}</span>
            </h1>
            <p className="tabular-data mt-2 text-xs text-white/55">{nota}</p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Trocar de mês">
            <Link
              href={hrefMes(mesVizinho(mes, -1))}
              aria-label="Mês anterior"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Chevron lado="esq" />
            </Link>
            <Link
              href={hrefMes()}
              className="rotulo flex h-11 items-center rounded-full bg-white/10 px-4 transition-colors hover:bg-white/20"
            >
              Hoje
            </Link>
            <Link
              href={hrefMes(mesVizinho(mes, 1))}
              aria-label="Próximo mês"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Chevron lado="dir" />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

// A grade do mês: cada dia com o treino previsto e uma barra de estado.
export function CalendarioMes({
  agenda,
  mes,
  hoje,
  hrefSessao,
}: {
  agenda: Agenda;
  mes: string;
  hoje: string;
  hrefSessao: (s: SessaoAgenda) => string;
}) {
  const dias = diasDaGrade(mes);

  return (
    <div className="flex flex-col gap-4">
      <section className="animate-subir overflow-hidden rounded-2xl bg-ash ring-1 ring-ash">
        <div className="grid grid-cols-7 gap-px">
          {DIAS.map((d) => (
            <div key={d} className="rotulo bg-white py-2 text-center text-[10px] text-cinza">
              {d}
            </div>
          ))}
          {dias.map((dia) => {
            const sessao = agenda.porData.get(dia);
            const foraDoMes = !dia.startsWith(mes);
            const ehHoje = dia === hoje;
            const chave = sessao ? `${sessao.planoId}:${sessao.sessionKey}` : "";
            const temTreino = ehTreino(sessao);
            const feito = temTreino && agenda.concluidos.has(chave);
            const parcial = temTreino && !feito && agenda.comRegistro.has(chave);
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
                  <span className="hidden text-[11px] leading-tight font-medium sm:line-clamp-2">{sessao.resumo.split("|")[0].trim()}</span>
                )}
                {sessao?.descanso && <span className="hidden text-[11px] text-cinza sm:block">Descanso</span>}
                {temTreino && (
                  <span
                    className={`mt-auto h-1.5 w-full rounded-full ${
                      feito ? "bg-ok" : parcial ? "bg-sinal" : perdido ? "bg-erro/60" : "bg-ink/25"
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
                href={hrefSessao(sessao)}
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

      <ul className="rotulo flex flex-wrap gap-x-5 gap-y-2 px-1 text-[10px] text-cinza">
        {[
          ["bg-ink/25", "Planejado"],
          ["bg-sinal", "Com registros"],
          ["bg-ok", "Concluído"],
          ["bg-erro/60", "Não feito"],
        ].map(([cor, nome]) => (
          <li key={nome} className="flex items-center gap-2">
            <span aria-hidden className={`h-1.5 w-5 rounded-full ${cor}`} />
            {nome}
          </li>
        ))}
      </ul>
    </div>
  );
}
