"use client";

import { useId, useState, useTransition } from "react";
import { alternarConclusao } from "@/lib/actions/conclusoes";
import { salvarFeedbackSessao } from "@/lib/actions/sessao";
import { dataCurta, hojeLocalIso } from "@/lib/datas";
import { compartilharResumo } from "@/lib/treino/compartilhar";
import type { FeedbackSessao } from "@/lib/treino/logs";
import type { RecenteSessao } from "@/lib/treino/historico";
import type { SessaoTela } from "@/lib/treino/montarSessoes";
import {
  formatarNumero,
  normalizarRotulo,
  registrosDoExercicio,
  tonelagemDaSessao,
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

const NOME_ESFORCO = ["", "Muito leve", "Leve", "Leve", "Moderado", "Moderado", "Puxado", "Puxado", "Muito puxado", "Quase no limite", "No limite"];

function Escala({
  rotulo,
  ajuda,
  de,
  ate,
  valor,
  onEscolher,
  opcional = false,
}: {
  rotulo: string;
  ajuda: string;
  de: number;
  ate: number;
  valor: number | null;
  onEscolher: (v: number | null) => void;
  opcional?: boolean;
}) {
  const opcoes = Array.from({ length: ate - de + 1 }, (_, i) => de + i);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="flex w-full items-baseline justify-between gap-3">
        <span className="rotulo text-ink">
          {rotulo}
          {opcional && <span className="text-cinza"> · opcional</span>}
        </span>
        <span className="text-xs text-cinza">{ajuda}</span>
      </legend>
      <div className="flex gap-1">
        {opcoes.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={valor === n}
            onClick={() => onEscolher(opcional && valor === n ? null : n)}
            className={`font-display h-11 min-w-0 flex-1 rounded-lg text-lg font-extrabold tabular-nums transition-colors ${
              valor === n ? "bg-ink text-white" : "bg-bone text-ink/60 hover:bg-ash"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Uma sessão do treino (um dia da semana ou um bloco de pista): o roteiro da
// planilha com os campos de registro embutidos, o resumo ao vivo e o
// fechamento (como foi o treino, resumo e compartilhar).
export function SessaoPainel({
  planoId,
  sessao,
  anterior,
  registros,
  concluida,
  recordes,
  recentes = {},
  leve = null,
  feedback,
  onRegistro,
  onConcluida,
  onFeedback,
}: {
  planoId: string;
  sessao: SessaoTela;
  // A mesma sessão na semana anterior, pra servir de referência de carga.
  anterior?: SessaoTela;
  registros: RegistroMapa;
  concluida: boolean;
  // Maior carga já lançada em cada exercício (chave = nome normalizado).
  recordes: Record<string, number>;
  // Últimos treinos de cada exercício, pra carga sugerida.
  recentes?: Record<string, RecenteSessao[]>;
  // Se for semana leve, o motivo (as sugestões de carga recuam um pouco).
  leve?: { motivo: string } | null;
  feedback?: FeedbackSessao;
  onRegistro: (itemIndex: number, serie: number, registro: RegistroExercicio | null) => void;
  onConcluida: (concluida: boolean) => void;
  onFeedback: (feedback: FeedbackSessao) => void;
}) {
  const [data, setData] = useState(() => {
    const hoje = hojeLocalIso();
    return sessao.data && sessao.data <= hoje ? sessao.data : hoje;
  });
  const [timer, setTimer] = useState<{ fim: number; total: number } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [erroConcluir, setErroConcluir] = useState("");
  const [fechando, setFechando] = useState(false);
  const [esforco, setEsforco] = useState<number | null>(feedback?.esforco ?? null);
  const [sono, setSono] = useState<number | null>(feedback?.sono ?? null);
  const [dor, setDor] = useState<number | null>(feedback?.dor ?? null);
  const [recordesDoDia, setRecordesDoDia] = useState<Record<string, number>>({});
  const [avisoCompartilhar, setAvisoCompartilhar] = useState("");
  const dataId = useId();

  const exercicios = sessao.roteiro.filter((i) => i.tipo === "exercicio");
  const comRegistro = exercicios.filter(
    (e) => Object.keys(registrosDoExercicio(registros, sessao.chave, e.unidade.itemIndex)).length > 0,
  ).length;
  const seriesFeitas = Object.keys(registros).filter((c) => c.startsWith(`${sessao.chave}:`)).length;
  const volume = volumeDaSessao(registros, sessao.chave);
  const tonelagem = tonelagemDaSessao(registros, sessao.chave);
  const volumeAnterior = anterior ? volumeDaSessao(registros, anterior.chave) : 0;
  const delta = volume > 0 && volumeAnterior > 0 ? ((volume - volumeAnterior) / volumeAnterior) * 100 : null;
  const textoDelta = delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs semana passada` : undefined;
  const listaRecordes = Object.entries(recordesDoDia);

  // Casa cada exercício com o de mesmo nome na semana anterior (pelo nome,
  // não pela posição: o treinador pode ter trocado a ordem).
  const indiceAnterior = new Map<string, number>();
  for (const item of anterior?.roteiro ?? []) {
    if (item.tipo === "exercicio") indiceAnterior.set(normalizarRotulo(item.unidade.rotulo), item.unidade.itemIndex);
  }

  // Numeração 01, 02... só dos exercícios (os textos do roteiro não contam).
  const ordemPorItem = new Map(exercicios.map((e, i) => [e.unidade.itemIndex, i + 1]));

  function desfazer() {
    setErroConcluir("");
    onConcluida(false); // otimista
    iniciar(async () => {
      const r = await alternarConclusao(planoId, sessao.chave, true);
      if ("erro" in r) {
        onConcluida(true);
        setErroConcluir(r.erro);
      }
    });
  }

  function concluir() {
    setErroConcluir("");
    setTimer(null);
    iniciar(async () => {
      const r = await alternarConclusao(planoId, sessao.chave, false);
      if ("erro" in r) {
        setErroConcluir(r.erro);
        return;
      }
      onConcluida(true);
      setFechando(false);
      if (esforco !== null) {
        // Se a parte de esforço ainda não estiver ligada no banco, o treino
        // fica concluído do mesmo jeito — só o esforço não é guardado.
        const f = await salvarFeedbackSessao(planoId, sessao.chave, esforco, sono, dor, data);
        if ("ok" in f) onFeedback({ esforco, sono, dor, data });
      }
    });
  }

  async function compartilhar() {
    setAvisoCompartilhar("");
    const numeros = [
      { valor: `${comRegistro}/${exercicios.length}`, rotulo: "Exercícios" },
      ...(volume > 0 ? [{ valor: formatarNumero(volume, 0), rotulo: "Kg somados" }] : []),
      ...(tonelagem > 0 ? [{ valor: formatarNumero(tonelagem, 0), rotulo: "Kg × reps" }] : []),
      ...(feedback ? [{ valor: `${feedback.esforco}/10`, rotulo: "Esforço" }] : []),
    ];
    const r = await compartilharResumo({
      titulo: sessao.titulo || sessao.rotulo,
      subtitulo: `${sessao.rotulo} · ${dataCurta(data)}`,
      numeros,
      recordes: listaRecordes.map(([nome, kg]) => `${nome} · ${formatarNumero(kg)} kg`),
    });
    if (r === "baixado") setAvisoCompartilhar("Imagem baixada — é só postar.");
  }

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
          {leve && !concluida && (
            <span className="rotulo rounded-full bg-sinal px-3 py-1.5 text-[10px] text-ink" title={leve.motivo}>
              Semana leve
            </span>
          )}
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
            destaque={tonelagem > 0 ? `${formatarNumero(tonelagem, 0)} kg × reps` : textoDelta}
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

      {leve && !concluida && (
        <p className="-mt-1 rounded-xl bg-sinal/35 px-4 py-2.5 text-xs text-ink">
          <strong className="font-semibold">{leve.motivo}.</strong> As cargas sugeridas hoje estão cerca de 10% mais
          leves.
        </p>
      )}

      {/* Roteiro */}
      <ul className="flex flex-col gap-2.5">
        {sessao.roteiro.map((item, i) => {
          if (item.tipo === "texto") {
            const bloco = item.bloco;
            if (bloco.tipo === "periodo") {
              return (
                <li key={i} className="mt-4 rounded-xl bg-ink px-4 py-2.5 first:mt-0">
                  <span className="rotulo text-tartan">{bloco.texto}</span>
                </li>
              );
            }
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
          const chaveNome = normalizarRotulo(unidade.rotulo);
          const idxAnterior = indiceAnterior.get(chaveNome);
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
              recorde={item.geral ? undefined : recordes[chaveNome]}
              recentes={
                item.geral
                  ? undefined
                  : (recentes[chaveNome] ?? [])
                      .filter((e) => !(e.planoId === planoId && e.sessionKey === sessao.chave))
                      .slice(-3)
              }
              leve={!!leve}
              hrefHistorico={item.geral ? undefined : `/atleta/exercicio?nome=${encodeURIComponent(unidade.rotulo)}`}
              onRegistro={(serie, registro) => onRegistro(unidade.itemIndex, serie, registro)}
              onSerieFeita={(seg) => setTimer({ fim: Date.now() + seg * 1000, total: seg })}
              onRecorde={(nome, kg) => setRecordesDoDia((atual) => ({ ...atual, [nome]: kg }))}
            />
          );
        })}
      </ul>

      {/* Registro "geral" antigo (índice 0) de quando essa planilha ainda não
          tinha exercícios reconhecidos: segue editável, pra não ficar preso. */}
      {!exercicios.some((e) => e.unidade.itemIndex === 0) &&
        Object.keys(registrosDoExercicio(registros, sessao.chave, 0)).length > 0 && (
          <ul>
            <ExercicioCard
              planoId={planoId}
              sessionKey={sessao.chave}
              ordem={exercicios.length + 1}
              unidade={{ itemIndex: 0, rotulo: "Registro geral da sessão" }}
              detalhe={[]}
              geral
              data={data}
              salvos={registrosDoExercicio(registros, sessao.chave, 0)}
              onRegistro={(serie, registro) => onRegistro(0, serie, registro)}
              onSerieFeita={() => {}}
            />
          </ul>
        )}

      {sessao.parametros && (
        <p className="tabular-data rounded-xl bg-white px-4 py-3 text-xs leading-relaxed whitespace-pre-line text-ink/70 ring-1 ring-ash">
          {sessao.parametros}
        </p>
      )}

      {/* Fechamento */}
      {concluida ? (
        <div className="raias animate-subir flex flex-col gap-5 overflow-hidden rounded-2xl bg-ink p-5 text-white sm:p-6">
          <div>
            <p className="rotulo text-ok">Treino concluído · {dataCurta(data)}</p>
            <p className="font-display mt-1 text-4xl leading-none font-black uppercase">Treino no bolso.</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {[
              { v: `${comRegistro}/${exercicios.length}`, r: "Exercícios" },
              { v: volume > 0 ? formatarNumero(volume, 0) : "—", r: "Kg somados", d: textoDelta },
              { v: tonelagem > 0 ? formatarNumero(tonelagem, 0) : "—", r: "Kg × reps" },
              { v: feedback ? `${feedback.esforco}/10` : "—", r: "Esforço", d: feedback ? NOME_ESFORCO[feedback.esforco] : undefined },
            ].map((n) => (
              <div key={n.r} className="flex min-w-0 flex-col">
                <dd className="font-display text-4xl leading-none font-black tabular-nums">{n.v}</dd>
                <dt className="rotulo mt-1 text-white/45">{n.r}</dt>
                {n.d && <span className="tabular-data mt-0.5 text-[11px] text-sinal">{n.d}</span>}
              </div>
            ))}
          </dl>

          {listaRecordes.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-xl bg-sinal p-4 text-ink">
              <li className="rotulo text-[10px]">★ {listaRecordes.length === 1 ? "Novo recorde" : "Novos recordes"}</li>
              {listaRecordes.map(([nome, kg]) => (
                <li key={nome} className="font-display text-xl leading-tight font-extrabold">
                  {nome} · {formatarNumero(kg)} kg
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={compartilhar}
              className="flex min-h-[52px] items-center gap-2 rounded-xl bg-tartan px-6 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-tartan-escuro"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M12 15V4M8 8l4-4 4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Compartilhar
            </button>
            <button
              type="button"
              onClick={desfazer}
              disabled={pendente}
              className="min-h-[52px] rounded-xl px-4 text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
            >
              Desfazer conclusão
            </button>
            <p aria-live="polite" className="text-xs text-white/60">
              {avisoCompartilhar || erroConcluir}
            </p>
          </div>
        </div>
      ) : fechando ? (
        <div className="animate-subir flex flex-col gap-5 rounded-2xl bg-white p-5 ring-2 ring-ink sm:p-6">
          <div>
            <p className="font-display text-3xl leading-none font-extrabold uppercase">Como foi?</p>
            <p className="mt-1 text-sm text-cinza">Seu treinador usa isso pra dosar a carga das próximas semanas.</p>
          </div>

          <Escala
            rotulo="Esforço"
            ajuda={esforco ? NOME_ESFORCO[esforco] : "1 = passeio · 10 = no limite"}
            de={1}
            ate={10}
            valor={esforco}
            onEscolher={setEsforco}
          />
          <Escala
            rotulo="Sono da última noite"
            ajuda="1 = péssimo · 5 = ótimo"
            de={1}
            ate={5}
            valor={sono}
            onEscolher={setSono}
            opcional
          />
          <Escala
            rotulo="Dor"
            ajuda="0 = nenhuma · 10 = insuportável"
            de={0}
            ate={10}
            valor={dor}
            onEscolher={setDor}
            opcional
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={concluir}
              disabled={pendente || esforco === null}
              className="min-h-[52px] flex-1 rounded-xl bg-tartan px-6 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-tartan-escuro disabled:opacity-40 sm:flex-none"
            >
              {pendente ? "Salvando…" : "Concluir treino"}
            </button>
            <button
              type="button"
              onClick={() => setFechando(false)}
              className="min-h-[52px] rounded-xl px-4 text-sm font-semibold text-cinza hover:text-ink"
            >
              Voltar
            </button>
            {esforco === null && <p className="text-xs text-cinza">Escolha o esforço para concluir.</p>}
            {erroConcluir && <p className="text-xs text-erro">{erroConcluir}</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-ash sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl leading-tight font-extrabold uppercase">Terminou?</p>
            <p className="text-sm text-cinza">Feche o treino — os registros já estão salvos.</p>
            {erroConcluir && <p className="mt-1 text-xs text-erro">{erroConcluir}</p>}
          </div>
          <button
            type="button"
            onClick={() => setFechando(true)}
            className="min-h-[52px] shrink-0 rounded-xl bg-tartan px-6 text-sm font-bold tracking-wide text-white uppercase transition-all hover:bg-tartan-escuro active:scale-[0.98]"
          >
            Concluir treino
          </button>
        </div>
      )}

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
