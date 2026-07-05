"use client";

import { useState, useTransition } from "react";
import { alternarConclusao } from "@/lib/actions/conclusoes";

export function BotaoConcluido({
  trainingPlanId,
  sessionKey,
  concluidoInicial,
}: {
  trainingPlanId: string;
  sessionKey: string;
  concluidoInicial: boolean;
}) {
  const [concluido, setConcluido] = useState(concluidoInicial);
  const [pendente, iniciar] = useTransition();

  function aoClicar() {
    const anterior = concluido;
    setConcluido(!anterior); // otimista
    iniciar(async () => {
      const r = await alternarConclusao(trainingPlanId, sessionKey, anterior);
      if ("erro" in r) setConcluido(anterior); // desfaz se falhar
      else setConcluido(r.concluido);
    });
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={pendente}
      aria-pressed={concluido}
      aria-label={concluido ? "Concluído" : "Marcar concluído"}
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[var(--radius-badge)] px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
        concluido
          ? "bg-stadium-blue text-white"
          : "border border-track-fog/40 text-track-fog hover:bg-lane-chalk"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
          concluido ? "border-white bg-white text-stadium-blue" : "border-track-fog/50"
        }`}
      >
        {concluido && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline">
        {concluido ? "Concluído" : "Marcar concluído"}
      </span>
    </button>
  );
}
