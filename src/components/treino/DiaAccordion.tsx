"use client";

import { useState } from "react";
import { type DiaSemana, unidadesRegistraveis } from "@/lib/planilha/parseTreino";
import { BlocosTextoView } from "./BlocosTextoView";
import { BotaoConcluido } from "./BotaoConcluido";
import { SessaoRegistros } from "./SessaoRegistros";
import type { RegistroMapa } from "./ExercicioRegistro";
import { IconeDescanso } from "@/components/icons/IconesTreino";

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
  registros,
}: {
  dia: DiaSemana;
  trainingPlanId: string;
  concluido: boolean;
  registros: RegistroMapa;
}) {
  const [aberto, setAberto] = useState(false);

  if (dia.descanso) {
    return (
      <div className="flex min-h-[44px] items-center justify-between rounded-[var(--radius-badge)] border border-dashed border-track-fog/40 bg-white/70 px-4 py-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-track-night/70">{dia.dia}</span>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-track-fog/15 px-2.5 py-1 text-xs font-medium text-track-night/70">
          <IconeDescanso className="h-3.5 w-3.5 text-track-fog" />
          Descanso
        </span>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-badge)] border bg-white ${
        concluido ? "border-stadium-blue/40" : "border-track-fog/25"
      }`}
    >
      <div className="flex items-stretch gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
          aria-expanded={aberto}
        >
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-stadium-blue">
            {dia.dia}
          </span>
          <span className="line-clamp-2 flex-1 text-sm text-track-night/80">{resumo(dia)}</span>
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
        <div className="border-t border-track-fog/20 px-3 py-4 sm:px-4">
          <BlocosTextoView blocos={dia.blocos} />
          <SessaoRegistros
            trainingPlanId={trainingPlanId}
            sessionKey={dia.chave}
            unidades={unidadesRegistraveis(dia)}
            registros={registros}
          />
        </div>
      )}
    </div>
  );
}
