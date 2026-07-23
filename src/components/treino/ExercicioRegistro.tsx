"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { registrarExercicio, removerExercicio } from "@/lib/actions/exercicio";
import {
  sugerirMetricas,
  metricaServidorParaOpcao,
  opcaoParaMetricaServidor,
  type Metrica,
  type OpcaoMetrica,
} from "@/lib/planilha/sugerirMetrica";
import { numero } from "@/lib/actions/valores";

export type { Metrica };
export type RegistroExercicio = { metrica: Metrica; valor: number; data: string };
// Mapa de registros já salvos: chave = `${sessionKey}:${itemIndex}:${serie}`.
export type RegistroMapa = Record<string, RegistroExercicio>;

// Extrai, do mapa completo de registros da sessão, só os de um exercício
// específico — indexados por número de série.
export function registrosDoExercicio(
  mapa: RegistroMapa,
  sessionKey: string,
  itemIndex: number,
): Record<number, RegistroExercicio> {
  const prefixo = `${sessionKey}:${itemIndex}:`;
  const resultado: Record<number, RegistroExercicio> = {};
  for (const [chave, valor] of Object.entries(mapa)) {
    if (chave.startsWith(prefixo)) {
      const serie = Number(chave.slice(prefixo.length));
      if (Number.isFinite(serie)) resultado[serie] = valor;
    }
  }
  return resultado;
}

function rotuloOpcao(opcao: OpcaoMetrica): string {
  switch (opcao) {
    case "kg":
      return "Carga (kg)";
    case "tempo_min":
      return "Tempo (min)";
    case "tempo_seg":
      return "Tempo (segundos)";
    case "distancia":
      return "Distância (km)";
    case "pace":
      return "Pace (min/km)";
  }
}

