"use client";

import { useActionState, useState } from "react";
import { criarObservacao } from "@/lib/actions/observations";

const LIMITE = 2000;

export function ObservacaoForm({ trainingPlanId }: { trainingPlanId: string }) {
  const [estado, formAction, pendente] = useActionState(criarObservacao, null);
  const [texto, setTexto] = useState("");

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setTexto("");
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="training_plan_id" value={trainingPlanId} />
      <textarea
        name="texto"
        rows={3}
        maxLength={LIMITE}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Como foi esse treino? Dores, dificuldades, sensação de esforço..."
        className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
      />
      <div className="flex items-center justify-between">
        <span className="tabular-data text-xs text-track-fog">
          {texto.length}/{LIMITE}
        </span>
        <button
          type="submit"
          disabled={pendente || texto.trim().length === 0}
          className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-50"
        >
          {pendente ? "Salvando..." : "Salvar observação"}
        </button>
      </div>
      {estado && "erro" in estado && (
        <p className="text-xs text-split-ember">{estado.erro}</p>
      )}
      {estado && "ok" in estado && (
        <p className="text-xs text-stadium-blue">Observação salva.</p>
      )}
    </form>
  );
}
