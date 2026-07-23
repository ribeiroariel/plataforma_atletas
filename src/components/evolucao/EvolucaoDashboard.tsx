"use client";

import { useMemo, useState } from "react";
import {
  filtrarPorPeriodo,
  resumoPeriodo,
  serieSemanal,
  type LinhaTrainingData,
  type Periodo,
} from "@/lib/evolucao/agregarSemana";
import { METRICAS } from "@/lib/evolucao/metricas";
import {
  IconeAcademia,
  IconeBicicleta,
  IconeCardio,
  IconeCorrida,
} from "@/components/icons/IconesTreino";
import { CartaoResumo } from "./CartaoResumo";
import { GraficoSemanal } from "./GraficoSemanal";

const ICONE_POR_METRICA = {
  academia: IconeAcademia,
  corrida: IconeCorrida,
  bicicleta: IconeBicicleta,
  cardio: IconeCardio,
} as const;

const OPCOES_PERIODO: { valor: Periodo; rotulo: string }[] = [
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
  { valor: "tudo", rotulo: "Tudo" },
];

export function EvolucaoDashboard({ dados }: { dados: LinhaTrainingData[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [tipoGrafico, setTipoGrafico] = useState<"area" | "barra">("area");
  const hojeIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const porMetrica = METRICAS.map((m) => {
    const linhasDaMetrica = dados.filter((d) => d.tipo === m.tipo && d.variavel === m.variavel);
    const linhasFiltradas = filtrarPorPeriodo(linhasDaMetrica, periodo, hojeIso);
    return {
      ...m,
      resumo: resumoPeriodo(linhasDaMetrica, periodo, hojeIso),
      serie: serieSemanal(linhasFiltradas),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {OPCOES_PERIODO.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => setPeriodo(op.valor)}
              className={`rounded-[var(--radius-badge)] px-3 py-1.5 text-sm font-medium transition-colors ${
                periodo === op.valor
                  ? "bg-stadium-blue text-white"
                  : "border border-track-fog/40 bg-white text-track-night hover:bg-lane-chalk"
              }`}
            >
              {op.rotulo}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(["area", "barra"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoGrafico(t)}
              className={`rounded-[var(--radius-badge)] px-3 py-1.5 text-xs font-medium transition-colors ${
                tipoGrafico === t
                  ? "bg-deep-lane text-white"
                  : "border border-track-fog/40 bg-white text-track-night hover:bg-lane-chalk"
              }`}
            >
              {t === "area" ? "Gráfico de área" : "Gráfico de barras"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {porMetrica.map((m) => (
          <CartaoResumo
            key={m.chave}
            titulo={m.titulo}
            unidade={m.unidade}
            resumo={m.resumo}
            serie={m.serie}
            Icone={ICONE_POR_METRICA[m.chave]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {porMetrica.map((m) => (
          <GraficoSemanal
            key={m.chave}
            titulo={m.titulo}
            unidade={m.unidade}
            serie={m.serie}
            Icone={ICONE_POR_METRICA[m.chave]}
            tipo={tipoGrafico}
          />
        ))}
      </div>
    </div>
  );
}
