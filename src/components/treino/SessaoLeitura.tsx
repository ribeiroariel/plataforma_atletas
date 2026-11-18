import { dataCurta } from "@/lib/datas";
import type { FeedbackSessao } from "@/lib/treino/logs";
import type { SessaoTela } from "@/lib/treino/montarSessoes";
import { estimar1RM } from "@/lib/treino/rm";
import {
  formatarNumero,
  minutosParaPace,
  normalizarRotulo,
  registrosDaSessao,
  registrosDoExercicio,
  segundosTexto,
  volumeDaSessao,
  type RegistroExercicio,
  type RegistroMapa,
} from "@/lib/treino/registros";

function valorDoRegistro(r: RegistroExercicio): string {
  switch (r.metrica) {
    case "kg":
      return formatarNumero(r.valor);
    case "distancia":
      return `${formatarNumero(r.valor, 2)} km`;
    case "pace":
      return `${minutosParaPace(r.valor)} /km`;
    case "corporal":
      return `${r.valor} reps`;
    case "tempo":
      return r.valor < 2 ? `${segundosTexto(r.valor * 60)} s` : `${formatarNumero(r.valor)} min`;
  }
}

function somaKg(registros: Record<number, RegistroExercicio>): number {
  return Object.values(registros)
    .filter((r) => r.metrica === "kg")
    .reduce((s, r) => s + r.valor, 0);
}

