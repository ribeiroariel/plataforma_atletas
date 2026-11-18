import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buscarHistorico } from "@/lib/treino/historico";
import { dataCurta } from "@/lib/datas";
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
    athlete?.id ? buscarHistorico(supabase, athlete.id) : Promise.resolve([]),
  ]);

  // Mesmo dado, dois usos: os cartões de progresso (soma do dia) e a lista de recordes.
  const progressoCartoes = progresso.map((h) => ({
    exercicio: h.nome,
    pontos: h.entradas.map((e) => ({ data: e.data, valor: e.series.reduce((t, s) => t + s.kg, 0) })),
  }));
  const recordes = [...progresso].sort((a, b) => b.recordeData.localeCompare(a.recordeData));

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
        {recordes.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase">Recordes pessoais</h2>
              <p className="text-xs text-cinza">Toque num exercício para ver o histórico</p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recordes.map((h) => (
                <li key={h.chave}>
                  <Link
                    href={`/atleta/exercicio?nome=${encodeURIComponent(h.nome)}`}
                    className="group flex h-full items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash transition-all hover:-translate-y-0.5 hover:ring-ink/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" title={h.nome}>
                        {h.nome}
                      </p>
                      <p className="tabular-data text-[11px] text-cinza">
                        {dataCurta(h.recordeData)} · {h.entradas.length} {h.entradas.length === 1 ? "treino" : "treinos"}
                        {h.melhor1RM ? ` · 1RM est. ${formatarNumero(h.melhor1RM)} kg` : ""}
                      </p>
                    </div>
                    <p className="font-display shrink-0 text-3xl leading-none font-black tabular-nums">
                      {formatarNumero(h.recordeKg)}
                      <span className="text-sm text-cinza"> kg</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ProgressoExercicios dados={progressoCartoes} />
        <RegistroTreinoForm />
      </div>
    </div>
  );
}
