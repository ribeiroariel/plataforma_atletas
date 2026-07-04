"use client";

import { useState } from "react";
import type { DiaSemana } from "@/lib/planilha/parseTreino";
import { BlocosTextoView } from "./BlocosTextoView";
import { BotaoConcluido } from "./BotaoConcluido";

function resumo(dia: DiaSemana): string {
  const primeiro = dia.blocos[0];
  if (!primeiro) return "";
  if (primeiro.tipo === "paragrafo" || primeiro.tipo === "subtitulo") return primeiro.texto;
  if (primeiro.tipo === "item-numerado") return primeiro.texto;
  return "";
}

export function DiaAccordion({
  dia,
  trainingPlanId,
  concluido,
}: {
  dia: DiaSemana;
  trainingPlanId: string;
  concluido: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  if (dia.descanso) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-badge)] px-4 py-3 text-sm text-track-fog">
        <span className="font-medium uppercase tracking-wide">{dia.dia}</span>
        <span>Descanso</span>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-badge)] border bg-white ${
        concluido ? "border-stadium-blue/40" : "border-track-fog/25"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex flex-1 items-center gap-4 text-left"
          aria-expanded={aberto}
        >
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-stadium-blue">
            {dia.dia}
          </span>
          <span className="flex-1 truncate text-sm text-track-night/80">{resumo(dia)}</span>
          <span
            className="shrink-0 text-track-fog transition-transform motion-reduce:transition-none"
            style={{ transform: aberto ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden
          >
            ▾
          </span>
        </button>
        <BotaoConcluido
          trainingPlanId={trainingPlanId}
          sessionKey={dia.chave}
          concluidoInicial={concluido}
        />
      </div>
      {aberto && (
        <div className="border-t border-track-fog/20 px-4 py-4">
          <BlocosTextoView blocos={dia.blocos} />
        </div>
      )}
    </div>
  );
}
