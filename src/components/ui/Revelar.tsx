"use client";

import { useEffect, useRef, useState } from "react";

// Faz o conteúdo surgir quando entra na tela. "cortina" revela de cima pra
// baixo (bom pra foto); o padrão sobe com fade.
export function Revelar({
  children,
  className = "",
  modo = "subir",
  atraso = 0,
}: {
  children: React.ReactNode;
  className?: string;
  modo?: "subir" | "cortina";
  atraso?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const estilo = { "--atraso": `${atraso}ms` } as React.CSSProperties;

  // Na cortina o recorte fica numa camada de dentro: se o próprio elemento
  // observado estivesse 100% recortado, o navegador nunca o consideraria
  // "na tela" e a foto não apareceria nunca.
  if (modo === "cortina") {
    return (
      <div ref={ref} className={className}>
        <div data-modo="cortina" data-visivel={visivel} className="revelar absolute inset-0" style={estilo}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} data-modo={modo} data-visivel={visivel} className={`revelar ${className}`} style={estilo}>
      {children}
    </div>
  );
}