// Converte minutos decimais de volta para "m:ss" (exibição de pace salvo).
function minutosParaPace(min: number): string {
  const totalSeg = Math.round(min * 60);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function valorInicialTexto(inicial: RegistroExercicio | undefined, opcao: OpcaoMetrica): string {
  if (!inicial) return "";
  if (inicial.metrica === "pace") return minutosParaPace(inicial.valor);
  if (opcao === "tempo_seg") return String(Math.round(inicial.valor * 60));
  return String(inicial.valor).replace(".", ",");
}

// O servidor sempre trata "tempo" como minutos — quando a opção escolhida é
// segundos (repetições curtas, ex.: 200/300/400m), convertemos aqui antes de
// enviar, e de volta ao reidratar o valor salvo (valorInicialTexto acima).
function paraMinutosSeNecessario(bruto: string, opcao: OpcaoMetrica): string {
  if (opcao !== "tempo_seg") return bruto;
  const segundos = numero(bruto);
  if (segundos === null) return bruto;
  return String(segundos / 60);
}

// Sugestão inicial de quantas séries mostrar, a partir do texto de detalhe
// da planilha (ex.: "4x8-10" -> 4, "3-4x8-10" -> 4 — usa o maior dos dois,
// mais seguro que subestimar —, "4 séries de 6-8 reps" -> 4). É só um
// ponto de partida: o texto da planilha nem sempre é claro o bastante pra
// confiar cegamente nisso, então o atleta sempre pode adicionar/remover
// campo manualmente (ver botão "+ Adicionar série" no componente).
function detectarNumeroSeries(detalhe?: string): number {
  if (!detalhe) return 1;
  const nxm = detalhe.match(/(\d+)(?:-(\d+))?\s*[x×]/);
  if (nxm) {
    const n = nxm[2] ? Math.max(Number(nxm[1]), Number(nxm[2])) : Number(nxm[1]);
    if (Number.isFinite(n) && n > 0 && n <= 20) return n;
  }
  const series = detalhe.match(/(\d+)\s*s[ée]ries/i);
  if (series) {
    const n = Number(series[1]);
    if (Number.isFinite(n) && n > 0 && n <= 20) return n;
  }
  return 1;
}

type Status = "idle" | "salvando" | "salvo" | "erro";

// Um campo de valor isolado — uma série de carga, ou o valor único de
// exercícios que não são "kg". Autosave e status são independentes por
// campo, pra digitar a série 2 não interferir no status da série 1.
function CampoValor({
  trainingPlanId,
  sessionKey,
  itemIndex,
  serie,
  opcao,
  data,
  inicial,
  rotuloCampo,
  onRemoverSerie,
}: {
  trainingPlanId: string;
  sessionKey: string;
  itemIndex: number;
  serie: number;
  opcao: OpcaoMetrica;
  data: string;
  inicial?: RegistroExercicio;
  rotuloCampo?: string;
  onRemoverSerie?: () => void;
}) {
  const [valorTexto, setValorTexto] = useState(() => valorInicialTexto(inicial, opcao));
  const [salvo, setSalvo] = useState<boolean>(!!inicial);
  const [status, setStatus] = useState<Status>("idle");
  const [mensagem, setMensagem] = useState("");
  const [pendente, iniciar] = useTransition();
  const inputId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ehPace = opcao === "pace";
  const ehSegundos = opcao === "tempo_seg";

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Autosave com debounce: salva ~800ms depois da última tecla, além do
  // onBlur/Enter já existentes. Sem isso, fechar o app/trocar de tela no
  // meio do treino sem "sair" do campo (ex.: botão de home do celular) podia
  // perder o valor digitado — o blur nem sempre dispara nesses casos.
  function salvar(valorParaSalvar?: string) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const bruto = (valorParaSalvar ?? valorTexto).trim();
    if (!bruto) {
      if (salvo) limpar();
      return;
    }
    setStatus("salvando");
    setMensagem("Salvando…");
    iniciar(async () => {
      const r = await registrarExercicio(
        trainingPlanId,
        sessionKey,
        itemIndex,
        serie,
        opcaoParaMetricaServidor(opcao),
        paraMinutosSeNecessario(bruto, opcao),
        data,
      );
      if ("erro" in r) {
        setStatus("erro");
        setMensagem(r.erro);
      } else {
        setSalvo(true);
        setStatus("salvo");
        setMensagem("Salvo");
      }
    });
  }

  function limpar() {
    setStatus("salvando");
    setMensagem("Removendo…");
    iniciar(async () => {
      const r = await removerExercicio(trainingPlanId, sessionKey, itemIndex, serie);
      if ("erro" in r) {
        setStatus("erro");
        setMensagem(r.erro);
      } else {
        setSalvo(false);
        setValorTexto("");
        setStatus("idle");
        setMensagem("");
      }
    });
  }

  // Remove essa série inteira: se tinha valor salvo, apaga do servidor
  // primeiro (pra não deixar lixo em exercise_logs), depois avisa o pai
  // pra tirar o campo da tela.
  function removerSerieInteira() {
    if (salvo) limpar();
    onRemoverSerie?.();
  }

  return (
    <div className="flex items-center gap-2">
      {rotuloCampo && <span className="w-16 shrink-0 text-xs text-track-fog">{rotuloCampo}</span>}

      <label htmlFor={inputId} className="sr-only">
        Valor do exercício
      </label>
      <input
        id={inputId}
        type="text"
        inputMode={ehPace ? "text" : "decimal"}
        value={valorTexto}
        placeholder={ehPace ? "mm:ss" : ehSegundos ? "ex.: 45" : "0"}
        onChange={(e) => {
          const novoValor = e.target.value;
          setValorTexto(novoValor);
          if (status !== "idle") {
            setStatus("idle");
            setMensagem("");
          }
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => salvar(novoValor), 800);
        }}
        onBlur={() => salvar()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="min-h-[44px] w-20 rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-2 text-base text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
      />

      <button
        type="button"
        onClick={() => salvar()}
        disabled={pendente}
        aria-label="Salvar valor"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-badge)] bg-stadium-blue px-3 text-sm font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6.2l2.2 2.2 4.8-4.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {onRemoverSerie && (
        <button
          type="button"
          onClick={removerSerieInteira}
          disabled={pendente}
          aria-label="Remover série"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-badge)] border border-track-fog/40 px-3 text-sm text-track-fog transition-colors hover:bg-lane-chalk disabled:opacity-50"
        >
          ×
        </button>
      )}

      <span
        aria-live="polite"
        className={`min-w-[3.5rem] text-xs ${
          status === "erro" ? "text-split-ember" : status === "salvo" ? "text-stadium-blue" : "text-track-fog"
        }`}
      >
        {mensagem}
      </span>
    </div>
  );
}

