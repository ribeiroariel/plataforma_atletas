"use client";

import { useId, useState, useTransition } from "react";
import { atualizarDataInicioPlano } from "@/lib/actions/plano";
import { tituloDoPlano } from "@/lib/datas";

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
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const inputId = useId();

  function salvar() {
    setMensagem(null);
    iniciar(async () => {
      const r = await atualizarDataInicioPlano(trainingPlanId, athleteId, valor);
      setMensagem("erro" in r ? { texto: r.erro, erro: true } : { texto: "Salvo", erro: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label htmlFor={inputId} className="font-display min-w-0 flex-1 truncate text-lg leading-tight font-bold uppercase">
        {tituloDoPlano(nomeArquivo)}
      </label>
      <input
        id={inputId}
        type="date"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="tabular-data h-11 rounded-xl bg-bone px-3 text-sm text-ink ring-1 ring-ash outline-none focus:ring-2 focus:ring-ink"
      />
      <button
        type="button"
        onClick={salvar}
        disabled={pendente || valor === dataInicioAtual || !valor}
        className="h-11 rounded-xl bg-ink px-4 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-ink-3 disabled:opacity-30"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>
      {mensagem && (
        <span aria-live="polite" className={`text-xs ${mensagem.erro ? "text-erro" : "text-ok"}`}>
          {mensagem.texto}
        </span>
      )}
    </div>
  );
}
