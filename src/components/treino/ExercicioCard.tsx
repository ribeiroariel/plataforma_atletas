"use client";

import Link from "next/link";
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
  detectarReps,
  distanciaDoTiro,
  formatarNumero,
  rotuloOpcao,
  segundosTexto,
  textoDoRegistro,
  unidadeOpcao,
  valorParaServidor,
  type RegistroExercicio,
} from "@/lib/treino/registros";
import { descreverAnilhas, estimar1RM, montarBarra } from "@/lib/treino/rm";
import { repsAlvo, sugerirCarga, type EntradaRecente } from "@/lib/treino/sugestao";

type Status = "idle" | "salvando" | "salvo" | "erro";

const DESCANSO_PADRAO = 90;
const BARRAS = [20, 15, 10];

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden>
      <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Relogio({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4M9.5 3h5" strokeLinecap="round" />
    </svg>
  );
}

// Fora do componente de propósito: ler o relógio dentro dele confunde o
// verificador de código, que acha que é durante o desenho da tela.
function agoraMs(): number {
  return Date.now();
}

function kgTexto(kg: number): string {
  return String(Math.round(kg * 100) / 100).replace(".", ",");
}

function repsDoTexto(texto: string | undefined): number | null {
  const n = Number((texto ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
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
  recorde,
  recentes,
  leve = false,
  hrefHistorico,
  onRegistro,
  onSerieFeita,
  onRecorde,
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
  // Maior carga que o atleta já lançou nesse exercício (em qualquer plano).
  recorde?: number;
  // Treinos anteriores desse exercício (qualquer plano), do mais antigo pro
  // mais recente — base da carga sugerida.
  recentes?: EntradaRecente[];
  // Semana leve (pela planilha ou por esforço alto no último treino).
  leve?: boolean;
  hrefHistorico?: string;
  onRegistro: (serie: number, registro: RegistroExercicio | null) => void;
  onSerieFeita: (descansoSeg: number) => void;
  onRecorde?: (exercicio: string, kg: number) => void;
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
  const ehCorporal = opcao === "corporal";
  const ehTiro = opcao === "tempo_seg";
  // Carga, peso corporal e tiros são registrados um a um (série ou tiro).
  const porSerie = ehCarga || ehCorporal || ehTiro;
  // Botões − e + só fazem sentido pra carga e repetições.
  const comPassos = ehCarga || ehCorporal;
  const nomeSerie = ehTiro ? "Tiro" : "Série";

  const seriesSalvas = Object.keys(salvos).map(Number).filter((n) => n > 0);
  const [numeroSeries, setNumeroSeries] = useState(() =>
    Math.max(seriesSalvas.length ? Math.max(...seriesSalvas) : 0, detectarNumeroSeries(unidade.detalhe || unidade.rotulo), 1),
  );
  const series = porSerie ? Array.from({ length: numeroSeries }, (_, i) => i + 1) : [1];

  const [textos, setTextos] = useState<Record<number, string>>(() => {
    const inicial: Record<number, string> = {};
    for (const [serie, registro] of Object.entries(salvos)) {
      inicial[Number(serie)] = textoDoRegistro(registro, opcaoSalva ?? sugestao.opcoes[0]);
    }
    return inicial;
  });
  const [reps, setReps] = useState<Record<number, string>>(() => {
    const inicial: Record<number, string> = {};
    for (const [serie, registro] of Object.entries(salvos)) {
      if (registro.reps) inicial[Number(serie)] = String(registro.reps);
    }
    return inicial;
  });
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [erro, setErro] = useState("");
  const [copiando, setCopiando] = useState(false);
  const [recordeBatido, setRecordeBatido] = useState<number | null>(null);
  const [verAnilhas, setVerAnilhas] = useState(false);
  const [barra, setBarra] = useState(20);
  const [crono, setCrono] = useState<{ serie: number; inicio: number; agora: number } | null>(null);

  // Exercício ambíguo (aquecimento, educativo...) começa recolhido pra não
  // poluir a tela; os de carga ou tiro, e os que já têm registro, abertos.
  const [aberto, setAberto] = useState(sugestao.opcoes.length <= 2 || seriesSalvas.length > 0 || geral);

  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const ultimoSalvo = useRef<Record<number, string>>(
    Object.fromEntries(
      Object.entries(textos).map(([serie, texto]) => [serie, `${opcao}|${texto}|${reps[Number(serie)] ?? ""}`]),
    ),
  );
  const maiorCarga = useRef(recorde ?? 0);
  const idBase = useId();

  useEffect(() => {
    const pendentes = timers.current;
    return () => Object.values(pendentes).forEach(clearTimeout);
  }, []);

  // Cronômetro de tiro: enquanto roda, atualiza o mostrador.
  useEffect(() => {
    if (!crono) return;
    const id = setInterval(() => setCrono((c) => (c ? { ...c, agora: Date.now() } : c)), 100);
    return () => clearInterval(id);
  }, [crono?.inicio]); // eslint-disable-line react-hooks/exhaustive-deps

  const sugestaoCarga = useMemo(
    () =>
      recentes && recentes.length > 0
        ? sugerirCarga({ recentes, rotulo: unidade.rotulo, detalhe: unidade.detalhe, leve })
        : null,
    [recentes, unidade, leve],
  );

  // Tiros descansam mais por padrão (3 min) quando a planilha não diz.
  const descanso = detectarDescanso(unidade.detalhe || unidade.rotulo) ?? (ehTiro ? 180 : DESCANSO_PADRAO);
  const distancia = distanciaDoTiro(`${unidade.rotulo} ${unidade.detalhe ?? ""}`);
  const temposAnteriores = Object.entries(anterior ?? {})
    .filter(([, r]) => r.metrica === "tempo")
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, r]) => r.valor * 60);
  const temposHoje = series.filter((x) => salvos[x]?.metrica === "tempo").map((x) => salvos[x].valor * 60);
  const mediaDe = (lista: number[]) => (lista.length ? lista.reduce((t, v) => t + v, 0) / lista.length : 0);
  const repsPrescritas = detectarReps(unidade.detalhe);
  const repsAnteriores = Object.entries(anterior ?? {})
    .filter(([, r]) => r.metrica === "corporal")
    .sort(([a], [b]) => Number(a) - Number(b));
  const cargasAnteriores = Object.entries(anterior ?? {})
    .filter(([, r]) => r.metrica === "kg")
    .sort(([a], [b]) => Number(a) - Number(b));
  const feitas = series.filter((s) => salvos[s]).length;
  const completo = feitas === series.length;

  const melhor1RM = Object.values(salvos)
    .filter((r) => r.metrica === "kg" && r.reps)
    .reduce((max, r) => Math.max(max, estimar1RM(r.valor, r.reps ?? 0)), 0);
  const cargasMontaveis = series
    .map((s) => ({ serie: s, kg: numero(textos[s] ?? "") }))
    .filter((c): c is { serie: number; kg: number } => c.kg !== null && c.kg > 0);

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
    setReps((atual) => ({ ...atual, [serie]: "" }));
    marcar(serie, "idle");
    onRegistro(serie, null);
  }

  async function salvar(serie: number, texto: string, opcaoUsada: OpcaoMetrica = opcao, repsTexto = reps[serie] ?? "") {
    clearTimeout(timers.current[serie]);
    const bruto = texto.trim();
    if (!bruto) {
      if (salvos[serie]) await remover(serie);
      return;
    }
    const assinatura = `${opcaoUsada}|${bruto}|${repsTexto.trim()}`;
    if (ultimoSalvo.current[serie] === assinatura) return;

    setErro("");
    marcar(serie, "salvando");
    const metrica = opcaoParaMetricaServidor(opcaoUsada);
    const paraServidor = valorParaServidor(bruto, opcaoUsada);
    // undefined = não mexe nas reps; null = apaga as que estavam salvas.
    const nReps = repsDoTexto(repsTexto);
    const repsParaServidor =
      opcaoUsada !== "kg" ? undefined : nReps !== null ? nReps : salvos[serie]?.reps ? null : undefined;

    const r = await registrarExercicio(
      planoId,
      sessionKey,
      unidade.itemIndex,
      serie,
      metrica,
      paraServidor,
      data,
      repsParaServidor,
    );

    if ("erro" in r) {
      marcar(serie, "erro");
      setErro(r.erro);
      return;
    }

    const jaExistia = !!salvos[serie];
    const valor = metrica === "pace" ? paceParaMinutos(bruto) : numero(paraServidor);
    ultimoSalvo.current[serie] = assinatura;
    marcar(serie, "salvo");
    if (valor !== null) {
      onRegistro(serie, { metrica, valor, data, ...(nReps && opcaoUsada === "kg" ? { reps: nReps } : {}) });
      if (opcaoUsada === "kg" && maiorCarga.current > 0 && valor > maiorCarga.current) {
        setRecordeBatido(valor);
        onRecorde?.(unidade.rotulo, valor);
      }
      if (opcaoUsada === "kg") maiorCarga.current = Math.max(maiorCarga.current, valor);
    }
    if ((opcaoUsada === "kg" || opcaoUsada === "corporal" || opcaoUsada === "tempo_seg") && !jaExistia) {
      onSerieFeita(descanso);
    }
  }

  // Salva sozinho ~1s depois da última tecla: fechar o app no meio do treino
  // sem "sair" do campo não pode perder o que foi digitado.
  function digitar(serie: number, texto: string, espera = 1000) {
    setTextos((atual) => ({ ...atual, [serie]: texto }));
    if (status[serie] && status[serie] !== "idle") marcar(serie, "idle");
    clearTimeout(timers.current[serie]);
    timers.current[serie] = setTimeout(() => salvar(serie, texto), espera);
  }

  function digitarReps(serie: number, texto: string) {
    const limpo = texto.replace(/\D/g, "").slice(0, 3);
    setReps((atual) => ({ ...atual, [serie]: limpo }));
    if (status[serie] && status[serie] !== "idle") marcar(serie, "idle");
    clearTimeout(timers.current[serie]);
    const carga = textos[serie]?.trim();
    if (carga) timers.current[serie] = setTimeout(() => salvar(serie, carga, opcao, limpo), 1000);
  }

  // Sugestão de carga pra série ainda vazia: a da semana passada ou, na
  // falta, a da série de cima.
  function sugestaoDaSerie(serie: number): string {
    if (ehCorporal) {
      // Peso corporal: uma repetição a mais que na semana passada (ou ~20%
      // a menos numa semana leve).
      const passada = anterior?.[serie];
      if (passada?.metrica === "corporal") {
        return String(leve ? Math.max(1, Math.round(passada.valor * 0.8)) : Math.round(passada.valor) + 1);
      }
      for (let s = serie - 1; s >= 1; s--) {
        if (textos[s]?.trim()) return textos[s].trim();
      }
      // Sem histórico: as repetições que a planilha pede.
      const prescritas = repsAlvo(unidade.detalhe || unidade.rotulo);
      return prescritas ? String(prescritas) : "";
    }
    if (!ehCarga) return "";
    if (sugestaoCarga) {
      const lista = sugestaoCarga.porSerie;
      return kgTexto(lista[serie - 1] ?? lista[lista.length - 1]);
    }
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
      const repsTexto = registro.reps ? String(registro.reps) : "";
      setTextos((t) => ({ ...t, [serie]: texto }));
      if (repsTexto) setReps((r) => ({ ...r, [serie]: repsTexto }));
      // Um por vez: salvar em paralelo embaralha a soma do volume do dia.
      await salvar(serie, texto, "kg", repsTexto);
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
    setCrono(null);
    setTextos((atual) => {
      const convertido: Record<number, string> = {};
      for (const serie of Object.keys(atual)) {
        const registro = salvos[Number(serie)];
        convertido[Number(serie)] = registro ? textoDoRegistro(registro, nova) : "";
      }
      return convertido;
    });
  }

  // Cronômetro de tiro: um toque inicia, outro para e já grava o tempo
  // naquele tiro. Um tiro de cada vez.
  function alternarCrono(serie: number) {
    if (!crono) {
      const agora = agoraMs();
      setCrono({ serie, inicio: agora, agora });
      return;
    }
    if (crono.serie !== serie) return;
    const segundos = (agoraMs() - crono.inicio) / 1000;
    setCrono(null);
    const texto = segundos.toFixed(2).replace(".", ",");
    setTextos((t) => ({ ...t, [serie]: texto }));
    void salvar(serie, texto);
  }

  const chips = detalhe
    .flatMap((linha) => linha.split(/\||,\s+/))
    .map((c) => c.trim())
    .filter(Boolean);

  if (!aberto) {
    return (
      <li className="flex items-center gap-3 rounded-xl border border-ash bg-white/60 py-2 pr-2 pl-4">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-cinza/50" />
        <span className="min-w-0 flex-1 text-sm leading-snug break-words text-ink/85">
          {unidade.rotulo}
          {chips.length > 0 && <span className="text-cinza"> · {chips.join(" · ")}</span>}
        </span>
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
            {hrefHistorico ? (
              <Link href={hrefHistorico} className="underline-offset-4 hover:underline" title="Ver histórico desse exercício">
                {unidade.rotulo}
              </Link>
            ) : (
              unidade.rotulo
            )}
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
          {recordeBatido !== null ? (
            <p className="animate-carimbo rotulo mt-2 inline-flex items-center gap-1.5 rounded-md bg-sinal px-2 py-1 text-[10px] text-ink">
              ★ Novo recorde · {formatarNumero(recordeBatido)} kg
            </p>
          ) : recorde && ehCarga ? (
            <p className="tabular-data mt-2 text-[11px] text-cinza">Seu recorde: {formatarNumero(recorde)} kg</p>
          ) : null}
        </div>
        <span
          className={`tabular-data mt-0.5 flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${
            completo ? "bg-ok text-white" : "bg-bone text-cinza"
          }`}
        >
          {completo ? <Check className="h-3 w-3" /> : null}
          {porSerie ? `${feitas}/${series.length}` : completo ? "Feito" : "—"}
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
                {cargasAnteriores.map(([, r]) => `${formatarNumero(r.valor)}${r.reps ? `×${r.reps}` : ""}`).join(" · ")} kg
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

        {ehCarga && sugestaoCarga && feitas < series.length && (
          <div className="flex flex-col gap-1 rounded-xl bg-ink px-3 py-2.5 text-white">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className={`rotulo text-[10px] ${sugestaoCarga.leve ? "text-sinal" : "text-tartan"}`}>
                {sugestaoCarga.leve ? "Sugerido · semana leve" : "Sugerido hoje"}
              </span>
              <span className="font-display text-xl leading-none font-extrabold tabular-nums">
                {sugestaoCarga.porSerie.every((v) => v === sugestaoCarga.porSerie[0])
                  ? `${kgTexto(sugestaoCarga.topo)} kg`
                  : `${sugestaoCarga.porSerie.map(kgTexto).join(" · ")} kg`}
                {repsPrescritas ? <span className="text-sm text-white/60"> × {repsPrescritas}</span> : null}
              </span>
            </div>
            <p className="tabular-data text-[11px] leading-snug text-white/60">
              {sugestaoCarga.base === "rm" && sugestaoCarga.rm && sugestaoCarga.percentual
                ? `${Math.round(sugestaoCarga.percentual * 100)}% do 1RM estimado (${formatarNumero(sugestaoCarga.rm)} kg)`
                : `a partir da última carga (${formatarNumero(sugestaoCarga.ultimaTopo)} kg)`}
              {sugestaoCarga.ajuste > 0
                ? " · +2,5% de progressão"
                : sugestaoCarga.ajuste < 0
                  ? " · −10% de alívio"
                  : " · percentual da planilha"}
              {" · já está nos campos: toque no ✓ pra usar"}
            </p>
          </div>
        )}

        {ehCorporal && repsAnteriores.length > 0 && feitas === 0 && (
          <p className="rounded-xl bg-white px-3 py-2 text-xs text-cinza ring-1 ring-ash">
            <span className="rotulo mr-2 text-[10px] text-ink/50">Semana passada</span>
            <span className="tabular-data text-ink">{repsAnteriores.map(([, r]) => r.valor).join(" · ")} reps</span>
            <span> · {leve ? "semana leve: um pouco menos" : "meta de hoje: +1 rep por série"}</span>
          </p>
        )}

        {ehTiro && temposAnteriores.length > 0 && feitas === 0 && (
          <p className="rounded-xl bg-white px-3 py-2 text-xs text-cinza ring-1 ring-ash">
            <span className="rotulo mr-2 text-[10px] text-ink/50">Semana passada</span>
            <span className="tabular-data text-ink">{temposAnteriores.map(segundosTexto).join(" · ")} s</span>
            <span> · média {segundosTexto(mediaDe(temposAnteriores))} s</span>
          </p>
        )}

        {series.map((serie) => {
          const st = status[serie] ?? (salvos[serie] ? "salvo" : "idle");
          const texto = textos[serie] ?? "";
          const sugerido = sugestaoDaSerie(serie);
          const salvoOk = st === "salvo" && !!salvos[serie];
          const rodando = ehTiro && crono?.serie === serie;
          return (
            <div key={serie} className="flex items-center gap-1.5 sm:gap-2">
              {porSerie && (
                <span className="rotulo w-6 shrink-0 text-center text-cinza" aria-hidden>
                  {ehTiro ? "T" : "S"}
                  {serie}
                </span>
              )}

              <div
                className={`flex min-w-0 flex-1 items-center rounded-xl bg-white ring-1 transition-shadow focus-within:ring-2 focus-within:ring-ink ${
                  st === "erro" ? "ring-erro" : rodando ? "ring-2 ring-tartan" : salvoOk ? "ring-ok/50" : "ring-ash"
                }`}
              >
                {comPassos && (
                  <button
                    type="button"
                    onClick={() => passo(serie, -1)}
                    aria-label={`Série ${serie}: tirar 1 ${ehCorporal ? "repetição" : "kg"}`}
                    className="flex h-12 w-9 shrink-0 items-center justify-center rounded-l-xl text-xl text-cinza transition-colors hover:bg-bone hover:text-ink active:bg-ash sm:w-11"
                  >
                    −
                  </button>
                )}
                <label htmlFor={`${idBase}-${serie}`} className="sr-only">
                  {ehCarga
                    ? `Carga da série ${serie} em kg`
                    : ehCorporal
                      ? `Repetições da série ${serie}`
                      : ehTiro
                        ? `Tempo do tiro ${serie} em segundos`
                      : `${rotuloOpcao(opcao)} de ${unidade.rotulo}`}
                </label>
                <input
                  id={`${idBase}-${serie}`}
                  type="text"
                  inputMode={opcao === "pace" ? "text" : ehCorporal ? "numeric" : "decimal"}
                  autoComplete="off"
                  readOnly={rodando}
                  value={rodando && crono ? ((crono.agora - crono.inicio) / 1000).toFixed(1).replace(".", ",") : texto}
                  // Tiro não tem sugestão: o tempo tem que ser o de hoje.
                  placeholder={sugerido || (opcao === "pace" ? "5:30" : ehTiro ? "0,00" : "0")}
                  onChange={(e) => digitar(serie, e.target.value)}
                  onBlur={(e) => {
                    if (!rodando) void salvar(serie, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className={`font-display h-12 w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums outline-none placeholder:text-ink/25 ${
                    porSerie ? "text-center" : "px-4"
                  } text-ink`}
                />
                <span className="rotulo shrink-0 pr-1 text-cinza">{unidadeOpcao(opcao)}</span>
                {comPassos && (
                  <button
                    type="button"
                    onClick={() => passo(serie, 1)}
                    aria-label={`Série ${serie}: somar 1 ${ehCorporal ? "repetição" : "kg"}`}
                    className="flex h-12 w-9 shrink-0 items-center justify-center rounded-r-xl text-xl text-cinza transition-colors hover:bg-bone hover:text-ink active:bg-ash sm:w-11"
                  >
                    +
                  </button>
                )}
                {!comPassos && <span className="w-3" aria-hidden />}
              </div>

              {ehCarga && (
                <label
                  className={`flex h-12 w-[4.25rem] shrink-0 items-center rounded-xl bg-white pl-2 ring-1 transition-shadow focus-within:ring-2 focus-within:ring-ink ${
                    salvoOk && salvos[serie]?.reps ? "ring-ok/50" : "ring-ash"
                  }`}
                >
                  <span className="rotulo text-[10px] text-cinza" aria-hidden>
                    ×
                  </span>
                  <span className="sr-only">Repetições da série {serie}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={reps[serie] ?? ""}
                    placeholder={repsPrescritas || "reps"}
                    onChange={(e) => digitarReps(serie, e.target.value)}
                    onBlur={() => {
                      const carga = textos[serie]?.trim();
                      if (carga) void salvar(serie, carga);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="font-display h-12 w-full min-w-0 bg-transparent px-1 text-center text-xl font-bold tabular-nums text-ink outline-none placeholder:text-[11px] placeholder:font-normal placeholder:text-ink/30"
                  />
                </label>
              )}

              {ehTiro && (
                <button
                  type="button"
                  onClick={() => alternarCrono(serie)}
                  disabled={!!crono && !rodando}
                  aria-label={rodando ? `Parar o cronômetro e gravar o tiro ${serie}` : `Cronometrar o tiro ${serie}`}
                  className={`flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold tracking-wide uppercase transition-all active:scale-95 disabled:opacity-30 ${
                    rodando ? "animate-pulsar bg-ink text-white" : "bg-white text-ink ring-1 ring-ash hover:ring-ink/40"
                  }`}
                >
                  <Relogio className="h-4 w-4" />
                  {rodando ? "Parar" : "Iniciar"}
                </button>
              )}

              <button
                type="button"
                onClick={() => confirmar(serie)}
                disabled={st === "salvando" || rodando}
                aria-label={salvoOk ? `${nomeSerie} ${serie} registrado` : `Registrar ${nomeSerie.toLowerCase()} ${serie}`}
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

        {ehTiro && temposHoje.length > 0 && (
          <dl className="grid grid-cols-3 gap-2 rounded-xl bg-ink p-3 text-white">
            {(() => {
              const melhor = Math.min(...temposHoje);
              const media = mediaDe(temposHoje);
              const mediaAntes = mediaDe(temposAnteriores);
              const dif = temposAnteriores.length ? media - mediaAntes : null;
              const queda = temposHoje.length > 1 ? temposHoje[temposHoje.length - 1] - temposHoje[0] : null;
              return [
                { r: "Melhor", v: `${segundosTexto(melhor)} s`, d: distancia ? `${(distancia / melhor).toFixed(2).replace(".", ",")} m/s` : undefined },
                {
                  r: "Média",
                  v: `${segundosTexto(media)} s`,
                  d: dif !== null ? `${dif <= 0 ? "−" : "+"}${segundosTexto(Math.abs(dif))} s vs sem. passada` : undefined,
                  bom: dif !== null && dif <= 0,
                },
                {
                  r: "Queda",
                  v: queda !== null ? `${queda > 0 ? "+" : queda < 0 ? "−" : ""}${segundosTexto(Math.abs(queda))} s` : "—",
                  d: queda !== null ? "do 1º ao último tiro" : "precisa de 2 tiros",
                },
              ].map((n) => (
                <div key={n.r} className="flex min-w-0 flex-col">
                  <dd className="font-display truncate text-xl leading-none font-extrabold tabular-nums">{n.v}</dd>
                  <dt className="rotulo mt-1 text-[9px] text-white/45">{n.r}</dt>
                  {n.d && (
                    <span className={`tabular-data mt-0.5 text-[10px] ${"bom" in n ? (n.bom ? "text-ok" : "text-sinal") : "text-white/50"}`}>
                      {n.d}
                    </span>
                  )}
                </div>
              ));
            })()}
          </dl>
        )}

        {ehCarga && verAnilhas && (
          <div className="flex flex-col gap-2 rounded-xl bg-white px-3 py-3 ring-1 ring-ash">
            <div className="flex items-center justify-between gap-3">
              <span className="rotulo text-[10px] text-ink/60">Anilhas de cada lado</span>
              <div role="radiogroup" aria-label="Peso da barra" className="flex gap-1">
                {BARRAS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    role="radio"
                    aria-checked={barra === b}
                    onClick={() => setBarra(b)}
                    className={`tabular-data h-8 rounded-full px-2.5 text-[11px] transition-colors ${
                      barra === b ? "bg-ink text-white" : "bg-bone text-cinza hover:text-ink"
                    }`}
                  >
                    barra {b}
                  </button>
                ))}
              </div>
            </div>
            {cargasMontaveis.length === 0 ? (
              <p className="text-xs text-cinza">Digite a carga de uma série para ver a montagem.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {cargasMontaveis.map(({ serie, kg }) => {
                  const m = montarBarra(kg, barra);
                  return (
                    <li key={serie} className="flex items-baseline gap-2 text-sm">
                      <span className="rotulo w-6 text-[10px] text-cinza">S{serie}</span>
                      <span className="tabular-data w-16 text-ink/70">{formatarNumero(kg)} kg</span>
                      <span className="font-display text-lg leading-none font-bold tabular-nums">
                        {kg < barra ? "menos que a barra" : descreverAnilhas(m.porLado)}
                      </span>
                      {m.sobra > 0 && (
                        <span className="tabular-data text-[11px] text-erro">faltam {formatarNumero(m.sobra, 2)} kg</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {porSerie ? (
            <div className="flex flex-wrap gap-x-4">
              {numeroSeries < 20 && (
                <button
                  type="button"
                  onClick={() => setNumeroSeries((n) => n + 1)}
                  className="py-1 text-xs font-semibold text-ink underline-offset-4 hover:underline"
                >
                  + {nomeSerie}
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
              {ehCarga && (
              <button
                type="button"
                onClick={() => setVerAnilhas((v) => !v)}
                aria-expanded={verAnilhas}
                className="py-1 text-xs font-medium text-cinza underline-offset-4 hover:underline"
              >
                {verAnilhas ? "Esconder anilhas" : "Anilhas"}
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
                : melhor1RM > 0
                  ? `1RM estimado: ${formatarNumero(melhor1RM)} kg`
                  : feitas > 0
                    ? "Salvo automaticamente"
                    : "")}
          </p>
        </div>
      </div>
    </li>
  );
}
