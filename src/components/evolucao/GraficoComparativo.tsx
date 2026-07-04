"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { serieSemanal, type LinhaTrainingData } from "@/lib/evolucao/agregarSemana";
import { CORES_COMPARATIVO, METRICAS } from "@/lib/evolucao/metricas";

const MAX_SELECIONADOS = 5;

type AtletaComDados = { id: string; nome: string; linhas: LinhaTrainingData[] };

function formatarSemana(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function GraficoComparativo({ atletas }: { atletas: AtletaComDados[] }) {
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]>(METRICAS[0]);
  const [selecionados, setSelecionados] = useState<string[]>(
    atletas.slice(0, 4).map((a) => a.id),
  );

  function alternar(id: string) {
    setSelecionados((atual) => {
      if (atual.includes(id)) return atual.filter((x) => x !== id);
      if (atual.length >= MAX_SELECIONADOS) return atual;
      return [...atual, id];
    });
  }

  const dadosGrafico = useMemo(() => {
    const atletasSelecionados = atletas.filter((a) => selecionados.includes(a.id));
    const seriesPorAtleta = atletasSelecionados.map((a) => ({
      id: a.id,
      nome: a.nome,
      serie: serieSemanal(
        a.linhas.filter((l) => l.tipo === metrica.tipo && l.variavel === metrica.variavel),
      ),
    }));

    const semanas = new Set<string>();
    seriesPorAtleta.forEach((s) => s.serie.forEach((p) => semanas.add(p.semana)));

    const linhas = [...semanas].sort().map((semana) => {
      const linha: Record<string, string | number> = { semana };
      seriesPorAtleta.forEach((s) => {
        const ponto = s.serie.find((p) => p.semana === semana);
        if (ponto) linha[s.id] = ponto.total;
      });
      return linha;
    });

    return { linhas, seriesPorAtleta };
  }, [atletas, selecionados, metrica]);

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
      <div className="flex flex-wrap gap-1">
        {METRICAS.map((m) => (
          <button
            key={m.chave}
            type="button"
            onClick={() => setMetrica(m)}
            className={`rounded-[var(--radius-badge)] px-3 py-1.5 text-sm font-medium transition-colors ${
              metrica.chave === m.chave
                ? "bg-stadium-blue text-white"
                : "border border-white/20 text-white/70 hover:bg-white/10"
            }`}
          >
            {m.titulo}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {atletas.map((a) => {
          const marcado = selecionados.includes(a.id);
          const desabilitado = !marcado && selecionados.length >= MAX_SELECIONADOS;
          return (
            <label
              key={a.id}
              className={`flex items-center gap-1.5 rounded-[var(--radius-badge)] border px-2.5 py-1 text-xs ${
                marcado ? "border-white/40 bg-white/10 text-white" : "border-white/15 text-white/50"
              } ${desabilitado ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={marcado}
                disabled={desabilitado}
                onChange={() => alternar(a.id)}
                className="accent-stadium-blue"
              />
              {a.nome}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-white/40">Até {MAX_SELECIONADOS} atletas por vez, para manter o gráfico legível.</p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dadosGrafico.linhas} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.08} />
            <XAxis
              dataKey="semana"
              tickFormatter={formatarSemana}
              tick={{ fontSize: 11, fill: "#90A4B8" }}
              axisLine={{ stroke: "#90A4B8", strokeOpacity: 0.3 }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#90A4B8" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              labelFormatter={(v) => `semana de ${formatarSemana(String(v))}`}
              contentStyle={{
                background: "#123A5C",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#90A4B8" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#fff" }} />
            {dadosGrafico.seriesPorAtleta.map((s, i) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.nome}
                stroke={CORES_COMPARATIVO[i % CORES_COMPARATIVO.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
