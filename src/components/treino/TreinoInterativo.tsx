"use client";

import { useMemo, useState } from "react";
import { diaDoMes } from "@/lib/datas";
import type { FeedbackSessao } from "@/lib/treino/logs";
import type { RecenteSessao } from "@/lib/treino/historico";
import { ehSemanaLeve } from "@/lib/treino/sugestao";
import type { GrupoTela, SessaoTela } from "@/lib/treino/montarSessoes";
import { chaveRegistro, type RegistroExercicio, type RegistroMapa } from "@/lib/treino/registros";
import { SessaoLeitura } from "./SessaoLeitura";
import { SessaoPainel } from "./SessaoPainel";

function Lua() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}

function treinavel(s: SessaoTela) {
  return !s.descanso && s.roteiro.length > 0;
}

// Tela de treino do atleta: escolhe a semana, escolhe o dia, e registra ali
// mesmo. Guarda registros e conclusões em estado local pra tudo responder na
// hora (placar, bolinhas dos dias), sem esperar o servidor redesenhar.
export function TreinoInterativo({
  planoId,
  grupos,
  registrosIniciais,
  concluidasIniciais,
  sessaoInicial,
  hoje,
  somenteLeitura = false,
  recordes = {},
  recentes = {},
  feedbacksIniciais = {},
}: {
  planoId: string;
  grupos: GrupoTela[];
  registrosIniciais: RegistroMapa;
  concluidasIniciais: string[];
  sessaoInicial?: string;
  hoje: string;
  // Visão do treinador: mesma navegação, mas só mostra o que o atleta fez.
  somenteLeitura?: boolean;
  // Maior carga já lançada em cada exercício (chave = nome normalizado).
  recordes?: Record<string, number>;
  // Últimos treinos de cada exercício (chave = nome normalizado), pra carga sugerida.
  recentes?: Record<string, RecenteSessao[]>;
  // Esforço/bem-estar já informados, por sessão.
  feedbacksIniciais?: Record<string, FeedbackSessao>;
}) {
  const [registros, setRegistros] = useState<RegistroMapa>(registrosIniciais);
  const [concluidas, setConcluidas] = useState<Set<string>>(() => new Set(concluidasIniciais));
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackSessao>>(feedbacksIniciais);

  const todas = useMemo(() => grupos.flatMap((g) => g.sessoes), [grupos]);

  const [ativa, setAtiva] = useState<string>(() => {
    const pedida = todas.find((s) => s.chave === sessaoInicial && treinavel(s));
    if (pedida) return pedida.chave;
    const deHoje = todas.find((s) => s.data === hoje && treinavel(s));
    if (deHoje) return deHoje.chave;
    if (somenteLeitura) {
      // Pro treinador, abre na sessão mais recente em que o atleta mexeu.
      const mexidas = todas.filter(
        (s) => treinavel(s) && (concluidasIniciais.includes(s.chave) || Object.keys(registrosIniciais).some((c) => c.startsWith(`${s.chave}:`))),
      );
      if (mexidas.length) return mexidas[mexidas.length - 1].chave;
    }
    const proxima = todas.find((s) => treinavel(s) && !concluidasIniciais.includes(s.chave));
    return (proxima ?? todas.find(treinavel) ?? todas[0])?.chave ?? "";
  });

  const indiceGrupo = Math.max(0, grupos.findIndex((g) => g.sessoes.some((s) => s.chave === ativa)));
  const grupo = grupos[indiceGrupo];
  const indiceSessao = grupo?.sessoes.findIndex((s) => s.chave === ativa) ?? -1;
  const sessao = grupo?.sessoes[indiceSessao];
  const candidataAnterior = indiceGrupo > 0 ? grupos[indiceGrupo - 1].sessoes[indiceSessao] : undefined;
  const anterior = candidataAnterior && treinavel(candidataAnterior) ? candidataAnterior : undefined;

  function irPara(chave: string) {
    setAtiva(chave);
    window.history.replaceState(null, "", `?sessao=${chave}`);
  }

  function trocarGrupo(i: number) {
    const destino = grupos[i];
    if (!destino) return;
    // Mantém o mesmo dia da semana quando der; senão, o primeiro dia de treino.
    const mesmoDia = destino.sessoes[indiceSessao];
    const alvo = mesmoDia && treinavel(mesmoDia) ? mesmoDia : destino.sessoes.find(treinavel);
    if (alvo) irPara(alvo.chave);
  }

  function aoRegistrar(itemIndex: number, serie: number, registro: RegistroExercicio | null) {
    if (!sessao) return;
    const chave = chaveRegistro(sessao.chave, itemIndex, serie);
    setRegistros((atual) => {
      const novo = { ...atual };
      if (registro) novo[chave] = registro;
      else delete novo[chave];
      return novo;
    });
  }

  function aoConcluir(chave: string, concluida: boolean) {
    setConcluidas((atual) => {
      const novo = new Set(atual);
      if (concluida) novo.add(chave);
      else novo.delete(chave);
      return novo;
    });
  }

  // Semana leve: pelo nome da semana/sessão na planilha, ou porque o último
  // treino (de outra sessão) veio com esforço 9–10 ou dor 7+.
  const ultimoFeedback = Object.entries(feedbacks)
    .filter(([chave]) => chave !== sessao?.chave)
    .map(([, f]) => f)
    .sort((a, b) => b.data.localeCompare(a.data))[0];
  const leve: { motivo: string } | null = !sessao
    ? null
    : ehSemanaLeve(grupo?.rotulo, grupo?.subtitulo, sessao.titulo, sessao.nota)
      ? { motivo: "Semana leve na planilha" }
      : ultimoFeedback && (ultimoFeedback.esforco >= 9 || (ultimoFeedback.dor ?? 0) >= 7)
        ? {
            motivo:
              (ultimoFeedback.dor ?? 0) >= 7
                ? `Você relatou dor ${ultimoFeedback.dor}/10 no último treino`
                : `Último treino com esforço ${ultimoFeedback.esforco}/10`,
          }
        : null;

  const treinaveis = todas.filter(treinavel);
  const feitas = treinaveis.filter((s) => concluidas.has(s.chave)).length;
  const fracao = treinaveis.length ? feitas / treinaveis.length : 0;
  const variasSemanas = grupos.length > 1;

  if (!grupo || !sessao) {
    return <p className="rounded-2xl bg-white p-6 text-sm text-cinza ring-1 ring-ash">Esse treino está vazio.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Progresso do plano */}
      <div className="flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ash">
          <div
            className="h-full rounded-full bg-tartan transition-[width] duration-700 ease-out"
            style={{ width: `${fracao * 100}%` }}
          />
        </div>
        <p className="tabular-data shrink-0 text-xs text-cinza">
          <span className="font-medium text-ink">{feitas}</span> de {treinaveis.length} treinos
        </p>
      </div>

      {/* Semanas */}
      {variasSemanas && (
        <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Semanas">
          {grupos.map((g, i) => {
            const doGrupo = g.sessoes.filter(treinavel);
            const feitasGrupo = doGrupo.filter((s) => concluidas.has(s.chave)).length;
            const on = i === indiceGrupo;
            const temHoje = g.sessoes.some((s) => s.data === hoje);
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => trocarGrupo(i)}
                className={`relative flex min-h-[56px] min-w-[7.5rem] shrink-0 flex-col justify-center rounded-xl px-4 text-left transition-colors ${
                  on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-ash hover:ring-ink/30"
                }`}
              >
                <span className="font-display text-lg leading-none font-bold uppercase">{g.rotulo}</span>
                <span className={`tabular-data mt-1 text-[11px] ${on ? "text-white/55" : "text-cinza"}`}>
                  {feitasGrupo}/{doGrupo.length} feitos{temHoje ? " · atual" : ""}
                </span>
                {temHoje && <span aria-hidden className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-tartan" />}
              </button>
            );
          })}
        </div>
      )}

      {grupo.subtitulo && <p className="-mt-2 text-sm text-cinza">{grupo.subtitulo}</p>}

      {/* Dias / blocos */}
      <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Sessões">
        {grupo.sessoes.map((s) => {
          const on = s.chave === ativa;
          const feita = concluidas.has(s.chave);
          const ehHoje = s.data === hoje;
          const podeAbrir = treinavel(s);
          return (
            <button
              key={s.chave}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${s.rotulo}${s.descanso ? ", descanso" : feita ? ", concluído" : ""}`}
              disabled={!podeAbrir}
              onClick={() => irPara(s.chave)}
              className={`relative flex min-h-[68px] min-w-[3.1rem] flex-col items-center justify-center gap-1 rounded-xl transition-all ${
                grupo.sessoes.length >= 5 ? "flex-1" : "w-20 flex-none"
              } ${
                on
                  ? "bg-tartan text-white shadow-lg shadow-tartan/25"
                  : podeAbrir
                    ? "bg-white text-ink ring-1 ring-ash hover:ring-ink/30"
                    : "border border-dashed border-ash bg-transparent text-cinza/70"
              }`}
            >
              <span className="rotulo text-[10px] opacity-80">{s.rotuloCurto}</span>
              <span className="font-display flex h-6 items-center text-xl leading-none font-extrabold tabular-nums">
                {s.descanso ? <Lua /> : s.data ? diaDoMes(s.data) : s.rotuloCurto.replace(/\D/g, "") || "•"}
              </span>
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  feita ? (on ? "bg-white" : "bg-ok") : ehHoje ? (on ? "bg-white/60" : "bg-tartan") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {somenteLeitura ? (
        <SessaoLeitura
          key={sessao.chave}
          sessao={sessao}
          anterior={anterior}
          registros={registros}
          concluida={concluidas.has(sessao.chave)}
          feedback={feedbacks[sessao.chave]}
        />
      ) : (
      <SessaoPainel
        key={sessao.chave}
        planoId={planoId}
        sessao={sessao}
        anterior={anterior}
        registros={registros}
        concluida={concluidas.has(sessao.chave)}
        onRegistro={aoRegistrar}
        recordes={recordes}
        recentes={recentes}
        leve={leve}
        feedback={feedbacks[sessao.chave]}
        onConcluida={(c) => aoConcluir(sessao.chave, c)}
        onFeedback={(f) => setFeedbacks((atual) => ({ ...atual, [sessao.chave]: f }))}
      />
      )}
    </div>
  );
}
