import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseTreino, type ModoSemana } from "@/lib/planilha/parseTreino";
import { mapearSessoesParaCalendario, type SessaoDoDia } from "@/lib/planilha/calendario";
import { EditarDataInicioPlano } from "@/components/treino/EditarDataInicioPlano";

const DIAS_SEMANA_CABECALHO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function primeiroDiaDoMes(mesIso: string): Date {
  return new Date(`${mesIso}-01T00:00:00Z`);
}

function somarMeses(mesIso: string, n: number): string {
  const d = primeiroDiaDoMes(mesIso);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

function tituloMes(mesIso: string): string {
  const d = primeiroDiaDoMes(mesIso);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Grade de semanas completas (segunda a domingo) cobrindo o mês inteiro,
// incluindo os dias de meses vizinhos que completam a primeira/última linha.
function gradeDoMes(mesIso: string): string[][] {
  const inicioMes = primeiroDiaDoMes(mesIso);
  const diaSemanaInicio = inicioMes.getUTCDay();
  const deslocamentoInicio = diaSemanaInicio === 0 ? -6 : 1 - diaSemanaInicio;
  const inicioGrade = new Date(inicioMes);
  inicioGrade.setUTCDate(inicioGrade.getUTCDate() + deslocamentoInicio);

  const fimMes = new Date(inicioMes);
  fimMes.setUTCMonth(fimMes.getUTCMonth() + 1);
  fimMes.setUTCDate(fimMes.getUTCDate() - 1);
  const diaSemanaFim = fimMes.getUTCDay();
  const deslocamentoFim = diaSemanaFim === 0 ? 0 : 7 - diaSemanaFim;
  const fimGrade = new Date(fimMes);
  fimGrade.setUTCDate(fimGrade.getUTCDate() + deslocamentoFim);

  const dias: string[] = [];
  const cursor = new Date(inicioGrade);
  while (cursor <= fimGrade) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const semanas: string[][] = [];
  for (let i = 0; i < dias.length; i += 7) {
    semanas.push(dias.slice(i, i + 7));
  }
  return semanas;
}

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { id } = await params;
  const { mes } = await searchParams;
  const mesAtual = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : new Date().toISOString().slice(0, 7);

  const supabase = await createClient();

  const { data: atleta } = await supabase.from("athletes").select("id, nome").eq("id", id).single();
  if (!atleta) notFound();

  const { data: planos } = await supabase
    .from("training_plans")
    .select("id, nome_arquivo, arquivo_url, data_criacao, data_inicio, modo_treino")
    .eq("athlete_id", id)
    .eq("modo_treino", "semana")
    .order("data_criacao", { ascending: true });

  const { data: conclusoes } = await supabase
    .from("training_completions")
    .select("training_plan_id, session_key")
    .eq("athlete_id", id);
  const concluidos = new Set((conclusoes ?? []).map((c) => `${c.training_plan_id}:${c.session_key}`));

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("training_plan_id, session_key")
    .eq("athlete_id", id);
  const comRegistro = new Set((logs ?? []).map((l) => `${l.training_plan_id}:${l.session_key}`));

  const sessoesPorData = new Map<string, (SessaoDoDia & { trainingPlanId: string })[]>();
  const planosSemanais: { id: string; nome_arquivo: string; dataInicio: string }[] = [];

  for (const plano of planos ?? []) {
    const dataInicio = plano.data_inicio ?? plano.data_criacao;
    planosSemanais.push({ id: plano.id, nome_arquivo: plano.nome_arquivo, dataInicio });

    const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);
    if (!arquivo) continue;

    // Um plano que o parser não consiga interpretar não pode derrubar o
    // calendário inteiro (todos os outros planos do atleta) — só pula esse.
    let treino;
    try {
      treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
    } catch (erro) {
      console.error(`Falha ao interpretar a planilha do plano ${plano.id} (${plano.nome_arquivo}):`, erro);
      continue;
    }
    if (treino.tipo !== "semana") continue;

    const sessoes = mapearSessoesParaCalendario(treino as ModoSemana, dataInicio);
    for (const s of sessoes) {
      const lista = sessoesPorData.get(s.data) ?? [];
      lista.push({ ...s, trainingPlanId: plano.id });
      sessoesPorData.set(s.data, lista);
    }
  }

  const semanas = gradeDoMes(mesAtual);
  const hojeIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-1 flex-col gap-6 bg-track-night px-6 py-10 text-white">
      <div>
        <Link href={`/treinador/atletas/${id}`} className="text-sm text-sky-split hover:underline">
          ← {atleta.nome}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Calendário de treinos</h1>
        <p className="mt-1 text-sm text-track-fog">
          Só planos em grade semanal aparecem aqui — sessões de pista (blocos) não têm dia da semana fixo.
        </p>
      </div>

      {planosSemanais.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
          <h2 className="text-xs font-semibold tracking-wide text-track-fog uppercase">
            Início da Semana 1 de cada plano
          </h2>
          {planosSemanais.map((p) => (
            <EditarDataInicioPlano
              key={p.id}
              trainingPlanId={p.id}
              athleteId={id}
              nomeArquivo={p.nome_arquivo}
              dataInicioAtual={p.dataInicio}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link
          href={`/treinador/atletas/${id}/calendario?mes=${somarMeses(mesAtual, -1)}`}
          className="rounded-[var(--radius-badge)] border border-white/20 bg-white px-3 py-1.5 text-sm font-medium text-track-night hover:bg-lane-chalk"
        >
          ← Mês anterior
        </Link>
        <h2 className="font-display text-lg font-semibold capitalize">{tituloMes(mesAtual)}</h2>
        <Link
          href={`/treinador/atletas/${id}/calendario?mes=${somarMeses(mesAtual, 1)}`}
          className="rounded-[var(--radius-badge)] border border-white/20 bg-white px-3 py-1.5 text-sm font-medium text-track-night hover:bg-lane-chalk"
        >
          Próximo mês →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-7 gap-1.5">
          {DIAS_SEMANA_CABECALHO.map((d) => (
            <div key={d} className="px-1 text-center text-xs font-semibold text-track-fog uppercase">
              {d}
            </div>
          ))}

          {semanas.flat().map((dataIso) => {
            const sessoesDoDia = sessoesPorData.get(dataIso) ?? [];
            const foraDoMes = !dataIso.startsWith(mesAtual);
            const ehHoje = dataIso === hojeIso;

            return (
              <div
                key={dataIso}
                className={`flex min-h-[92px] flex-col gap-1 rounded-[var(--radius-badge)] border p-1.5 text-xs ${
                  foraDoMes ? "border-white/5 bg-transparent opacity-40" : "border-white/10 bg-deep-lane"
                } ${ehHoje ? "ring-1 ring-stadium-blue" : ""}`}
              >
                <span className="tabular-data text-track-fog">{Number(dataIso.slice(8, 10))}</span>
                {sessoesDoDia.map((s) => {
                  if (s.descanso) return null;
                  const chave = `${s.trainingPlanId}:${s.sessionKey}`;
                  const concluido = concluidos.has(chave);
                  const registrado = comRegistro.has(chave);
                  return (
                    <Link
                      key={chave}
                      href={`/treinador/atletas/${id}/treinos/${s.trainingPlanId}`}
                      className={`truncate rounded px-1 py-0.5 leading-tight ${
                        concluido
                          ? "bg-stadium-blue/30 text-white"
                          : registrado
                            ? "border border-dashed border-sky-split/50 text-sky-split"
                            : "bg-white/5 text-track-fog"
                      }`}
                      title={`${s.diaLabel}: ${s.resumo || "Sessão de treino"}`}
                    >
                      {s.resumo || s.diaLabel}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-track-fog">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stadium-blue/60" /> Concluída
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-sky-split/50" /> Com registro
          parcial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" /> Planejada, sem registro
        </span>
      </div>
    </div>
  );
}
