import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, diaDaSemanaLongo, diaDoMes, hojeBrasilIso, tituloDoPlano } from "@/lib/datas";
import { ehTreino, mesValido, montarAgenda } from "@/lib/treino/agenda";
import { CabecalhoMes, CalendarioMes, resumoDoMes } from "@/components/calendario/CalendarioMes";

function Seta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
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
  const mes = mesValido(mesPedido, hoje);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase.from("athletes").select("id").eq("user_id", user?.id).single();
  const agenda = await montarAgenda(supabase, athlete?.id ?? "");
  const { total, feitos } = resumoDoMes(agenda, mes);

  const proximos = [...agenda.porData.values()]
    .filter((s) => ehTreino(s) && s.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <CabecalhoMes
        mes={mes}
        sobretitulo="Agenda"
        nota={total > 0 ? `${feitos} de ${total} treinos do mês concluídos` : "Sem treinos mapeados neste mês"}
        hrefMes={(m) => (m ? `/atleta/agenda?mes=${m}` : "/atleta/agenda")}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 py-6 sm:px-8 sm:py-8">
        <CalendarioMes
          agenda={agenda}
          mes={mes}
          hoje={hoje}
          hrefSessao={(s) => `/atleta/treinos/${s.planoId}?sessao=${s.sessionKey}`}
        />

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
                      <p className="font-display truncate text-xl leading-tight font-bold uppercase">
                        {s.resumo.split("|")[0].trim()}
                      </p>
                    </div>
                    <span className="text-cinza transition-transform group-hover:translate-x-1 group-hover:text-ink">
                      <Seta />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {agenda.avulsos.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">Sessões avulsas</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {agenda.avulsos.map((p) => (
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
                      <Seta />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {agenda.planos.length === 0 && (
          <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
            Nenhum plano ainda. Quando seu treinador subir um treino, os dias aparecem aqui.
          </p>
        )}
      </div>
    </div>
  );
}
