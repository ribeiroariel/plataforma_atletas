"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PontoSemana } from "@/lib/evolucao/agregarSemana";

const AZUL = "#1C6DD0";

function formatarSemana(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function TooltipPersonalizado({
  active,
  payload,
  unidade,
}: {
  active?: boolean;
  payload?: { payload: PontoSemana }[];
  unidade: string;
}) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-badge)] border border-track-fog/30 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-track-night">
        {ponto.total.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {unidade}
      </p>
      <p className="text-track-fog">semana de {formatarSemana(ponto.semana)}</p>
    </div>
  );
}

export function GraficoSemanal({
  titulo,
  unidade,
  serie,
}: {
  titulo: string;
  unidade: string;
  serie: PontoSemana[];
}) {
  const semDados = serie.length === 0;

  return (
    <div className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4">
      <h3 className="mb-2 font-display text-base font-semibold text-track-night">{titulo}</h3>
      {semDados ? (
        <p className="flex h-48 items-center justify-center text-sm text-track-fog">
          Nenhum dado registrado ainda para {titulo.toLowerCase()}.
        </p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${titulo}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={AZUL} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={AZUL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#90A4B8" strokeOpacity={0.2} />
              <XAxis
                dataKey="semana"
                tickFormatter={formatarSemana}
                tick={{ fontSize: 11, fill: "#90A4B8" }}
                axisLine={{ stroke: "#90A4B8", strokeOpacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#90A4B8" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={<TooltipPersonalizado unidade={unidade} />}
                cursor={{ stroke: "#90A4B8", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={AZUL}
                strokeWidth={2}
                fill={`url(#fill-${titulo})`}
                dot={{ r: 3, fill: AZUL, stroke: "#F4F7FA", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: AZUL, stroke: "#F4F7FA", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
