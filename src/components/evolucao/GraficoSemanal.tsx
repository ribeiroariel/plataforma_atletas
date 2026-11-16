"use client";

import type { ComponentType } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PontoSemana } from "@/lib/evolucao/agregarSemana";

const AZUL = "#F0481E";

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
  Icone,
  tipo = "area",
}: {
  titulo: string;
  unidade: string;
  serie: PontoSemana[];
  Icone?: ComponentType<{ className?: string }>;
  tipo?: "area" | "barra";
}) {
  const semDados = serie.length === 0;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-ash">
      <h3 className="mb-2 flex items-center gap-1.5 font-display text-base font-semibold text-track-night">
        {Icone && <Icone className="h-4 w-4 shrink-0" />}
        {titulo}
      </h3>
      {semDados ? (
        <p className="flex h-48 items-center justify-center text-sm text-track-fog">
          Nenhum dado registrado ainda para {titulo.toLowerCase()}.
        </p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {tipo === "barra" ? (
              <BarChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#8B8F97" strokeOpacity={0.2} />
                <XAxis
                  dataKey="semana"
                  tickFormatter={formatarSemana}
                  tick={{ fontSize: 11, fill: "#8B8F97" }}
                  axisLine={{ stroke: "#8B8F97", strokeOpacity: 0.3 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#8B8F97" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  content={<TooltipPersonalizado unidade={unidade} />}
                  cursor={{ fill: AZUL, fillOpacity: 0.06 }}
                />
                <Bar dataKey="total" fill={AZUL} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            ) : (
              <AreaChart data={serie} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill-${titulo}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AZUL} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={AZUL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#8B8F97" strokeOpacity={0.2} />
                <XAxis
                  dataKey="semana"
                  tickFormatter={formatarSemana}
                  tick={{ fontSize: 11, fill: "#8B8F97" }}
                  axisLine={{ stroke: "#8B8F97", strokeOpacity: 0.3 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#8B8F97" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  content={<TooltipPersonalizado unidade={unidade} />}
                  cursor={{ stroke: "#8B8F97", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={AZUL}
                  strokeWidth={2}
                  fill={`url(#fill-${titulo})`}
                  dot={{ r: 3, fill: AZUL, stroke: "#F5F3EE", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: AZUL, stroke: "#F5F3EE", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
