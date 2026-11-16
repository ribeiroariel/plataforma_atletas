"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { FotoSite } from "@/lib/fotos";

function limitar(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// Quanto deslocar a imagem (0 a 1) pra que o ponto de foco caia no meio do
// quadro. "sobra" é o quanto a imagem é maior que o quadro naquele eixo; se
// não sobra nada, não há o que deslocar.
function deslocamento(foco: number, tamanhoImagem: number, tamanhoQuadro: number, alvo = 0.5): number {
  const sobra = tamanhoImagem - tamanhoQuadro;
  if (sobra <= 0.5) return 0.5;
  return limitar((foco * tamanhoImagem - tamanhoQuadro * alvo) / sobra);
}

// Foto que preenche o quadro mantendo o atleta no centro. O "object-position"
// comum não basta: a mesma porcentagem dá enquadramentos diferentes conforme
// o formato do quadro (largo no computador, em pé no celular), então aqui a
// posição é recalculada pelo tamanho real do quadro, inclusive ao redimensionar.
export function FotoFoco({
  foto,
  sizes,
  priority = false,
  className = "",
  alt,
  alvoXLargo,
}: {
  foto: FotoSite;
  sizes: string;
  priority?: boolean;
  className?: string;
  alt?: string;
  // Em quadros largos (computador), onde o atleta deve ficar na horizontal
  // (0 a 1). Serve pra tirá-lo de trás de um texto que ocupa um dos lados.
  alvoXLargo?: number;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [fx, fy] = foto.foco;
  // Antes de medir, usa o próprio foco como aproximação.
  const [posicao, setPosicao] = useState(`${fx * 100}% ${fy * 100}%`);

  useEffect(() => {
    const quadro = ref.current?.parentElement;
    if (!quadro) return;

    function calcular() {
      const { width, height } = quadro!.getBoundingClientRect();
      if (!width || !height) return;
      const escala = Math.max(width / foto.largura, height / foto.altura);
      const alvoX = alvoXLargo !== undefined && width >= 768 ? alvoXLargo : 0.5;
      const x = deslocamento(fx, foto.largura * escala, width, alvoX);
      const y = deslocamento(fy, foto.altura * escala, height);
      setPosicao(`${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`);
    }

    calcular();
    const obs = new ResizeObserver(calcular);
    obs.observe(quadro);
    return () => obs.disconnect();
  }, [foto.largura, foto.altura, fx, fy, alvoXLargo]);

  return (
    <Image
      ref={ref}
      src={foto.src}
      alt={alt ?? foto.alt}
      fill
      priority={priority}
      sizes={sizes}
      className={`object-cover ${className}`}
      style={{ objectPosition: posicao }}
    />
  );
}
