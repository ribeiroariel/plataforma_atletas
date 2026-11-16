"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { registrarExercicio, removerExercicio } from "@/lib/actions/exercicio";
import { numero, paceParaMinutos } from "@/lib/actions/valores";
import type { UnidadeRegistravel } from "@/lib/planilha/parseTreino";
import {
  metricaServidorParaOpcao,
  opcaoParaMetricaServidor,
  sugerirMetricas,
  type OpcaoMetrica,
} from "@/lib/planilha/sugerirMetrica";
import {
  detectarDescanso,
  detectarNumeroSeries,
  formatarNumero,
  rotuloOpcao,
  textoDoRegistro,
  unidadeOpcao,
  valorParaServidor,
  type RegistroExercicio,
} from "@/lib/treino/registros";

type Status = "idle" | "salvando" | "salvo" | "erro";

const DESCANSO_PADRAO = 90;

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Um exercício do treino com seus campos de registro. A instrução da
// planilha (séries, reps, descanso) fica junto do campo onde o atleta lança
// a carga — sem precisar rolar pra outra lista.
export function ExercicioCard({
  planoId,
  sessionKey,
  ordem,
  unidade,
  detalhe,
  geral,
  data,
  salvos,
  anterior,
  onRegistro,
  onSerieFeita,
}: {
  planoId: string;
  sessionKey: string;
  ordem: number;
  unidade: UnidadeRegistravel;
  detalhe: string[];
  geral: boolean;
  data: string;
  salvos: Record<number, RegistroExercicio>;
  // O que foi registrado nesse mesmo exercício na semana anterior.
  anterior?: Record<number, RegistroExercicio>;
  onRegistro: (serie: number, registro: RegistroExercicio | null) => void;
  onSerieFeita: (descansoSeg: number) => void;
}) {
  const sugestao = useMemo(() => sugerirMetricas(unidade.rotulo, unidade.detalhe), [unidade]);

  // A métrica de uma série já salva tem prioridade sobre a sugestão
  // automática (a planilha pode ter mudado depois do registro).
  const metricaJaSalva = Object.values(salvos)[0]?.metrica;
  const opcaoSalva = metricaJaSalva ? metricaServidorParaOpcao(metricaJaSalva, sugestao) : undefined;
  const opcoes = useMemo(
    () => (opcaoSalva && !sugestao.opcoes.includes(opcaoSalva) ? [opcaoSalva, ...sugestao.opcoes] : sugestao.opcoes),
    [sugestao, opcaoSalva],
  );

  const [opcao, setOpcao] = useState<OpcaoMetrica>(opcaoSalva ?? sugestao.opcoes[0]);
  const ehCarga = opcao === "kg";

  const seriesSalvas = Object.keys(salvos).map(Number).filter((n) => n > 0);
  const [numeroSeries, setNumeroSeries] = useState(() =>
    Math.max(seriesSalvas.length ? Math.max(...seriesSalvas) : 0, detectarNumeroSeries(unidade.detalhe), 1),
  );
  const series = ehCarga ? Array.from({ length: numeroSeries }, (_, i) => i + 1) : [1];

  const [textos, setTextos] = useState<Record<number, string>>(() => {
    const inicial: Record<number, string> = {};
    for (const [serie, registro] of Object.entries(salvos)) {
      inicial[Number(serie)] = textoDoRegistro(registro, opcaoSalva ?? sugestao.opcoes[0]);
    }
    return inicial;
  });
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [erro, setErro] = useState("");
  const [copiando, setCopiando] = useState(false);

  // Exercício ambíguo (aquecimento, educativo...) começa recolhido pra não
  // poluir a tela; os de carga ou tiro, e os que já têm registro, abertos.
  const [aberto, setAberto] = useState(sugestao.opcoes.length <= 2 || seriesSalvas.length > 0 || geral);

  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const ultimoSalvo = useRef<Record<number, string>>(
    Object.fromEntries(Object.entries(textos).map(([serie, texto]) => [serie, `${opcao}|${texto}`])),
  );
  const idBase = useId();

  useEffect(() => {
    const pendentes = timers.current;
    return () => Object.values(pendentes).forEach(clearTimeout);
  }, []);

  const descanso = detectarDescanso(unidade.detalhe) ?? DESCANSO_PADRAO;
  const cargasAnteriores = Object.entries(anterior ?? {})
    .filter(([, r]) => r.metrica === "kg")
    .sort(([a], [b]) => Number(a) - Number(b));
  const feitas = series.filter((s) => salvos[s]).length;
  const completo = feitas === series.length;

  function marcar(serie: number, novo: Status) {
    setStatus((atual) => ({ ...atual, [serie]: novo }));
  }

  async function remover(serie: number) {
    marcar(serie, "salvando");
    const r = await removerExercicio(planoId, sessionKey, unidade.itemIndex, serie);
    if ("erro" in r) {
      marcar(serie, "erro");
      setErro(r.erro);
      return;
    }
    delete ultimoSalvo.current[serie];
    setTextos((atual) => ({ ...atual, [serie]: "" }));
    marcar(serie, "idle");
    onRegistro(serie, null);
  }

  async function salvar(serie: number, texto: string, opcaoUsada: OpcaoMetrica = opcao) {
    clearTimeout(timers.current[serie]);
    const bruto = texto.trim();
    if (!bruto) {
      if (salvos[serie]) await remover(serie);
      return;
    }
    if (ultimoSalvo.current[serie] === `${opcaoUsada}|${bruto}`) return;

    setErro("");
    marcar(serie, "salvando");
    const metrica = opcaoParaMetricaServidor(opcaoUsada);
    const paraServidor = valorParaServidor(bruto, opcaoUsada);
    const r = await registrarExercicio(planoId, sessionKey, unidade.itemIndex, serie, metrica, paraServidor, data);

    if ("erro" in r) {
      marcar(serie, "erro");
      setErro(r.erro);
      return;
    }

    const jaExistia = !!salvos[serie];
    const valor = metrica === "pace" ? paceParaMinutos(bruto) : numero(paraServidor);
    ultimoSalvo.current[serie] = `${opcaoUsada}|${bruto}`;
    marcar(serie, "salvo");
    if (valor !== null) onRegistro(serie, { metrica, valor, data });
    if (opcaoUsada === "kg" && !jaExistia) onSerieFeita(descanso);
  }

  // Salva sozinho ~1s depois da última tecla: fechar o app no meio do treino
  // sem "sair" do campo não pode perder o que foi digitado.
  function digitar(serie: number, texto: string, espera = 1000) {
    setTextos((atual) => ({ ...atual, [serie]: texto }));
    if (status[serie] && status[serie] !== "idle") marcar(serie, "idle");
    clearTimeout(timers.current[serie]);
    timers.current[serie] = setTimeout(() => salvar(serie, texto), espera);
  }

  // Sugestão de carga pra série ainda vazia: a da semana passada ou, na
  // falta, a da série de cima.
  function sugestaoDaSerie(serie: number): string {
    if (!ehCarga) return "";
    const passada = anterior?.[serie];
    if (passada?.metrica === "kg") return String(passada.valor).replace(".", ",");
    for (let s = serie - 1; s >= 1; s--) {
      if (textos[s]?.trim()) return textos[s].trim();
    }
    // Série a mais do que na semana passada: parte da última carga de lá.
    const ultima = cargasAnteriores[cargasAnteriores.length - 1]?.[1];
    return ultima ? String(ultima.valor).replace(".", ",") : "";
  }

  function passo(serie: number, delta: number) {
    const base = numero(textos[serie] ?? "") ?? numero(sugestaoDaSerie(serie)) ?? 0;
    const partida = textos[serie]?.trim() ? base + delta : base || Math.max(0, delta);
    const novo = Math.max(0, Math.round(partida * 100) / 100);
    digitar(serie, String(novo).replace(".", ","), 700);
  }

  function confirmar(serie: number) {
    const atual = textos[serie]?.trim();
    const texto = atual || sugestaoDaSerie(serie);
    if (!texto) {
      document.getElementById(`${idBase}-${serie}`)?.focus();
      return;
    }
    if (!atual) setTextos((t) => ({ ...t, [serie]: texto }));
    void salvar(serie, texto);
  }

  async function repetirSemanaPassada() {
    setCopiando(true);
    if (cargasAnteriores.length > numeroSeries) setNumeroSeries(cargasAnteriores.length);
    for (const [chave, registro] of cargasAnteriores) {
      const serie = Number(chave);
      const texto = String(registro.valor).replace(".", ",");
      setTextos((t) => ({ ...t, [serie]: texto }));
      // Um por vez: salvar em paralelo embaralha a soma do volume do dia.
      await salvar(serie, texto, "kg");
    }
    setCopiando(false);
  }

  async function tirarUltimaSerie() {
    const ultima = numeroSeries;
    if (salvos[ultima]) await remover(ultima);
    setNumeroSeries((n) => Math.max(1, n - 1));
  }

  function trocarOpcao(nova: OpcaoMetrica) {
    setOpcao(nova);
    setTextos((atual) => {
      const convertido: Record<number, string> = {};
      for (const serie of Object.keys(atual)) {
        const registro = salvos[Number(serie)];
        convertido[Number(serie)] = registro ? textoDoRegistro(registro, nova) : "";
      }
      return convertido;
    });
  }

  const chips = detalhe
    .flatMap((linha) => linha.split(/\||,\s+/))
    .map((c) => c.trim())
    .filter(Boolean);

  if (!aberto) {
    return (
      <li className="flex items-center gap-3 rounded-xl border border-ash bg-white/60 py-2 pr-2 pl-4">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-cinza/50" />
        <span className="min-w-0 flex-1 text-sm leading-snug break-words text-ink/85">{unidade.rotulo}</span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-[40px] shrink-0 rounded-full px-3 text-xs font-semibold text-cinza transition-colors hover:bg-ash/60 hover:text-ink"
        >
          Registrar
        </button>
      </li>
    );
  }

  return (
    <li
      className={`relative overflow-hidden rounded-2xl border bg-white transition-colors ${
        completo ? "border-ok/40" : "border-ash"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 transition-colors ${completo ? "bg-ok" : feitas > 0 ? "bg-tartan" : "bg-transparent"}`}
      />

      <div className="flex items-start gap-3 px-4 pt-4 pb-3 sm:px-5">
        <span className="font-display w-8 shrink-0 text-3xl leading-none font-extrabold text-ink/15 tabular-nums">
          {String(ordem).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-xl leading-tight font-bold break-words text-ink">
            {unidade.rotulo}
          </h4>
          {chips.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((chip, i) => (
                <li
                  key={i}
                  className={`tabular-data rounded-md px-2 py-1 text-[11px] leading-tight ${
                    i === 0 ? "bg-ink text-white" : "bg-bone text-ink/70"
                  }`}
                >
                  {chip}
                </li>
              ))}
            </ul>
          )}
        </div>
        <span
          className={`tabular-data mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${
            completo ? "bg-ok text-white" : "bg-bone text-cinza"
          }`}
        >
          {completo ? <Check className="h-3 w-3" /> : null}
          {ehCarga ? `${feitas}/${series.length}` : completo ? "Feito" : "—"}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-ash/70 bg-bone/40 px-4 py-3 sm:px-5">
        {opcoes.length > 1 && (
          <div role="radiogroup" aria-label="O que registrar" className="sem-barra -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {opcoes.map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={opcao === o}
                onClick={() => trocarOpcao(o)}
                className={`min-h-[36px] shrink-0 rounded-full px-3 text-xs font-semibold transition-colors ${
                  opcao === o ? "bg-ink text-white" : "bg-white text-cinza ring-1 ring-ash hover:text-ink"
                }`}
              >
                {rotuloOpcao(o)}
              </button>
            ))}
          </div>
        )}

        {ehCarga && cargasAnteriores.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-ash">
            <p className="min-w-0 text-xs text-cinza">
              <span className="rotulo mr-2 text-[10px] text-ink/50">Semana passada</span>
              <span className="tabular-data text-ink">
                {cargasAnteriores.map(([, r]) => formatarNumero(r.valor)).join(" · ")} kg
              </span>
            </p>
            {feitas === 0 && (
              <button
                type="button"
                onClick={repetirSemanaPassada}
                disabled={copiando}
                className="min-h-[36px] shrink-0 rounded-full bg-ink px-3 text-xs font-semibold text-white transition-colors hover:bg-ink-3 disabled:opacity-50"
              >
                {copiando ? "Copiando…" : "Repetir"}
              </button>
            )}
          </div>
        )}

        {series.map((serie) => {
          const st = status[serie] ?? (salvos[serie] ? "salvo" : "idle");
          const texto = textos[serie] ?? "";
          const sugerido = sugestaoDaSerie(serie);
          const salvoOk = st === "salvo" && !!salvos[serie];
          return (
            <div key={serie} className="flex items-center gap-2">
              {ehCarga && (
                <span className="rotulo w-7 shrink-0 text-center text-cinza" aria-hidden>
                  S{serie}
                </span>
              )}

              <div
                className={`flex min-w-0 flex-1 items-center rounded-xl bg-white ring-1 transition-shadow focus-within:ring-2 focus-within:ring-ink ${
                  st === "erro" ? "ring-erro" : salvoOk ? "ring-ok/50" : "ring-ash"
                }`}
              >
                {ehCarga && (
                  <button
                    type="button"
                    onClick={() => passo(serie, -1)}
                    aria-label={`Série ${serie}: tirar 1 kg`}
                    className="flex h-12 w-11 shrink-0 items-center justify-center rounded-l-xl text-xl text-cinza transition-colors hover:bg-bone hover:text-ink active:bg-ash"
                  >
                    −
                  </button>
                )}
                <label htmlFor={`${idBase}-${serie}`} className="sr-only">
                  {ehCarga ? `Carga da série ${serie} em kg` : `${rotuloOpcao(opcao)} de ${unidade.rotulo}`}
                </label>
                <input
                  id={`${idBase}-${serie}`}
                  type="text"
                  inputMode={opcao === "pace" ? "text" : "decimal"}
                  autoComplete="off"
                  value={texto}
                  placeholder={sugerido || (opcao === "pace" ? "5:30" : opcao === "tempo_seg" ? "45" : "0")}
                  onChange={(e) => digitar(serie, e.target.value)}
                  onBlur={(e) => void salvar(serie, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={`font-display h-12 w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-ink/25 ${
                    ehCarga ? "text-center" : "px-4"
                  } text-ink`}
                />
                <span className="rotulo shrink-0 pr-1 text-cinza">{unidadeOpcao(opcao)}</span>
                {ehCarga && (
                  <button
                    type="button"
                    onClick={() => passo(serie, 1)}
                    aria-label={`Série ${serie}: somar 1 kg`}
                    className="flex h-12 w-11 shrink-0 items-center justify-center rounded-r-xl text-xl text-cinza transition-colors hover:bg-bone hover:text-ink active:bg-ash"
                  >
                    +
                  </button>
                )}
                {!ehCarga && <span className="w-3" aria-hidden />}
              </div>

              <button
                type="button"
                onClick={() => confirmar(serie)}
                disabled={st === "salvando"}
                aria-label={salvoOk ? `Série ${serie} registrada` : `Registrar série ${serie}`}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
                  salvoOk
                    ? "bg-ok text-white"
                    : st === "salvando"
                      ? "animate-pulsar bg-ink/70 text-white"
                      : texto.trim() || sugerido
                        ? "bg-tartan text-white hover:bg-tartan-escuro"
                        : "bg-white text-cinza/60 ring-1 ring-ash"
                }`}
              >
                <Check className={`h-5 w-5 ${salvoOk ? "animate-carimbo" : ""}`} />
              </button>
            </div>
          );
        })}

        <div className="flex min-h-[28px] items-center justify-between gap-3">
          {ehCarga ? (
            <div className="flex gap-4">
              {numeroSeries < 20 && (
                <button
                  type="button"
                  onClick={() => setNumeroSeries((n) => n + 1)}
                  className="py-1 text-xs font-semibold text-ink underline-offset-4 hover:underline"
                >
                  + Série
                </button>
              )}
              {numeroSeries > 1 && (
                <button
                  type="button"
                  onClick={tirarUltimaSerie}
                  className="py-1 text-xs font-medium text-cinza underline-offset-4 hover:underline"
                >
                  Tirar a última
                </button>
              )}
            </div>
          ) : (
            <span />
          )}
          <p aria-live="polite" className={`text-right text-xs ${erro ? "text-erro" : "text-cinza"}`}>
            {erro ||
              (Object.values(status).includes("salvando")
                ? "Salvando…"
                : feitas > 0
                  ? "Salvo automaticamente"
                  : "")}
          </p>
        </div>
      </div>
    </li>
  );
}
