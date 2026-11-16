"use client";

import { useEffect, useState } from "react";

function formatar(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Cronômetro de descanso flutuante. Recebe o instante em que o descanso
// termina (e não "quantos segundos faltam") pra continuar certo mesmo se o
// celular bloquear a tela ou o navegador pausar os timers no meio.
export function TimerDescanso({
  fim,
  total,
  onAjustar,
  onFechar,
}: {
  fim: number;
  total: number;
  onAjustar: (deltaSeg: number) => void;
  onFechar: () => void;
}) {
  const [restante, setRestante] = useState(() => Math.max(0, Math.ceil((fim - Date.now()) / 1000)));

  useEffect(() => {
    let avisou = false;
    function tique() {
      const r = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
      setRestante(r);
      if (r === 0 && !avisou) {
        avisou = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([180, 90, 180]);
        }
      }
    }
    tique();
    const id = setInterval(tique, 250);
    return () => clearInterval(id);
  }, [fim]);

  const acabou = restante === 0;
  const fracao = total > 0 ? Math.min(1, restante / total) : 0;

  return (
    <div
      role="timer"
      aria-live="off"
      className="animate-subir fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md overflow-hidden rounded-2xl bg-ink text-white shadow-2xl shadow-black/40 md:right-6 md:bottom-6 md:left-auto md:mx-0 md:w-80"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className={`rotulo ${acabou ? "text-sinal" : "text-white/50"}`}>
            {acabou ? "Descanso acabou" : "Descanso"}
          </p>
          <p
            className={`font-display text-4xl leading-none font-extrabold tabular-nums ${
              acabou ? "animate-pulsar text-sinal" : ""
            }`}
          >
            {acabou ? "Bora!" : formatar(restante)}
          </p>
        </div>
        {!acabou && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onAjustar(-15)}
              aria-label="Tirar 15 segundos"
              className="h-10 rounded-full bg-white/10 px-3 text-sm font-semibold tabular-nums transition-colors hover:bg-white/20"
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => onAjustar(30)}
              aria-label="Somar 30 segundos"
              className="h-10 rounded-full bg-white/10 px-3 text-sm font-semibold tabular-nums transition-colors hover:bg-white/20"
            >
              +30
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar cronômetro"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-tartan transition-[width] duration-300 ease-linear"
          style={{ width: `${fracao * 100}%` }}
        />
      </div>
    </div>
  );
}
