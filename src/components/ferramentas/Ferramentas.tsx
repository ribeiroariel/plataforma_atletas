"use client";

import { useEffect, useRef, useState } from "react";
import {
  ANILHAS_PADRAO,
  arredondarCarga,
  cargaParaReps,
  descreverAnilhas,
  estimar1RM,
  montarBarra,
  repsEsperadas,
} from "@/lib/treino/rm";

type Aba = "rm" | "anilhas" | "crono";

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "rm", rotulo: "Calculadora de RM" },
  { valor: "anilhas", rotulo: "Anilhas" },
  { valor: "crono", rotulo: "Cronômetro" },
];

function num(v: number, casas = 1) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

function lerNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function Campo({
  rotulo,
  valor,
  onChange,
  sufixo,
  inteiro = false,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  sufixo: string;
  inteiro?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="rotulo text-cinza">{rotulo}</span>
      <span className="flex items-center rounded-xl bg-white ring-1 ring-ash focus-within:ring-2 focus-within:ring-ink">
        <input
          type="text"
          inputMode={inteiro ? "numeric" : "decimal"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="font-display h-14 w-full min-w-0 bg-transparent px-4 text-3xl font-extrabold tabular-nums text-ink outline-none"
        />
        <span className="rotulo pr-4 text-cinza">{sufixo}</span>
      </span>
    </label>
  );
}

const PERCENTUAIS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50];

