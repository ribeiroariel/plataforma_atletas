"use client";

import { useActionState, useState } from "react";
import { registrarTreino } from "@/lib/actions/registro";

const TIPOS = [
  { valor: "academia", rotulo: "Academia" },
  { valor: "corrida", rotulo: "Corrida" },
  { valor: "bicicleta", rotulo: "Bicicleta" },
  { valor: "cardio", rotulo: "Cardio" },
] as const;

const hojeIso = () => new Date().toISOString().slice(0, 10);

export function RegistroTreinoForm() {
  const [estado, formAction, pendente] = useActionState(registrarTreino, null);
  const [tipo, setTipo] = useState<string>("corrida");
  const [modoSegundo, setModoSegundo] = useState<"tempo" | "pace">("tempo");

  const ehCorridaOuBicicleta = tipo === "corrida" || tipo === "bicicleta";

  const rotuloValor = tipo === "academia" ? "Volume (kg)" : "Tempo (min)";

  return (
    <details className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-track-night">
        + Registrar treino manualmente
      </summary>
      <form action={formAction} className="flex flex-col gap-3 border-t border-track-fog/15 px-4 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-track-night">
            Tipo
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-track-night">
            Data
            <input
              type="date"
              name="data"
              required
              defaultValue={hojeIso()}
              max={hojeIso()}
              className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            />
          </label>
        </div>

        {ehCorridaOuBicicleta ? (
          <>
            <label className="flex flex-col gap-1 text-sm text-track-night">
              Distância (km)
              <input
                type="text"
                name="distancia"
                required
                inputMode="decimal"
                placeholder="ex.: 10"
                className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
              />
            </label>

            <div className="flex gap-2 text-sm">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 has-[:checked]:border-stadium-blue has-[:checked]:bg-stadium-blue/5">
                <input
                  type="radio"
                  name="modoSegundo"
                  value="tempo"
                  checked={modoSegundo === "tempo"}
                  onChange={() => setModoSegundo("tempo")}
                />
                Por tempo
              </label>
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 has-[:checked]:border-stadium-blue has-[:checked]:bg-stadium-blue/5">
                <input
                  type="radio"
                  name="modoSegundo"
                  value="pace"
                  checked={modoSegundo === "pace"}
                  onChange={() => setModoSegundo("pace")}
                />
                Por pace
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm text-track-night">
              {modoSegundo === "pace" ? "Pace (min/km)" : "Tempo (min)"}
              <input
                type="text"
                name="segundo"
                required
                inputMode="decimal"
                placeholder={modoSegundo === "pace" ? "ex.: 5:30" : "ex.: 55"}
                className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
              />
            </label>
            <p className="text-xs text-track-fog">
              O outro valor (pace ou tempo) é calculado automaticamente a partir da distância.
            </p>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-sm text-track-night">
            {rotuloValor}
            <input
              type="text"
              name="valor"
              required
              inputMode="decimal"
              placeholder="ex.: 10"
              className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            />
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs">
            {estado && "erro" in estado && <span className="text-split-ember">{estado.erro}</span>}
            {estado && "ok" in estado && <span className="text-stadium-blue">Registro salvo.</span>}
          </div>
          <button
            type="submit"
            disabled={pendente}
            className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-60"
          >
            {pendente ? "Salvando..." : "Salvar registro"}
          </button>
        </div>
      </form>
    </details>
  );
}
