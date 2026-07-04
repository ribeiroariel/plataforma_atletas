"use client";

import { useState, useTransition } from "react";
import { desconectar, sincronizar } from "@/lib/actions/strava";

export function CartaoStrava({
  conectado,
  disponivel,
  ultimaMensagem,
}: {
  conectado: boolean;
  disponivel: boolean;
  ultimaMensagem?: string;
}) {
  const [mensagem, setMensagem] = useState<string | null>(ultimaMensagem ?? null);
  const [pendente, iniciar] = useTransition();

  if (!disponivel) {
    return (
      <div className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4 text-sm text-track-fog">
        Integração com o Strava ainda não configurada.
      </div>
    );
  }

  function aoSincronizar() {
    iniciar(async () => {
      const r = await sincronizar();
      setMensagem(
        "erro" in r
          ? r.erro
          : r.inseridas > 0
            ? `${r.inseridas} dia(s) de treino atualizados do Strava.`
            : "Nenhuma atividade nova encontrada.",
      );
    });
  }

  function aoDesconectar() {
    iniciar(async () => {
      const r = await desconectar();
      setMensagem("erro" in r ? r.erro : "Conta do Strava desconectada.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-track-night">Strava</h3>
          <p className="text-xs text-track-fog">
            {conectado
              ? "Conta conectada — corrida, bike e cardio entram no seu histórico."
              : "Conecte para trazer corrida, bike e cardio automaticamente."}
          </p>
        </div>
        {conectado ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={aoSincronizar}
              disabled={pendente}
              className="rounded-[var(--radius-badge)] bg-stadium-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-60"
            >
              {pendente ? "Sincronizando..." : "Sincronizar"}
            </button>
            <button
              type="button"
              onClick={aoDesconectar}
              disabled={pendente}
              className="rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 text-sm text-track-night hover:bg-lane-chalk disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <a
            href="/api/strava/authorize"
            className="shrink-0 rounded-[var(--radius-badge)] bg-[#FC4C02] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Conectar Strava
          </a>
        )}
      </div>
      {mensagem && <p className="text-xs text-stadium-blue">{mensagem}</p>}
    </div>
  );
}