// O que o atleta fez numa sessão, lado a lado com o que estava prescrito —
// versão somente leitura, pro treinador. Mostra cada série registrada e a
// diferença de carga em relação à semana anterior.
export function SessaoLeitura({
  sessao,
  anterior,
  registros,
  concluida,
  feedback,
}: {
  sessao: SessaoTela;
  anterior?: SessaoTela;
  registros: RegistroMapa;
  concluida: boolean;
  feedback?: FeedbackSessao;
}) {
  const exercicios = sessao.roteiro.filter((i) => i.tipo === "exercicio");
  const comRegistro = exercicios.filter(
    (e) => Object.keys(registrosDoExercicio(registros, sessao.chave, e.unidade.itemIndex)).length > 0,
  ).length;
  const daSessao = registrosDaSessao(registros, sessao.chave);
  const volume = volumeDaSessao(registros, sessao.chave);
  const volumeAnterior = anterior ? volumeDaSessao(registros, anterior.chave) : 0;
  const delta = volume > 0 && volumeAnterior > 0 ? ((volume - volumeAnterior) / volumeAnterior) * 100 : null;
  const datas = [...new Set(daSessao.map((r) => r.data))].sort();

  const indiceAnterior = new Map<string, number>();
  for (const item of anterior?.roteiro ?? []) {
    if (item.tipo === "exercicio") indiceAnterior.set(normalizarRotulo(item.unidade.rotulo), item.unidade.itemIndex);
  }
  const ordemPorItem = new Map(exercicios.map((e, i) => [e.unidade.itemIndex, i + 1]));

  // Registro "geral" antigo (índice 0) de quando a planilha ainda não tinha
  // exercícios reconhecidos: continua aparecendo, pra não sumir da vista.
  const geralAntigo = exercicios.some((e) => e.unidade.itemIndex === 0)
    ? []
    : Object.values(registrosDoExercicio(registros, sessao.chave, 0));

  return (
    <section className="animate-subir flex flex-col gap-4">
      <div className="raias overflow-hidden rounded-2xl bg-ink text-white">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <p className="rotulo text-tartan">
              {sessao.rotulo}
              {sessao.data ? ` · ${dataCurta(sessao.data)}` : ""}
              {sessao.nota ? <span className="text-white/50"> · {sessao.nota}</span> : null}
            </p>
            <h2 className="font-display mt-1 text-3xl leading-[1.05] font-extrabold break-words uppercase sm:text-4xl">
              {sessao.titulo || sessao.rotulo}
            </h2>
          </div>
          <span
            className={`rotulo rounded-full px-3 py-1.5 ${
              concluida ? "bg-ok text-white" : daSessao.length > 0 ? "bg-sinal text-ink" : "bg-white/10 text-white/60"
            }`}
          >
            {concluida ? "Concluído" : daSessao.length > 0 ? "Em andamento" : "Sem registro"}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-4 px-5 pb-5">
          {[
            { v: `${comRegistro}/${exercicios.length}`, r: "Exercícios" },
            { v: String(daSessao.length), r: "Registros" },
            {
              v: volume > 0 ? formatarNumero(volume, 0) : "—",
              r: "Kg somados",
              d: delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs semana anterior` : undefined,
            },
          ].map((n) => (
            <div key={n.r} className="flex min-w-0 flex-col">
              <dd className="font-display text-3xl leading-none font-extrabold tabular-nums">{n.v}</dd>
              <dt className="rotulo mt-1 text-white/45">{n.r}</dt>
              {n.d && <span className="tabular-data mt-0.5 text-[11px] text-sinal">{n.d}</span>}
            </div>
          ))}
        </dl>

        {feedback && (
          <p className="flex flex-wrap gap-x-5 gap-y-1 border-t border-white/10 px-5 py-3 text-sm">
            <span>
              <span className="rotulo mr-2 text-white/45">Esforço</span>
              <span className={`font-display text-xl font-extrabold ${feedback.esforco >= 9 ? "text-sinal" : ""}`}>
                {feedback.esforco}/10
              </span>
            </span>
            {feedback.sono !== null && (
              <span>
                <span className="rotulo mr-2 text-white/45">Sono</span>
                <span className="font-display text-xl font-extrabold">{feedback.sono}/5</span>
              </span>
            )}
            {feedback.dor !== null && (
              <span>
                <span className="rotulo mr-2 text-white/45">Dor</span>
                <span className={`font-display text-xl font-extrabold ${feedback.dor >= 6 ? "text-sinal" : ""}`}>
                  {feedback.dor}/10
                </span>
              </span>
            )}
          </p>
        )}

        {datas.length > 0 && (
          <p className="tabular-data border-t border-white/10 px-5 py-3 text-xs text-white/55">
            Registrado em {datas.map(dataCurta).join(", ")}
          </p>
        )}
      </div>

      {geralAntigo.length > 0 && (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-ash">
          <span className="rotulo mr-2 text-[10px] text-cinza">Registro geral da sessão</span>
          <span className="font-display text-lg font-extrabold tabular-nums">
            {geralAntigo.map((r) => `${valorDoRegistro(r)}${r.metrica === "kg" ? " kg" : ""}`).join(" · ")}
          </span>
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {sessao.roteiro.map((item, i) => {
          if (item.tipo === "texto") {
            const bloco = item.bloco;
            if (bloco.tipo === "subtitulo") {
              return (
                <li key={i} className="mt-3 flex items-center gap-3 first:mt-0">
                  <span className="rotulo text-ink">{bloco.texto}</span>
                  <span aria-hidden className="h-px flex-1 bg-ash" />
                </li>
              );
            }
            return (
              <li key={i} className="px-1 text-sm leading-relaxed text-ink/70">
                {bloco.texto}
              </li>
            );
          }

          const { unidade } = item;
          const feitos = registrosDoExercicio(registros, sessao.chave, unidade.itemIndex);
          const series = Object.keys(feitos)
            .map(Number)
            .sort((a, b) => a - b);
          const idxAnterior = indiceAnterior.get(normalizarRotulo(unidade.rotulo));
          const antes = anterior && idxAnterior !== undefined ? registrosDoExercicio(registros, anterior.chave, idxAnterior) : {};
          const kgAgora = somaKg(feitos);
          const kgAntes = somaKg(antes);
          const dif = kgAgora > 0 && kgAntes > 0 ? kgAgora - kgAntes : null;
          const ehCarga = series.some((s) => feitos[s].metrica === "kg");
          const ehTiro = series.length > 1 && series.every((s) => feitos[s].metrica === "tempo");
          const porSerie = ehCarga || ehTiro || series.some((s) => feitos[s].metrica === "corporal");
          const tempos = ehTiro ? series.map((s) => feitos[s].valor * 60) : [];
          const melhor1RM = series.reduce(
            (max, s) => (feitos[s].metrica === "kg" && feitos[s].reps ? Math.max(max, estimar1RM(feitos[s].valor, feitos[s].reps ?? 0)) : max),
            0,
          );
          const chips = item.detalhe
            .flatMap((l) => l.split(/\||,\s+/))
            .map((c) => c.trim())
            .filter(Boolean);

          return (
            <li
              key={i}
              className={`relative overflow-hidden rounded-2xl bg-white p-4 ring-1 sm:px-5 ${
                series.length > 0 ? "ring-ash" : "ring-ash/70"
              }`}
            >
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${series.length > 0 ? "bg-ok" : "bg-transparent"}`} />
              <div className="flex items-start gap-3">
                <span className="font-display w-8 shrink-0 text-3xl leading-none font-extrabold text-ink/15 tabular-nums">
                  {String(ordemPorItem.get(unidade.itemIndex) ?? 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl leading-tight font-bold break-words">
                    {item.geral ? "Registro geral da sessão" : unidade.rotulo}
                  </h3>
                  {chips.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {chips.map((chip, j) => (
                        <li
                          key={j}
                          className={`tabular-data rounded-md px-2 py-1 text-[11px] leading-tight ${
                            j === 0 ? "bg-ink text-white" : "bg-bone text-ink/70"
                          }`}
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  )}

                  {series.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {series.map((s) => (
                        <span key={s} className="flex items-baseline gap-1.5 rounded-lg bg-ok/10 px-2.5 py-1.5">
                          {porSerie && <span className="rotulo text-[9px] text-ok">{ehTiro ? "T" : "S"}{s}</span>}
                          <span className="font-display text-xl leading-none font-extrabold tabular-nums">
                            {valorDoRegistro(feitos[s])}
                            {feitos[s].reps ? <span className="text-sm text-ink/55">×{feitos[s].reps}</span> : null}
                          </span>
                        </span>
                      ))}
                      {ehCarga && <span className="rotulo ml-1 text-cinza">kg</span>}
                      {ehTiro && (
                        <span className="tabular-data ml-2 text-[11px] text-cinza">
                          melhor {segundosTexto(Math.min(...tempos))} s · média{" "}
                          {segundosTexto(tempos.reduce((t, v) => t + v, 0) / tempos.length)} s · queda{" "}
                          {tempos[tempos.length - 1] - tempos[0] >= 0 ? "+" : "−"}
                          {segundosTexto(Math.abs(tempos[tempos.length - 1] - tempos[0]))} s
                        </span>
                      )}
                      {melhor1RM > 0 && (
                        <span className="tabular-data ml-2 text-[11px] text-cinza">1RM est. {formatarNumero(melhor1RM)} kg</span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-cinza">Sem registro do atleta.</p>
                  )}
                </div>

                {dif !== null && (
                  <span
                    className={`tabular-data mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      dif > 0 ? "bg-ok text-white" : dif < 0 ? "bg-erro/10 text-erro" : "bg-bone text-cinza"
                    }`}
                    title="Soma das cargas contra a semana anterior"
                  >
                    {dif > 0 ? "▲ +" : dif < 0 ? "▼ " : "= "}
                    {formatarNumero(dif)} kg
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
