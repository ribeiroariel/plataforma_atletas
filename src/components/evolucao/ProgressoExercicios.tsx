"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { ProgressoExercicio } from "@/lib/planilha/progressoExercicios";

const MAX_EXERCICIOS = 8;

function formatarData(iso: string) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

// Cards com progressão de carga por exercício específico — reaproveita
// exercise_logs já normalizado por progressoExercicios.ts. Puramente visual
// (sem teste estatístico); para significância/teste t use a skill
// analise-estatistica-treinos fora do site.
export function ProgressoExercicios({ dados }: { dados: ProgressoExercicio[] }) {
  if (dados.length === 0) return null;

  const exibidos = dados.slice(0, MAX_EXERCICIOS);

  return (
    <div className="rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-white">Progresso por exercício</h2>
        <span className="text-xs text-track-fog">Carga (kg) registrada, soma do dia</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {exibidos.map((ex) => {
          const ultimo = ex.pontos[ex.pontos.length - 1];
          const primeiro = ex.pontos[0];
          const variacao = primeiro.valor > 0 ? ((ultimo.valor - primeiro.valor) / primeiro.valor) * 100 : null;

          return (
            <div key={ex.exercicio} className="rounded-[var(--radius-badge)] bg-white p-3">
              <p className="truncate text-xs font-semibold text-track-night" title={ex.exercicio}>
                {ex.exercicio}
              </p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <div>
                  <span className="font-display text-xl font-bold text-track-night">{ultimo.valor}</span>
                  <span className="ml-1 text-xs text-track-fog">kg</span>
                  <p className="text-xs text-track-fog">{formatarData(ultimo.data)}</p>
                </div>
                {ex.pontos.length > 1 && (
                  <div className="h-8 w-16 shrink-0 opacity-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ex.pontos}>
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke="#1C6DD0"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {variacao !== null && ex.pontos.length > 1 && (
                <p
                  className={`mt-1 text-xs font-medium ${variacao >= 0 ? "text-stadium-blue" : "text-split-ember"}`}
                >
                  {variacao >= 0 ? "+" : ""}
                  {variacao.toFixed(0)}% desde {formatarData(primeiro.data)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {dados.length > MAX_EXERCICIOS && (
        <p className="mt-2 text-xs text-track-fog">
          + {dados.length - MAX_EXERCICIOS} outro(s) exercício(s) com registro — mostrando os mais recentes.
        </p>
      )}
    </div>
  );
}
