"use client";

import { useState } from "react";
import {
  type BlocoSessao,
  type BlocoTexto,
  type DiaSemana,
  type ModoBlocos,
  type ModoSemana,
  unidadesRegistraveis,
} from "@/lib/planilha/parseTreino";
import { BlocosTextoView } from "./BlocosTextoView";
import { BotaoConcluido } from "./BotaoConcluido";
import { SessaoRegistros } from "./SessaoRegistros";
import type { RegistroMapa } from "./ExercicioRegistro";

type SessaoFoco = {
  raw: DiaSemana | BlocoSessao;
  chave: string;
  rotuloCurto: string;
  titulo: string;
  descanso: boolean;
  blocos: BlocoTexto[];
  parametros?: string;
  posicao: string;
};

function resumoTexto(blocos: BlocoTexto[], fallback: string): string {
  const primeiro = blocos[0];
  if (!primeiro) return fallback;
  if (primeiro.tipo === "paragrafo" || primeiro.tipo === "subtitulo" || primeiro.tipo === "item-numerado") {
    return primeiro.texto;
  }
  return fallback;
}

function montarEntradas(treino: ModoSemana | ModoBlocos): SessaoFoco[] {
  if (treino.tipo === "semana") {
    const entradas: SessaoFoco[] = [];
    treino.semanas.forEach((semana) => {
      semana.dias.forEach((dia) => {
        entradas.push({
          raw: dia,
          chave: dia.chave,
          rotuloCurto: dia.dia,
          titulo: resumoTexto(dia.blocos, dia.dia),
          descanso: dia.descanso,
          blocos: dia.blocos,
          posicao: `${dia.dia} · ${semana.rotulo.replace(/\n/g, " ")}`,
        });
      });
    });
    return entradas;
  }

  return treino.sessao.map((bloco, i) => ({
    raw: bloco,
    chave: bloco.chave,
    rotuloCurto: `BLOCO ${bloco.numero}`,
    titulo: bloco.titulo,
    descanso: false,
    blocos: bloco.blocos,
    parametros: bloco.parametros || undefined,
    posicao: `Bloco ${i + 1} de ${treino.sessao.length}`,
  }));
}

// Substitui o accordion inline: a lista mostra as sessões compactas e tocar
// numa abre uma tela dedicada (foco), com navegação anterior/próximo entre
// sessões sem voltar pra lista.
export function TreinoImersivo({
  treino,
  trainingPlanId,
  concluidas,
  registros,
  legenda,
}: {
  treino: ModoSemana | ModoBlocos;
  trainingPlanId: string;
  concluidas: string[];
  registros: RegistroMapa;
  legenda?: string;
}) {
  const entradas = montarEntradas(treino);
  const [focoIndex, setFocoIndex] = useState<number | null>(null);

  const feito = (chave: string) => concluidas.includes(chave);
  const treinaveis = entradas.filter((e) => !e.descanso);
  const concluidasCount = treinaveis.filter((e) => feito(e.chave)).length;

  if (focoIndex !== null) {
    const entrada = entradas[focoIndex];

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFocoIndex(null)}
            className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-stadium-blue"
          >
            ← Voltar
          </button>
          {!entrada.descanso && (
            <BotaoConcluido
              trainingPlanId={trainingPlanId}
              sessionKey={entrada.chave}
              concluidoInicial={feito(entrada.chave)}
            />
          )}
        </div>

        <div className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4 sm:p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-stadium-blue">
            {entrada.posicao}
          </span>
          <h2 className="mt-1 font-display text-xl font-bold text-track-night">{entrada.titulo}</h2>

          {entrada.descanso ? (
            <p className="mt-4 text-sm text-track-fog">Dia de descanso.</p>
          ) : (
            <>
              <div className="mt-4">
                <BlocosTextoView blocos={entrada.blocos} />
              </div>
              {entrada.parametros && (
                <p className="tabular-data mt-3 border-t border-track-fog/15 pt-2 text-xs text-track-fog whitespace-pre-line">
                  {entrada.parametros}
                </p>
              )}
              <SessaoRegistros
                trainingPlanId={trainingPlanId}
                sessionKey={entrada.chave}
                unidades={unidadesRegistraveis(entrada.raw)}
                registros={registros}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={focoIndex === 0}
            onClick={() => setFocoIndex((i) => Math.max(0, (i ?? 0) - 1))}
            className="min-h-[44px] flex-1 rounded-[var(--radius-badge)] border border-track-fog/40 px-4 text-sm text-track-night disabled:opacity-30"
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            disabled={focoIndex === entradas.length - 1}
            onClick={() => setFocoIndex((i) => Math.min(entradas.length - 1, (i ?? 0) + 1))}
            className="min-h-[44px] flex-1 rounded-[var(--radius-badge)] border border-track-fog/40 px-4 text-sm text-track-night disabled:opacity-30"
          >
            Próximo ›
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {treinaveis.length > 0 && (
        <p className="text-xs font-medium tracking-wide text-track-fog uppercase">
          {concluidasCount} de {treinaveis.length} sessões concluídas
        </p>
      )}
      <div className="flex flex-col gap-2">
        {entradas.map((entrada, i) =>
          entrada.descanso ? (
            <div
              key={entrada.chave}
              className="flex min-h-[44px] items-center justify-between rounded-[var(--radius-badge)] px-4 py-3 text-sm text-track-fog"
            >
              <span className="font-medium uppercase tracking-wide">{entrada.rotuloCurto}</span>
              <span>Descanso</span>
            </div>
          ) : (
            <button
              key={entrada.chave}
              type="button"
              onClick={() => setFocoIndex(i)}
              className={`flex min-h-[44px] items-center gap-3 rounded-[var(--radius-badge)] border bg-white px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3 ${
                feito(entrada.chave) ? "border-stadium-blue/40" : "border-track-fog/25"
              }`}
            >
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-stadium-blue">
                {entrada.rotuloCurto}
              </span>
              <span className="line-clamp-2 flex-1 text-sm text-track-night/80">{entrada.titulo}</span>
              {feito(entrada.chave) && (
                <span className="shrink-0 text-xs font-medium text-stadium-blue" aria-label="Concluído">
                  ✓
                </span>
              )}
              <span className="shrink-0 text-track-fog" aria-hidden>
                ›
              </span>
            </button>
          ),
        )}
      </div>
      {legenda && (
        <p className="rounded-[var(--radius-badge)] bg-deep-lane/5 px-4 py-3 text-xs text-track-fog">
          {legenda}
        </p>
      )}
    </div>
  );
}
