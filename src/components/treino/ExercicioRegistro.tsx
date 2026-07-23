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
// Mapa de registros já salvos: chave = `${sessionKey}:${itemIndex}`.
export type RegistroMapa = Record<string, RegistroExercicio>;

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

type Status = "idle" | "salvando" | "salvo" | "erro";

export function ExercicioRegistro({
  trainingPlanId,
  sessionKey,
  itemIndex,
  rotulo,
  detalhe,
  data,
  inicial,
}: {
  trainingPlanId: string;
  sessionKey: string;
  itemIndex: number;
  rotulo: string;
  detalhe?: string;
  data: string;
  inicial?: RegistroExercicio;
}) {
  const sugestao = useMemo(() => sugerirMetricas(rotulo, detalhe), [rotulo, detalhe]);
  const opcaoInicial = useMemo(
    () => (inicial ? metricaServidorParaOpcao(inicial.metrica, sugestao) : undefined),
    [inicial, sugestao],
  );
  // Se já existe um registro salvo com uma opção fora da sugestão atual
  // (ex.: planilha reescrita depois do registro), mantemos ela disponível
  // pra não esconder um valor já lançado.
  const opcoesDisponiveis = useMemo(() => {
    if (opcaoInicial && !sugestao.opcoes.includes(opcaoInicial)) {
      return [opcaoInicial, ...sugestao.opcoes];
    }
    return sugestao.opcoes;
  }, [sugestao, opcaoInicial]);

  const [opcao, setOpcao] = useState<OpcaoMetrica>(opcaoInicial ?? sugestao.opcoes[0]);
  const [valorTexto, setValorTexto] = useState(() => valorInicialTexto(inicial, opcaoInicial ?? sugestao.opcoes[0]));
  const [salvo, setSalvo] = useState<boolean>(!!inicial);
  const [status, setStatus] = useState<Status>("idle");
  const [mensagem, setMensagem] = useState("");
  const [pendente, iniciar] = useTransition();

  const selectId = useId();
  const inputId = useId();
  const ehPace = opcao === "pace";
  const ehSegundos = opcao === "tempo_seg";

  // Autosave com debounce: salva ~800ms depois da última tecla, além do
  // onBlur/Enter já existentes. Sem isso, fechar o app/trocar de aba no meio
  // do treino sem "sair" do campo (ex.: apertar o botão de home do celular)
  // podia perder o valor digitado — o blur nem sempre dispara nesses casos.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Aceita um valor explícito (usado pelo autosave, que dispara antes do
  // estado `valorTexto` da renderização atual refletir a tecla que acabou
  // de ser digitada) — sem isso o debounce salvaria sempre o valor de uma
  // tecla atrás.
  function salvar(valorParaSalvar?: string) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const bruto = (valorParaSalvar ?? valorTexto).trim();
    if (!bruto) {
      // Campo vazio: se havia algo salvo, tratamos como limpar; senão, ignora.
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
      const r = await removerExercicio(trainingPlanId, sessionKey, itemIndex);
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

  return (
    <li
      className={`flex flex-col gap-2 rounded-[var(--radius-badge)] border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 ${
        salvo ? "border-stadium-blue/40 bg-stadium-blue/5" : "border-track-fog/25 bg-lane-chalk/60"
      }`}
    >
      <span className="min-w-0 flex-1 text-sm break-words text-track-night">{rotulo}</span>

      <div className="flex flex-wrap items-center gap-2">
        {opcoesDisponiveis.length > 1 ? (
          <>
            <label htmlFor={selectId} className="sr-only">
              Métrica do exercício
            </label>
            <select
              id={selectId}
              value={opcao}
              onChange={(e) => {
                setOpcao(e.target.value as OpcaoMetrica);
                setStatus("idle");
                setMensagem("");
              }}
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
          aria-label="Salvar exercício"
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

        {salvo && (
          <button
            type="button"
            onClick={limpar}
            disabled={pendente}
            aria-label="Limpar registro do exercício"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-badge)] border border-track-fog/40 px-3 text-sm text-track-fog transition-colors hover:bg-lane-chalk disabled:opacity-50"
          >
            Limpar
          </button>
        )}

        <span
          aria-live="polite"
          className={`min-w-[3.5rem] text-xs ${
            status === "erro"
              ? "text-split-ember"
              : status === "salvo"
                ? "text-stadium-blue"
                : "text-track-fog"
          }`}
        >
          {mensagem}
        </span>
      </div>
    </li>
  );
}