export function ExercicioRegistro({
  trainingPlanId,
  sessionKey,
  itemIndex,
  rotulo,
  detalhe,
  data,
  registrosSalvos,
}: {
  trainingPlanId: string;
  sessionKey: string;
  itemIndex: number;
  rotulo: string;
  detalhe?: string;
  data: string;
  registrosSalvos: Record<number, RegistroExercicio>;
}) {
  const sugestao = useMemo(() => sugerirMetricas(rotulo, detalhe), [rotulo, detalhe]);

  // A métrica de qualquer série já salva tem prioridade sobre a sugestão
  // automática (a planilha pode ter mudado depois do registro).
  const metricaJaSalva = Object.values(registrosSalvos)[0]?.metrica;
  const opcaoInicial = useMemo(
    () => (metricaJaSalva ? metricaServidorParaOpcao(metricaJaSalva, sugestao) : undefined),
    [metricaJaSalva, sugestao],
  );
  const opcoesDisponiveis = useMemo(() => {
    if (opcaoInicial && !sugestao.opcoes.includes(opcaoInicial)) {
      return [opcaoInicial, ...sugestao.opcoes];
    }
    return sugestao.opcoes;
  }, [sugestao, opcaoInicial]);

  const [opcao, setOpcao] = useState<OpcaoMetrica>(opcaoInicial ?? sugestao.opcoes[0]);
  const selectId = useId();

  // Séries por série só fazem sentido pra carga — qualquer outra métrica
  // (distância, tempo, pace) é sempre um valor único (serie=1).
  const ehCarga = opcao === "kg";
  const seriesJaSalvas = Object.keys(registrosSalvos)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  const [numeroSeries, setNumeroSeries] = useState<number>(() =>
    Math.max(seriesJaSalvas.length > 0 ? Math.max(...seriesJaSalvas) : 0, detectarNumeroSeries(detalhe), 1),
  );

  const series = ehCarga ? Array.from({ length: numeroSeries }, (_, i) => i + 1) : [1];
  const temAlgumRegistro = Object.keys(registrosSalvos).length > 0;

  return (
    <li
      className={`flex flex-col gap-2 rounded-[var(--radius-badge)] border px-3 py-2.5 ${
        temAlgumRegistro ? "border-stadium-blue/40 bg-stadium-blue/5" : "border-track-fog/25 bg-lane-chalk/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 flex-1 text-sm break-words text-track-night">{rotulo}</span>

        {opcoesDisponiveis.length > 1 ? (
          <>
            <label htmlFor={selectId} className="sr-only">
              Métrica do exercício
            </label>
            <select
              id={selectId}
              value={opcao}
              onChange={(e) => setOpcao(e.target.value as OpcaoMetrica)}
              className="min-h-[44px] rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-2 text-base text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            >
              {opcoesDisponiveis.map((valor) => (
                <option key={valor} value={valor}>
                  {rotuloOpcao(valor)}
                </option>
              ))}
            </select>
          </>
        ) : (
          <span className="min-h-[44px] inline-flex items-center rounded-[var(--radius-badge)] bg-track-fog/10 px-2.5 text-xs font-medium text-track-night/70">
            {rotuloOpcao(opcoesDisponiveis[0])}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {series.map((serie) => (
          <CampoValor
            key={serie}
            trainingPlanId={trainingPlanId}
            sessionKey={sessionKey}
            itemIndex={itemIndex}
            serie={serie}
            opcao={opcao}
            data={data}
            inicial={registrosSalvos[serie]}
            rotuloCampo={ehCarga && numeroSeries > 1 ? `Série ${serie}` : undefined}
            onRemoverSerie={
              ehCarga && numeroSeries > 1 && serie === numeroSeries
                ? () => setNumeroSeries((n) => Math.max(1, n - 1))
                : undefined
            }
          />
        ))}

        {ehCarga && numeroSeries < 20 && (
          <button
            type="button"
            onClick={() => setNumeroSeries((n) => n + 1)}
            className="self-start text-xs font-medium text-stadium-blue hover:underline"
          >
            + Adicionar série
          </button>
        )}
      </div>
    </li>
  );
}
