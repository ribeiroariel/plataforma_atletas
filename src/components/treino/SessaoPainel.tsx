"use client";

import { useId, useState, useTransition } from "react";
import { alternarConclusao } from "@/lib/actions/conclusoes";
import { dataCurta, hojeLocalIso } from "@/lib/datas";
import type { SessaoTela } from "@/lib/treino/montarSessoes";
import {
  formatarNumero,
  normalizarRotulo,
  registrosDoExercicio,
  volumeDaSessao,
  type RegistroExercicio,
  type RegistroMapa,
} from "@/lib/treino/registros";
import { ExercicioCard } from "./ExercicioCard";
import { TimerDescanso } from "./TimerDescanso";

function Numero({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="font-display text-3xl leading-none font-extrabold text-white tabular-nums">{valor}</span>
      <span className="rotulo mt-1 text-white/45">{rotulo}</span>
      {destaque && <span className="tabular-data mt-0.5 text-[11px] text-sinal">{destaque}</span>}
    </div>
  );
}

// Uma sessão do treino (um dia da semana ou um bloco de pista): o roteiro da
// planilha com os campos de registro embutidos, o resumo ao vivo e o botão
// de concluir.
export function SessaoPainel({
  planoId,
  sessao,
  anterior,
  registros,
  concluida,
  onRegistro,
  onConcluida,
}: {
  planoId: string;
  sessao: SessaoTela;
  // A mesma sessão na semana anterior, pra servir de referência de carga.
  anterior?: SessaoTela;
  registros: RegistroMapa;
  concluida: boolean;
  onRegistro: (itemIndex: number, serie: number, registro: RegistroExercicio | null) => void;
  onConcluida: (concluida: boolean) => void;
}) {
  const [data, setData] = useState(() => {
    const hoje = hojeLocalIso();
    return sessao.data && sessao.data <= hoje ? sessao.data : hoje;
  });
  const [timer, setTimer] = useState<{ fim: number; total: number } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [erroConcluir, setErroConcluir] = useState("");
  const dataId = useId();

  const exercicios = sessao.roteiro.filter((i) => i.tipo === "exercicio");
  const comRegistro = exercicios.filter(
    (e) => Object.keys(registrosDoExercicio(registros, sessao.chave, e.unidade.itemIndex)).length > 0,
  ).length;
  const seriesFeitas = Object.keys(registros).filter((c) => c.startsWith(`${sessao.chave}:`)).length;
  const volume = volumeDaSessao(registros, sessao.chave);
  const volumeAnterior = anterior ? volumeDaSessao(registros, anterior.chave) : 0;
  const delta = volume > 0 && volumeAnterior > 0 ? ((volume - volumeAnterior) / volumeAnterior) * 100 : null;

  // Casa cada exercício com o de mesmo nome na semana anterior (pelo nome,
  // não pela posição: o treinador pode ter trocado a ordem).
  const indiceAnterior = new Map<string, number>();
  for (const item of anterior?.roteiro ?? []) {
    if (item.tipo === "exercicio") indiceAnterior.set(normalizarRotulo(item.unidade.rotulo), item.unidade.itemIndex);
  }

  function concluir() {
    setErroConcluir("");
    const estavaConcluida = concluida;
    onConcluida(!estavaConcluida); // otimista
    if (!estavaConcluida) setTimer(null);
    iniciar(async () => {
      const r = await alternarConclusao(planoId, sessao.chave, estavaConcluida);
      if ("erro" in r) {
        onConcluida(estavaConcluida);
        setErroConcluir(r.erro);
      } else {
        onConcluida(r.concluido);
      }
    });
  }

  // Numeração 01, 02... só dos exercícios (os textos do roteiro não contam).
  const ordemPorItem = new Map(exercicios.map((e, i) => [e.unidade.itemIndex, i + 1]));

  return (
    <section className="animate-subir flex flex-col gap-4">
      {/* Cabeçalho da sessão com o placar ao vivo */}
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
          {concluida && (
            <span className="animate-carimbo rotulo rounded-full bg-ok px-3 py-1.5 text-white">Concluído</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4 px-5">
          <Numero valor={`${comRegistro}/${exercicios.length}`} rotulo="Exercícios" />
          <Numero valor={String(seriesFeitas)} rotulo="Registros" />
          <Numero
            valor={volume > 0 ? formatarNumero(volume, 0) : "—"}
            rotulo="Kg somados"
            destaque={
              delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs semana passada` : undefined
            }
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3">
          <label htmlFor={dataId} className="rotulo text-white/45">
            Dia em que treinou
          </label>
          <input
            id={dataId}
            type="date"
            value={data}
            max={hojeLocalIso()}
            onChange={(e) => e.target.value && setData(e.target.value)}
            className="tabular-data min-h-[40px] rounded-lg bg-white/10 px-3 text-sm text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-tartan"
          />
        </div>
      </div>

      {/* Roteiro */}
      <ul className="flex flex-col gap-2.5">
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
            if (bloco.tipo === "total") {
              return (
                <li key={i} className="tabular-data w-fit rounded-md bg-sinal/30 px-2.5 py-1 text-xs font-medium text-ink">
                  {bloco.texto}
                </li>
              );
            }
            return (
              <li key={i} className="px-1 text-sm leading-relaxed text-ink/75">
                {bloco.texto}
              </li>
            );
          }

          const { unidade } = item;
          const idxAnterior = indiceAnterior.get(normalizarRotulo(unidade.rotulo));
          const registrosAnteriores =
            anterior && idxAnterior !== undefined
              ? registrosDoExercicio(registros, anterior.chave, idxAnterior)
              : undefined;

          return (
            <ExercicioCard
              key={`${sessao.chave}-${unidade.itemIndex}`}
              planoId={planoId}
              sessionKey={sessao.chave}
              ordem={ordemPorItem.get(unidade.itemIndex) ?? 1}
              unidade={item.geral ? { ...unidade, rotulo: "Como foi essa sessão?" } : unidade}
              detalhe={item.detalhe}
              geral={item.geral}
              data={data}
              salvos={registrosDoExercicio(registros, sessao.chave, unidade.itemIndex)}
              anterior={registrosAnteriores}
              onRegistro={(serie, registro) => onRegistro(unidade.itemIndex, serie, registro)}
              onSerieFeita={(seg) => setTimer({ fim: Date.now() + seg * 1000, total: seg })}
            />
          );
        })}
      </ul>

      {sessao.parametros && (
        <p className="tabular-data rounded-xl bg-white px-4 py-3 text-xs leading-relaxed whitespace-pre-line text-ink/70 ring-1 ring-ash">
          {sessao.parametros}
        </p>
      )}

      {/* Fechamento */}
      <div
        className={`flex flex-col gap-3 rounded-2xl p-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
          concluida ? "bg-ok text-white" : "bg-white ring-1 ring-ash"
        }`}
      >
        <div>
          <p className="font-display text-2xl leading-tight font-extrabold uppercase">
            {concluida ? "Treino no bolso." : "Terminou?"}
          </p>
          <p className={`text-sm ${concluida ? "text-white/85" : "text-cinza"}`}>
            {concluida
              ? volume > 0
                ? `${seriesFeitas} registros · ${formatarNumero(volume, 0)} kg somados. Seu treinador já consegue ver.`
                : "Marcado como feito. Seu treinador já consegue ver."
              : "Marque o treino como feito — os registros já estão salvos."}
          </p>
          {erroConcluir && <p className="mt-1 text-xs text-erro">{erroConcluir}</p>}
        </div>
        <button
          type="button"
          onClick={concluir}
          disabled={pendente}
          aria-pressed={concluida}
          className={`min-h-[52px] shrink-0 rounded-xl px-6 text-sm font-bold tracking-wide uppercase transition-all active:scale-[0.98] disabled:opacity-60 ${
            concluida ? "bg-white/15 text-white hover:bg-white/25" : "bg-tartan text-white hover:bg-tartan-escuro"
          }`}
        >
          {concluida ? "Desfazer" : "Concluir treino"}
        </button>
      </div>

      {timer && (
        <TimerDescanso
          key={timer.fim}
          fim={timer.fim}
          total={timer.total}
          onAjustar={(delta) =>
            setTimer((t) => (t ? { fim: t.fim + delta * 1000, total: Math.max(15, t.total + delta) } : t))
          }
          onFechar={() => setTimer(null)}
        />
      )}
    </section>
  );
}
