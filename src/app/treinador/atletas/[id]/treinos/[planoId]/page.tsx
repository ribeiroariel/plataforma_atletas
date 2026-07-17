import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseTreino } from "@/lib/planilha/parseTreino";
import { TreinoExecutadoView } from "@/components/treino/TreinoExecutadoView";
import type { RegistroExercicio, RegistroMapa } from "@/components/treino/ExercicioRegistro";

function tituloLegivel(nomeArquivo: string) {
  return nomeArquivo
    .replace(/\.xlsx$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

// Visão do treinador sobre o que um atleta vinculado efetivamente executou
// num plano específico — somente leitura. As policies de RLS pra coach
// (training_plans/observations/exercise_logs "..._select_coach_linked") já
// existiam no schema antes desta tela; só faltava a UI.
export default async function TreinoExecutadoPage({
  params,
}: {
  params: Promise<{ id: string; planoId: string }>;
}) {
  const { id, planoId } = await params;
  const supabase = await createClient();

  const { data: atleta } = await supabase.from("athletes").select("id, nome").eq("id", id).single();
  if (!atleta) notFound();

  const { data: plano } = await supabase
    .from("training_plans")
    .select("id, athlete_id, nome_arquivo, arquivo_url, data_criacao")
    .eq("id", planoId)
    .eq("athlete_id", id)
    .single();
  if (!plano) notFound();

  const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);

  const { data: observacoes } = await supabase
    .from("observations")
    .select("id, texto, data")
    .eq("training_plan_id", plano.id)
    .order("data", { ascending: false });

  const { data: conclusoes } = await supabase
    .from("training_completions")
    .select("session_key")
    .eq("training_plan_id", plano.id);
  const concluidas = (conclusoes ?? []).map((c) => c.session_key);

  const { data: logs } = await supabase
    .from("exercise_logs")
    .select("session_key, item_index, metrica, valor, data")
    .eq("training_plan_id", plano.id);

  const registros: RegistroMapa = {};
  for (const l of logs ?? []) {
    registros[`${l.session_key}:${l.item_index}`] = {
      metrica: l.metrica as RegistroExercicio["metrica"],
      valor: Number(l.valor),
      data: l.data,
    };
  }

  const treino = arquivo ? parseTreino(Buffer.from(await arquivo.arrayBuffer())) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 bg-track-night px-6 py-10 text-white">
      <div>
        <Link href={`/treinador/atletas/${id}`} className="text-sm text-sky-split hover:underline">
          ← {atleta.nome}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{tituloLegivel(plano.nome_arquivo)}</h1>
      </div>

      {treino ? (
        <div className="rounded-[var(--radius-badge)] bg-lane-chalk p-4 sm:p-6">
          <TreinoExecutadoView treino={treino} concluidas={concluidas} registros={registros} />
        </div>
      ) : (
        <p className="rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane px-4 py-6 text-sm text-track-fog">
          Não foi possível carregar o conteúdo desse treino agora.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
        <h2 className="font-display text-lg font-semibold">Observações do atleta</h2>
        {observacoes && observacoes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {observacoes.map((obs) => (
              <li key={obs.id} className="text-sm text-white/80">
                <span className="tabular-data mr-2 text-xs text-track-fog">{obs.data}</span>
                {obs.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-track-fog">Sem observações ainda.</p>
        )}
      </section>
    </div>
  );
}
