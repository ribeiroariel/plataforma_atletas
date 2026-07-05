"use client";

import { useId, useState, useTransition } from "react";
import { registrarExercicio, removerExercicio } from "@/lib/actions/exercicio";

export type Metrica = "kg" | "distancia" | "tempo" | "pace";
export type RegistroExercicio = { metrica: Metrica; valor: number; data: string };
// Mapa de registros já salvos: chave = `${sessionKey}:${itemIndex}`.
export type RegistroMapa = Record<string, RegistroExercicio>;

const OPCOES_METRICA: { valor: Metrica; rotulo: string }[] = [
  { valor: "kg", rotulo: "Carga (kg)" },
  { valor: "tempo", rotulo: "Tempo (min)" },
  { valor: "distancia", rotulo: "Distância (km)" },
  { valor: "pace", rotulo: "Pace (min/km)" },
];

// Converte minutos decimais de volta para "m:ss" (exibição de pace salvo).
function minutosParaPace(min: number): string {
  const totalSeg = Math.round(min * 60);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function valorInicialTexto(inicial?: RegistroExercicio): string {
  if (!inicial) return "";
  if (inicial.metrica === "pace") return minutosParaPace(inicial.valor);
  return String(inicial.valor).replace(".", ",");
}

type Status = "idle" | "salvando" | "salvo" | "erro";

export function ExercicioRegistro({
  trainingPlanId,
  sessionKey,
  itemIndex,
  rotulo,
  data,
  inicial,
}: {
  trainingPlanId: string;
  sessionKey: string;
  itemIndex: number;
  rotulo: string;
  data: string;
  inicial?: RegistroExercicio;
}) {
  const [metrica, setMetrica] = useState<Metrica>(inicial?.metrica ?? "kg");
  const [valorTexto, setValorTexto] = useState(() => valorInicialTexto(inicial));
  const [salvo, setSalvo] = useState<boolean>(!!inicial);
  const [status, setStatus] = useState<Status>("idle");
  const [mensagem, setMensagem] = useState("");
  const [pendente, iniciar] = useTransition();

  const selectId = useId();
  const inputId = useId();
  const ehPace = metrica === "pace";

  function salvar() {
    const bruto = valorTexto.trim();
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
        metrica,
        bruto,
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
        <label htmlFor={selectId} className="sr-only">
          Métrica do exercício
        </label>
        <select
          id={selectId}
          value={metrica}
          onChange={(e) => {
            setMetrica(e.target.value as Metrica);
            setStatus("idle");
            setMensagem("");
          }}
          className="min-h-[44px] rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-2 text-base text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
        >
          {OPCOES_METRICA.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.rotulo}
            </option>
          ))}
        </select>

        <label htmlFor={inputId} className="sr-only">
          Valor do exercício
        </label>
        <input
          id={inputId}
          type="text"
          inputMode={ehPace ? "text" : "decimal"}
          value={valorTexto}
          placeholder={ehPace ? "mm:ss" : "0"}
          onChange={(e) => {
            setValorTexto(e.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setMensagem("");
            }
          }}
          onBlur={salvar}
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
          onClick={salvar}
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
