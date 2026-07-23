"use client";

import { useId, useState, useTransition } from "react";
import { atualizarDataInicioPlano } from "@/lib/actions/plano";

export function EditarDataInicioPlano({
  trainingPlanId,
  athleteId,
  nomeArquivo,
  dataInicioAtual,
}: {
  trainingPlanId: string;
  athleteId: string;
  nomeArquivo: string;
  dataInicioAtual: string;
}) {
  const [valor, setValor] = useState(dataInicioAtual);
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState("");
  const inputId = useId();

  function salvar() {
    setMensagem("");
    iniciar(async () => {
      const r = await atualizarDataInicioPlano(trainingPlanId, athleteId, valor);
      setMensagem("erro" in r ? r.erro : "Salvo");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-track-fog">{nomeArquivo.replace(/\.xlsx$/i, "").replace(/[_-]+/g, " ")}</span>
      <label htmlFor={inputId} className="sr-only">
        Início da Semana 1
      </label>
      <input
        id={inputId}
        type="date"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="min-h-[36px] rounded-[var(--radius-badge)] border border-white/20 bg-transparent px-2 text-sm text-white outline-none focus:border-stadium-blue"
      />
      <button
        type="button"
        onClick={salvar}
        disabled={pendente || valor === dataInicioAtual}
        className="rounded-[var(--radius-badge)] bg-stadium-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        Salvar
      </button>
      {mensagem && <span className="text-xs text-track-fog">{mensagem}</span>}
    </div>
  );
}