function CalculadoraRM() {
  const [carga, setCarga] = useState("80");
  const [reps, setReps] = useState("5");
  const kg = lerNumero(carga);
  const n = Math.round(lerNumero(reps));
  const rm = estimar1RM(kg, n);
  const confiavel = n >= 1 && n <= 12;

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm text-cinza">
        Diga uma carga e quantas repetições você fez com ela. A calculadora estima sua carga máxima para uma repetição
        (1RM) e quanto usar em cada faixa de esforço.
      </p>
      <div className="flex gap-3">
        <Campo rotulo="Carga levantada" valor={carga} onChange={setCarga} sufixo="kg" />
        <Campo rotulo="Repetições" valor={reps} onChange={setReps} sufixo="reps" inteiro />
      </div>

      <div className="raias flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-ink p-5 text-white">
        <div>
          <p className="rotulo text-tartan">1RM estimado</p>
          <p className="font-display text-7xl leading-none font-black tabular-nums">
            {rm > 0 ? num(rm) : "—"}
            <span className="text-2xl text-white/50"> kg</span>
          </p>
        </div>
        <p className="max-w-[16rem] text-xs text-white/55">
          {rm <= 0
            ? "Preencha carga e repetições."
            : confiavel
              ? "Estimativa pela fórmula de Epley. É uma referência, não um teste de carga máxima."
              : "Acima de 12 repetições a estimativa perde precisão — use uma série mais pesada e curta."}
        </p>
      </div>

      {rm > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-ash">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="rotulo text-[10px] text-cinza">
                <th className="px-4 py-3 font-medium">% do 1RM</th>
                <th className="px-4 py-3 text-right font-medium">Carga</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Arredondada</th>
                <th className="px-4 py-3 text-right font-medium">Reps esperadas</th>
              </tr>
            </thead>
            <tbody>
              {PERCENTUAIS.map((p) => {
                const c = (rm * p) / 100;
                return (
                  <tr key={p} className="border-t border-ash">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-3">
                        <span className="font-display w-12 text-xl font-extrabold tabular-nums">{p}%</span>
                        <span aria-hidden className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-bone sm:block">
                          <span className="block h-full rounded-full bg-tartan" style={{ width: `${p}%` }} />
                        </span>
                      </span>
                    </td>
                    <td className="tabular-data px-4 py-2.5 text-right">{num(c)} kg</td>
                    <td className="font-display hidden px-4 py-2.5 text-right text-lg font-bold tabular-nums sm:table-cell">
                      {num(arredondarCarga(c))} kg
                    </td>
                    <td className="tabular-data px-4 py-2.5 text-right text-cinza">~{repsEsperadas(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rm > 0 && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-ash">
          <p className="rotulo text-cinza">Carga para cada número de repetições</p>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[1, 2, 3, 5, 8, 10].map((r) => (
              <li key={r} className="flex flex-col rounded-xl bg-bone p-3">
                <span className="font-display text-2xl leading-none font-extrabold tabular-nums">
                  {num(arredondarCarga(cargaParaReps(rm, r)))}
                </span>
                <span className="rotulo mt-1 text-[10px] text-cinza">
                  {r} {r === 1 ? "rep" : "reps"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const CORES_ANILHA: Record<number, string> = {
  25: "bg-erro text-white",
  20: "bg-[#1f4fb5] text-white",
  15: "bg-sinal text-ink",
  10: "bg-ok text-white",
  5: "bg-white text-ink ring-1 ring-ink/30",
  2.5: "bg-ink text-white",
  1.25: "bg-cinza text-white",
};

function Anilhas() {
  const [carga, setCarga] = useState("100");
  const [barra, setBarra] = useState(20);
  const kg = lerNumero(carga);
  const m = montarBarra(kg, barra);

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm text-cinza">
        Digite a carga total que você quer na barra e veja quais anilhas colocar de cada lado.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Campo rotulo="Carga total" valor={carga} onChange={setCarga} sufixo="kg" />
        <div className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Barra</span>
          <div role="radiogroup" aria-label="Peso da barra" className="flex gap-1">
            {[20, 15, 10].map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={barra === b}
                onClick={() => setBarra(b)}
                className={`font-display h-14 rounded-xl px-4 text-xl font-extrabold tabular-nums transition-colors ${
                  barra === b ? "bg-ink text-white" : "bg-white text-cinza ring-1 ring-ash hover:text-ink"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="raias flex flex-col gap-5 rounded-2xl bg-ink p-5 text-white">
        <div>
          <p className="rotulo text-tartan">De cada lado</p>
          <p className="font-display text-4xl leading-tight font-black sm:text-5xl">
            {kg < barra ? "Menos que a barra" : descreverAnilhas(m.porLado)}
          </p>
        </div>

        {/* Desenho da barra: metade esquerda espelhada na direita */}
        {m.porLado.length > 0 && (
          <div className="flex items-center justify-center overflow-x-auto py-2" aria-hidden>
            {[...m.porLado].reverse().map((a, i) => (
              <span
                key={`e${i}`}
                className={`tabular-data mx-px flex w-6 items-center justify-center rounded-sm text-[9px] ${CORES_ANILHA[a] ?? "bg-white text-ink"}`}
                style={{ height: `${40 + a * 3.2}px` }}
              >
                {String(a).replace(".", ",")}
              </span>
            ))}
            <span className="h-2 w-24 bg-white/60 sm:w-40" />
            {m.porLado.map((a, i) => (
              <span
                key={`d${i}`}
                className={`tabular-data mx-px flex w-6 items-center justify-center rounded-sm text-[9px] ${CORES_ANILHA[a] ?? "bg-white text-ink"}`}
                style={{ height: `${40 + a * 3.2}px` }}
              >
                {String(a).replace(".", ",")}
              </span>
            ))}
          </div>
        )}

        <p className="tabular-data text-xs text-white/60">
          Barra {barra} kg + 2 × {num(m.porLado.reduce((s, a) => s + a, 0), 2)} kg = {num(m.montada, 2)} kg
          {m.sobra > 0 && <span className="text-sinal"> · faltam {num(m.sobra, 2)} kg que não fecham com as anilhas</span>}
        </p>
      </div>
      <p className="text-xs text-cinza">Considera anilhas de {ANILHAS_PADRAO.map((a) => String(a).replace(".", ",")).join(", ")} kg.</p>
    </div>
  );
}

function formatarTempo(ms: number): string {
  const total = Math.max(0, ms);
  const min = Math.floor(total / 60000);
  const seg = Math.floor((total % 60000) / 1000);
  const cent = Math.floor((total % 1000) / 10);
  return `${min > 0 ? `${min}:` : ""}${min > 0 ? String(seg).padStart(2, "0") : seg},${String(cent).padStart(2, "0")}`;
}

function Cronometro() {
  // inicio: instante em que começou a contar (já descontado o tempo acumulado).
  const [inicio, setInicio] = useState<number | null>(null);
  const [acumulado, setAcumulado] = useState(0);
  const [agora, setAgora] = useState(0);
  const [voltas, setVoltas] = useState<number[]>([]);
  const quadro = useRef(0);

  useEffect(() => {
    if (inicio === null) return;
    function tique() {
      setAgora(Date.now());
      quadro.current = requestAnimationFrame(tique);
    }
    quadro.current = requestAnimationFrame(tique);
    return () => cancelAnimationFrame(quadro.current);
  }, [inicio]);

  const tempo = inicio !== null ? Math.max(0, agora - inicio) : acumulado;
  const rodando = inicio !== null;

  function alternar() {
    if (rodando) {
      setAcumulado(Date.now() - (inicio ?? Date.now()));
      setInicio(null);
    } else {
      const t = Date.now();
      setAgora(t);
      setInicio(t - acumulado);
    }
  }

  function volta() {
    if (rodando) setVoltas((v) => [...v, Date.now() - (inicio ?? Date.now())]);
  }

  function zerar() {
    setInicio(null);
    setAcumulado(0);
    setVoltas([]);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-xl text-sm text-cinza">
        Para tiros e intervalos na pista. “Volta” guarda o tempo de cada repetição sem parar o relógio.
      </p>
      <div className="raias flex flex-col items-center gap-6 rounded-2xl bg-ink px-5 py-10 text-white">
        <p
          role="timer"
          aria-live="off"
          className={`font-display text-[clamp(4rem,22vw,9rem)] leading-none font-black tabular-nums ${rodando ? "" : "text-white/80"}`}
        >
          {formatarTempo(tempo)}
        </p>
        <div className="flex w-full max-w-md gap-2">
          <button
            type="button"
            onClick={rodando ? volta : zerar}
            disabled={!rodando && tempo === 0}
            className="h-14 flex-1 rounded-xl bg-white/10 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-white/20 disabled:opacity-30"
          >
            {rodando ? "Volta" : "Zerar"}
          </button>
          <button
            type="button"
            onClick={alternar}
            className={`h-14 flex-[2] rounded-xl text-sm font-bold tracking-wide uppercase transition-all active:scale-[0.98] ${
              rodando ? "bg-white text-ink" : "bg-tartan text-white hover:bg-tartan-escuro"
            }`}
          >
            {rodando ? "Parar" : tempo > 0 ? "Continuar" : "Iniciar"}
          </button>
        </div>
      </div>

      {voltas.length > 0 && (
        <ol className="overflow-hidden rounded-2xl bg-white ring-1 ring-ash">
          {voltas.map((t, i) => {
            const parcial = t - (voltas[i - 1] ?? 0);
            return (
              <li key={i} className="flex items-baseline justify-between gap-3 border-t border-ash px-4 py-3 first:border-0">
                <span className="rotulo text-cinza">Volta {i + 1}</span>
                <span className="font-display text-2xl font-extrabold tabular-nums">{formatarTempo(parcial)}</span>
                <span className="tabular-data w-20 text-right text-xs text-cinza">{formatarTempo(t)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function Ferramentas({ inicial = "rm" }: { inicial?: Aba }) {
  const [aba, setAba] = useState<Aba>(inicial);
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Ferramentas" className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            role="tab"
            aria-selected={aba === a.valor}
            onClick={() => setAba(a.valor)}
            className={`font-display h-12 shrink-0 rounded-xl px-5 text-lg font-bold uppercase transition-colors ${
              aba === a.valor ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-ash hover:ring-ink/30"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {aba === "rm" ? <CalculadoraRM /> : aba === "anilhas" ? <Anilhas /> : <Cronometro />}
    </div>
  );
}
