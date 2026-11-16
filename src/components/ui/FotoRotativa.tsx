"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type Foto = { src: string; posicao?: string };

export const FOTOS_PISTA: Foto[] = [
  { src: "/fotos/hero-chegada.webp", posicao: "66% 28%" },
  { src: "/fotos/futebol-conducao.webp", posicao: "55% 32%" },
  { src: "/fotos/salto-corrida.webp", posicao: "45% 28%" },
  { src: "/fotos/futebol-disputa.webp", posicao: "55% 38%" },
  { src: "/fotos/revezamento.webp", posicao: "38% 40%" },
  { src: "/fotos/prova-167.webp", posicao: "58% 38%" },
];

// Fundo de fotos que vão se revezando com fade e um zoom lento. A primeira
// já vem pronta do servidor; as outras só entram depois, pra não pesar a
// abertura da página.
export function FotoRotativa({
  fotos = FOTOS_PISTA,
  intervalo = 6500,
  inicio = 0,
  sizes = "100vw",
}: {
  fotos?: Foto[];
  intervalo?: number;
  inicio?: number;
  sizes?: string;
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
          <Image
            key={foto.src}
            src={foto.src}
            alt=""
            fill
            priority={i === primeira}
            sizes={sizes}
            className={`object-cover transition-opacity duration-[1800ms] ease-in-out ${
              on ? "foto-zoom opacity-100" : "opacity-0"
            }`}
            style={{ objectPosition: foto.posicao ?? "center" }}
          />
        );
      })}
    </div>
  );
}
