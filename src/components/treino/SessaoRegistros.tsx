"use client";

import { useId, useState } from "react";
import type { UnidadeRegistravel } from "@/lib/planilha/parseTreino";
import { ExercicioRegistro, registrosDoExercicio, type RegistroMapa } from "./ExercicioRegistro";

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Cabeçalho de UMA data para a sessão inteira (dia ou bloco) + a lista de
// exercícios registráveis. Todos os registros da sessão usam a data do
// cabeçalho; não há data por exercício.
export function SessaoRegistros({
  trainingPlanId,
  sessionKey,
  unidades,
  registros,
}: {
  trainingPlanId: string;
  sessionKey: string;
  unidades: UnidadeRegistravel[];
  registros: RegistroMapa;
}) {
  const [data, setData] = useState<string>(hojeIso());
  const dataId = useId();

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-track-fog/15 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-deep-lane uppercase">
          Registrar
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor={dataId} className="text-xs text-track-fog">
            Data
          </label>
          <input
            id={dataId}
            type="date"
            value={data}
            max={hojeIso()}
            onChange={(e) => setData(e.target.value)}
            className="min-h-[44px] rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-2 text-base text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
          />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {unidades.map((u) => (
          <ExercicioRegistro
            key={u.itemIndex}
            trainingPlanId={trainingPlanId}
            sessionKey={sessionKey}
            itemIndex={u.itemIndex}
            rotulo={u.rotulo}
            detalhe={u.detalhe}
            data={data}
            registrosSalvos={registrosDoExercicio(registros, sessionKey, u.itemIndex)}
          />
        ))}
      </ul>
    </div>
  );
}
