"use client";

import { useId, useState, useTransition } from "react";
import { atualizarDataInicioPlano } from "@/lib/actions/plano";
import { dataCurta } from "@/lib/datas";

// Botão logo abaixo de cada plano na página do atleta: mostra quando a
// Semana 1 começa e abre um campo de data para definir/alterar. Plano sem
// data definida (só a de envio) fica destacado, pra não passar batido.
export function BotaoDataInicio({
  trainingPlanId,
  athleteId,
  dataInicio,
  dataCriacao,
}: {
  trainingPlanId: string;
  athleteId: string;
  dataInicio: string | null;
  dataCriacao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(dataInicio ?? dataCriacao);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const inputId = useId();

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarDataInicioPlano(trainingPlanId, athleteId, valor);
      if ("erro" in r) setErro(r.erro);
      else setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold tracking-wide uppercase transition-colors ${
          dataInicio
            ? "bg-bone text-ink ring-1 ring-ash hover:ring-ink/30"
            : "bg-tartan text-white hover:bg-tartan/90"
        }`}
      >
        {dataInicio ? `Início: ${dataCurta(dataInicio)} · alterar` : "Definir data de início"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={inputId} className="rotulo text-cinza">
        Semana 1 começa em
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
        disabled={pendente || !valor}
        className="h-11 rounded-xl bg-ink px-4 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-ink-3 disabled:opacity-30"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setAberto(false);
          setErro(null);
        }}
        className="h-11 rounded-xl px-3 text-xs font-bold tracking-wide text-cinza uppercase hover:text-ink"
      >
        Cancelar
      </button>
      {erro && (
        <span aria-live="polite" className="text-xs text-erro">
          {erro}
        </span>
      )}
    </div>
  );
}
