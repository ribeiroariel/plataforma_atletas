"use client";

import { useEffect, useState } from "react";
import { FOTOS, type FotoSite } from "@/lib/fotos";
import { FotoFoco } from "./FotoFoco";

// Só fotos dos atletas.
export const FOTOS_PISTA: FotoSite[] = [
  FOTOS.saltoCorrida,
  FOTOS.futebolConducao,
  FOTOS.revezamento,
  FOTOS.futebolDisputa,
  FOTOS.saltoAreia,
];

// Fundo de fotos que vão se revezando com fade e um zoom lento. A primeira
// já vem pronta do servidor; as outras só entram depois, pra não pesar a
// abertura da página.
export function FotoRotativa({
  fotos = FOTOS_PISTA,
  intervalo = 6500,
  inicio = 0,
  sizes = "100vw",
  alvoXLargo,
}: {
  fotos?: FotoSite[];
  intervalo?: number;
  inicio?: number;
  sizes?: string;
  alvoXLargo?: number;
}) {
  const primeira = inicio % fotos.length;
  const [ativa, setAtiva] = useState(primeira);
  const [carregarTodas, setCarregarTodas] = useState(false);

  useEffect(() => {
    if (fotos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const liberar = setTimeout(() => setCarregarTodas(true), 2500);
    const id = setInterval(() => setAtiva((i) => (i + 1) % fotos.length), intervalo);
    return () => {
      clearTimeout(liberar);
      clearInterval(id);
    };
  }, [fotos.length, intervalo]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" aria-hidden>
      {fotos.map((foto, i) => {
        if (i !== primeira && !carregarTodas) return null;
        const on = i === ativa;
        return (
          <FotoFoco
            key={foto.src}
            foto={foto}
            alt=""
            priority={i === primeira}
            sizes={sizes}
            alvoXLargo={alvoXLargo}
            className={`transition-opacity duration-[1800ms] ease-in-out ${on ? "foto-zoom opacity-100" : "opacity-0"}`}
          />
        );
      })}
    </div>
  );
}
