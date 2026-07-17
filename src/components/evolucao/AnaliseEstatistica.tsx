"use client";

import { useMemo, useState } from "react";
import { compararPeriodos } from "@/lib/evolucao/compararPeriodos";
import type { LinhaTrainingData } from "@/lib/evolucao/agregarSemana";
import { METRICAS } from "@/lib/evolucao/metricas";

const OPCOES_PERIODO: { valor: "semana" | "mes"; rotulo: string }[] = [
  { valor: "semana", rotulo: "Semana vs. semana anterior" },
  { valor: "mes", rotulo: "Mês vs. mês anterior" },
];

function formatarNumero(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Visão técnica pro treinador: teste t de Welch bicaudal comparando os
// valores diários do período atual contra o período anterior, por métrica.
// Mostra a variação % sempre, mas só afirma "significativo" quando a
// amostra é grande o bastante (>=3 pontos em cada período) pra o teste
// fazer sentido — com poucos treinos na semana, qualquer p-valor seria
// ruído, não evidência.
export function AnaliseEstatistica({ dados }: { dados: LinhaTrainingData[] }) {
  const [periodo, setPeriodo] = useState<"semana" | "mes">("semana");
  const hojeIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const linhas = METRICAS.map((m) => {
    const linhasDaMetrica = dados.filter((d) => d.tipo === m.tipo && d.variavel === m.variavel);
    const resultado = compararPeriodos(linhasDaMetrica, periodo, hojeIso);
    return { ...m, resultado };
  }).filter((l) => l.resultado !== null);

  if (linhas.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-white">Análise estatística</h2>
        <div className="flex gap-1">
          {OPCOES_PERIODO.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => setPeriodo(op.valor)}
              className={`rounded-[var(--radius-badge)] px-3 py-1.5 text-xs font-medium transition-colors ${
                periodo === op.valor
                  ? "bg-stadium-blue text-white"
                  : "border border-white/15 text-track-fog hover:bg-white/5"
              }`}
            >
              {op.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs tracking-wide text-track-fog uppercase">
              <th className="pb-2 pr-3 font-medium">Métrica</th>
              <th className="tabular-data pb-2 pr-3 text-right font-medium">Anterior</th>
              <th className="tabular-data pb-2 pr-3 text-right font-medium">Atual</th>
              <th className="tabular-data pb-2 pr-3 text-right font-medium">Variação</th>
              <th className="tabular-data pb-2 pr-3 text-right font-medium">p-valor (t de Welch)</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ chave, titulo, unidade, resultado }) => {
              const r = resultado!;
              return (
                <tr key={chave} className="border-t border-white/10">
                  <td className="py-2 pr-3 text-white/80">{titulo}</td>
                  <td className="tabular-data py-2 pr-3 text-right text-white">
                    {formatarNumero(r.mediaAnterior)} {unidade}
                  </td>
                  <td className="tabular-data py-2 pr-3 text-right text-white">
                    {formatarNumero(r.mediaAtual)} {unidade}
                  </td>
                  <td
                    className={`tabular-data py-2 pr-3 text-right font-medium ${
                      r.variacaoPercentual === null
                        ? "text-track-fog"
                        : r.variacaoPercentual >= 0
                          ? "text-stadium-blue"
                          : "text-split-ember"
                    }`}
                  >
                    {r.variacaoPercentual === null
                      ? "—"
                      : `${r.variacaoPercentual >= 0 ? "+" : ""}${formatarNumero(r.variacaoPercentual)}%`}
                  </td>
                  <td className="tabular-data py-2 pr-3 text-right">
                    {!r.amostraSuficiente ? (
                      <span className="text-track-fog">amostra insuficiente</span>
                    ) : (
                      <span className={r.significativo ? "font-medium text-stadium-blue" : "text-track-fog"}>
                        p={r.pValor.toFixed(3)}
                        {r.significativo ? " (significativo)" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-track-fog">
        Teste t de Welch bicaudal (variâncias desiguais) comparando os valores diários do período
        atual contra o anterior. Amostras com menos de 3 pontos em algum período não têm
        significância calculada — com poucos treinos registrados, o teste não é confiável.
      </p>
    </div>
  );
}
