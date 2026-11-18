"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type PontoExercicio = { data: string; maior: number; soma: number; rm?: number };

function dataCurta(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function num(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: PontoExercicio }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg">
      <p className="rotulo text-[10px] text-white/55">{dataCurta(p.data)}</p>
      <p className="font-display text-lg font-extrabold">{num(p.maior)} kg</p>
      {p.rm ? <p className="text-white/70">1RM est. {num(p.rm)} kg</p> : null}
      <p className="text-white/55">soma das séries {num(p.soma)} kg</p>
    </div>
  );
}

// Evolução de um exercício: a maior carga de cada dia e, quando há
// repetições registradas, o 1RM estimado.
export function GraficoExercicio({ pontos }: { pontos: PontoExercicio[] }) {
  const temRM = pontos.some((p) => p.rm);
  return (
    <div className="h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pontos} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#8B8F97" strokeOpacity={0.2} />
          <XAxis
            dataKey="data"
            tickFormatter={dataCurta}
            tick={{ fontSize: 11, fill: "#8B8F97" }}
            axisLine={{ stroke: "#8B8F97", strokeOpacity: 0.3 }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8B8F97" }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<Dica />} cursor={{ stroke: "#8B8F97", strokeWidth: 1 }} />
          {temRM && (
            <Line
              type="monotone"
              dataKey="rm"
              name="1RM estimado"
              stroke="#0D0F12"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="maior"
            name="Maior carga"
            stroke="#E6411A"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: "#E6411A", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#E6411A", stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
