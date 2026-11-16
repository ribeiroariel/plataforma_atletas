import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilIso } from "@/lib/datas";
import { mesValido, montarAgenda } from "@/lib/treino/agenda";
import { CabecalhoMes, CalendarioMes, resumoDoMes } from "@/components/calendario/CalendarioMes";
import { EditarDataInicioPlano } from "@/components/treino/EditarDataInicioPlano";

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { id } = await params;
  const { mes: mesPedido } = await searchParams;
  const hoje = hojeBrasilIso();
  const mes = mesValido(mesPedido, hoje);

  const supabase = await createClient();

  const { data: atleta } = await supabase.from("athletes").select("id, nome").eq("id", id).single();
  if (!atleta) notFound();

  const agenda = await montarAgenda(supabase, id);
  const { total, feitos } = resumoDoMes(agenda, mes);
  const base = `/treinador/atletas/${id}`;

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <CabecalhoMes
        mes={mes}
        sobretitulo={`Calendário · ${atleta.nome}`}
        nota={total > 0 ? `${feitos} de ${total} treinos do mês concluídos` : "Sem treinos mapeados neste mês"}
        hrefMes={(m) => (m ? `${base}/calendario?mes=${m}` : `${base}/calendario`)}
        voltar={{ href: base, rotulo: atleta.nome }}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 py-6 sm:px-8 sm:py-8">
        <CalendarioMes
          agenda={agenda}
          mes={mes}
          hoje={hoje}
          hrefSessao={(s) => `${base}/treinos/${s.planoId}?sessao=${s.sessionKey}`}
        />

        {agenda.semanais.length > 0 ? (
          <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash sm:p-5">
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase">Início de cada plano</h2>
              <p className="mt-1 text-sm text-cinza">
                A data em que a Semana 1 começa de verdade. Mudar aqui reposiciona todos os dias do plano no calendário
                (do atleta também).
              </p>
            </div>
            <div className="flex flex-col divide-y divide-ash">
              {agenda.semanais.map((p) => (
                <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <EditarDataInicioPlano
                    trainingPlanId={p.id}
                    athleteId={id}
                    nomeArquivo={p.nome_arquivo}
                    dataInicioAtual={p.data_inicio ?? p.data_criacao}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
            Só planos em grade semanal aparecem no calendário — sessões de pista não têm dia fixo.
          </p>
        )}
      </div>
    </div>
  );
}
