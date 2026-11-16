"use client";

import { useState } from "react";

const INICIAL = [80, 80, 82.5, 0];

// Amostra "de brinquedo" do registro de cargas, pra quem ainda não entrou
// sentir como funciona. Não salva nada.
export function DemoRegistro() {
  const [cargas, setCargas] = useState<number[]>(INICIAL);
  const [feitas, setFeitas] = useState<boolean[]>([true, true, false, false]);

  const volume = cargas.reduce((soma, kg, i) => (feitas[i] ? soma + kg : soma), 0);
  const total = feitas.filter(Boolean).length;

  function passo(i: number, delta: number) {
    setCargas((atual) => atual.map((kg, j) => (j === i ? Math.max(0, (kg || atual[j - 1] || 0) + delta) : kg)));
  }

  function alternar(i: number) {
    setCargas((atual) => atual.map((kg, j) => (j === i && !kg ? atual[j - 1] || 0 : kg)));
    setFeitas((atual) => atual.map((f, j) => (j === i ? !f : f)));
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-5 text-ink shadow-2xl shadow-black/40 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="font-display text-3xl leading-none font-extrabold text-ink/15">01</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-tight font-bold">Agachamento livre</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="tabular-data rounded-md bg-ink px-2 py-1 text-[11px] text-white">4x6-8</span>
            <span className="tabular-data rounded-md bg-bone px-2 py-1 text-[11px] text-ink/70">RIR 1-2</span>
            <span className="tabular-data rounded-md bg-bone px-2 py-1 text-[11px] text-ink/70">desc.: 2-3min</span>
          </div>
        </div>
        <span
          className={`tabular-data flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors ${
            total === 4 ? "bg-ok text-white" : "bg-bone text-cinza"
          }`}
        >
          {total}/4
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {cargas.map((kg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="rotulo w-7 text-center text-cinza">S{i + 1}</span>
            <div className={`flex flex-1 items-center rounded-xl ring-1 ${feitas[i] ? "ring-ok/50" : "ring-ash"}`}>
              <button
                type="button"
                onClick={() => passo(i, -2.5)}
                aria-label={`Série ${i + 1}: tirar 2,5 kg`}
                className="flex h-12 w-11 items-center justify-center rounded-l-xl text-xl text-cinza hover:bg-bone hover:text-ink"
              >
                −
              </button>
              <span className="font-display flex-1 text-center text-2xl font-bold tabular-nums">
                {kg ? String(kg).replace(".", ",") : <span className="text-ink/25">{String(cargas[i - 1] ?? 0).replace(".", ",")}</span>}
              </span>
              <span className="rotulo pr-1 text-cinza">kg</span>
              <button
                type="button"
                onClick={() => passo(i, 2.5)}
                aria-label={`Série ${i + 1}: somar 2,5 kg`}
                className="flex h-12 w-11 items-center justify-center rounded-r-xl text-xl text-cinza hover:bg-bone hover:text-ink"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => alternar(i)}
              aria-pressed={feitas[i]}
              aria-label={`Marcar série ${i + 1}`}
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all active:scale-95 ${
                feitas[i] ? "bg-ok text-white" : "bg-tartan text-white hover:bg-tartan-escuro"
              }`}
            >
              <svg key={String(feitas[i])} viewBox="0 0 12 12" fill="none" className="animate-carimbo h-5 w-5" aria-hidden>
                <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between border-t border-ash pt-4">
        <div>
          <p className="font-display text-4xl leading-none font-black tabular-nums">
            {String(volume).replace(".", ",")}
          </p>
          <p className="rotulo mt-1 text-cinza">Kg somados</p>
        </div>
        <p className="max-w-[11rem] text-right text-xs text-cinza">Experimente: mude a carga e marque as séries.</p>
      </div>
    </div>
  );
}
