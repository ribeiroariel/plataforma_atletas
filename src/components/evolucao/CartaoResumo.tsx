"use client";

import type { ComponentType } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { PontoSemana, Resumo } from "@/lib/evolucao/agregarSemana";

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
}

export function CartaoResumo({
  titulo,
  unidade,
  resumo,
  serie,
  Icone,
}: {
  titulo: string;
  unidade: string;
  resumo: Resumo;
  serie: PontoSemana[];
  Icone: ComponentType<{ className?: string }>;
}) {
  const semDadoAnterior = resumo.variacaoPercentual === null;
  const positivo = (resumo.variacaoPercentual ?? 0) > 0;

  const corDelta = resumo.recorde
    ? "text-split-ember"
    : semDadoAnterior
      ? "text-track-fog"
      : positivo
        ? "text-stadium-blue"
        : "text-track-fog";

  const seta = semDadoAnterior ? "—" : positivo ? "▲" : "▼";

  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4">
      <div className="flex items-center gap-1.5 text-track-night">
        <Icone className="h-4 w-4 shrink-0" />
        <span className="text-xs text-track-fog">{titulo}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-3xl font-bold text-track-night">
            {formatarNumero(resumo.total)}
          </span>
          <span className="text-xs text-track-fog">{unidade}</span>
        </div>
        <div className="h-8 w-20 shrink-0 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie}>
              <Line
                type="monotone"
                dataKey="total"
                stroke="#90A4B8"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${corDelta}`}>
        <span aria-hidden>{seta}</span>
        <span>
          {semDadoAnterior
            ? "sem período anterior para comparar"
            : `${Math.abs(resumo.variacaoPercentual!).toFixed(0)}% vs período anterior`}
        </span>
        {resumo.recorde && <span className="ml-1">· recorde</span>}
      </div>
    </div>
  );
}
