import { createClient } from "@/lib/supabase/server";
import { buscarProgressoExercicios } from "@/lib/planilha/progressoExercicios";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";
import { ProgressoExercicios } from "@/components/evolucao/ProgressoExercicios";
import { RegistroTreinoForm } from "@/components/evolucao/RegistroTreinoForm";
import { formatarNumero } from "@/lib/treino/registros";

export default async function EvolucaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nome")
    .eq("user_id", user?.id)
    .single();

  const [{ data: dados }, progresso] = await Promise.all([
    supabase.from("training_data").select("data, tipo, variavel, valor").eq("athlete_id", athlete?.id ?? ""),
    athlete?.id ? buscarProgressoExercicios(supabase, athlete.id) : Promise.resolve([]),
  ]);

  const linhas = dados ?? [];
  const diasTreinados = new Set(linhas.map((l) => l.data)).size;
  const kgTotal = linhas
    .filter((l) => l.tipo === "academia" && l.variavel === "volume_carga")
    .reduce((soma, l) => soma + Number(l.valor), 0);
  const kmTotal = linhas.filter((l) => l.variavel === "distancia").reduce((soma, l) => soma + Number(l.valor), 0);

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-8 pb-7 text-white sm:px-8 sm:pt-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div>
            <p className="rotulo text-tartan">Evolução</p>
            <h1 className="font-display mt-1 text-5xl leading-none font-black uppercase sm:text-6xl">
              Tudo que você
              <br />
              já construiu.
            </h1>
          </div>
          <dl className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            {[
              { valor: diasTreinados ? String(diasTreinados) : "—", rotulo: "Dias com registro" },
              { valor: kgTotal > 0 ? formatarNumero(kgTotal, 0) : "—", rotulo: "Kg somados" },
              { valor: kmTotal > 0 ? formatarNumero(kmTotal) : "—", rotulo: "Km percorridos" },
            ].map((n) => (
              <div key={n.rotulo} className="flex min-w-0 flex-col-reverse gap-1">
                <dt className="rotulo text-white/45">{n.rotulo}</dt>
                <dd className="font-display truncate text-3xl leading-none font-black tabular-nums sm:text-5xl">{n.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <EvolucaoDashboard dados={linhas} />
        <ProgressoExercicios dados={progresso} />
        <RegistroTreinoForm />
      </div>
    </div>
  );
}
