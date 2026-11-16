"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Alerta, DiaResumo } from "@/lib/treinador/resumoAtletas";
import { Avatar, SemanaPontos } from "./pecas";

export type CartaoAtleta = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  plano: string | null;
  semana: DiaResumo[];
  planejadosSemana: number;
  feitosSemana: number;
  feitosPlano: number;
  totalPlano: number;
  diasSemAtividade: number | null;
  ultimaAtividade: string; // já em texto: "há 2 dias"
  kgSemana: string | null;
  alertas: Alerta[];
};

type Ordem = "atencao" | "nome" | "adesao";

const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: "atencao", rotulo: "Atenção primeiro" },
  { valor: "adesao", rotulo: "Mais em dia" },
  { valor: "nome", rotulo: "Nome" },
];

function adesao(a: CartaoAtleta): number {
  return a.planejadosSemana ? a.feitosSemana / a.planejadosSemana : -1;
}

function peso(a: CartaoAtleta): number {
  return a.alertas.reduce((s, al) => s + (al.grave ? 10 : 3), 0) + (a.diasSemAtividade ?? 30) / 10;
}

// Os atletas em cartões, com busca e ordenação — pra achar rápido quem
// precisa de atenção quando a lista crescer.
export function GradeAtletas({ atletas, hoje }: { atletas: CartaoAtleta[]; hoje: string }) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("atencao");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = termo ? atletas.filter((a) => a.nome.toLowerCase().includes(termo)) : [...atletas];
    return filtrados.sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordem === "adesao") return adesao(b) - adesao(a);
      return peso(b) - peso(a);
    });
  }, [atletas, busca, ordem]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Buscar atleta</span>
          <svg
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-cinza"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar atleta"
            className="h-11 w-full rounded-full bg-white pr-4 pl-10 text-sm text-ink ring-1 ring-ash outline-none placeholder:text-cinza focus:ring-2 focus:ring-ink"
          />
        </label>
        <div role="radiogroup" aria-label="Ordenar por" className="flex gap-1">
          {ORDENS.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ordem === o.valor}
              onClick={() => setOrdem(o.valor)}
              className={`h-11 rounded-full px-4 text-xs font-semibold transition-colors ${
                ordem === o.valor ? "bg-ink text-white" : "bg-white text-cinza ring-1 ring-ash hover:text-ink"
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-8 text-center text-sm text-cinza ring-1 ring-ash">
          Nenhum atleta com “{busca}”.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((a) => {
            const grave = a.alertas.some((al) => al.grave);
            return (
              <li key={a.id}>
                <Link
                  href={`/treinador/atletas/${a.id}`}
                  className="group flex h-full flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-ash transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ink/5 hover:ring-ink/30 sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nome={a.nome} url={a.avatarUrl} tamanho={48} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-2xl leading-none font-extrabold uppercase">{a.nome}</p>
                      <p className="mt-1 truncate text-xs text-cinza">{a.plano ?? "Sem plano enviado"}</p>
                    </div>
                    {a.alertas.length > 0 && (
                      <span
                        aria-label={`${a.alertas.length} ponto${a.alertas.length > 1 ? "s" : ""} de atenção`}
                        className={`tabular-data flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-medium ${
                          grave ? "bg-erro text-white" : "bg-sinal text-ink"
                        }`}
                      >
                        {a.alertas.length}
                      </span>
                    )}
                  </div>

                  <SemanaPontos dias={a.semana} hoje={hoje} />

                  <dl className="grid grid-cols-3 gap-2 border-t border-ash pt-3">
                    <div className="flex flex-col-reverse">
                      <dt className="rotulo text-[9px] text-cinza">Na semana</dt>
                      <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">
                        {a.planejadosSemana ? `${a.feitosSemana}/${a.planejadosSemana}` : "—"}
                      </dd>
                    </div>
                    <div className="flex flex-col-reverse">
                      <dt className="rotulo text-[9px] text-cinza">Do plano</dt>
                      <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">
                        {a.totalPlano ? `${Math.round((a.feitosPlano / a.totalPlano) * 100)}%` : "—"}
                      </dd>
                    </div>
                    <div className="flex flex-col-reverse">
                      <dt className="rotulo text-[9px] text-cinza">Kg na semana</dt>
                      <dd className="font-display text-2xl leading-none font-extrabold tabular-nums">{a.kgSemana ?? "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-cinza">
                      {a.alertas[0] ? (
                        <span className={grave ? "font-medium text-erro" : "text-ink"}>{a.alertas[0].texto}</span>
                      ) : (
                        <>Último registro {a.ultimaAtividade}</>
                      )}
                    </p>
                    <span className="shrink-0 text-cinza transition-all group-hover:translate-x-1 group-hover:text-ink" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
