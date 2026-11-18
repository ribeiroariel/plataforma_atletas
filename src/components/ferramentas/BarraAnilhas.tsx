// Desenho da barra montada, visto de lado: anilhas nas cores oficiais, a
// maior colada no colar e as menores pra fora. Quando a carga muda, as
// anilhas entram deslizando pela ponta da barra, uma de cada vez.

type Estilo = { cor: string; texto: string; altura: number; largura: number };

// Cores de competição (IWF). Altura e espessura variam pra dar leitura de
// tamanho, como numa barra de verdade.
const ESTILO: Record<number, Estilo> = {
  20: { cor: "#1f4fb5", texto: "#fff", altura: 1, largura: 1 },
  15: { cor: "#f2c12e", texto: "#0d0f12", altura: 0.9, largura: 0.85 },
  10: { cor: "#1f9d61", texto: "#fff", altura: 0.8, largura: 0.72 },
  5: { cor: "#f5f3ee", texto: "#0d0f12", altura: 0.56, largura: 0.55 },
  2.5: { cor: "#c2182b", texto: "#fff", altura: 0.44, largura: 0.45 },
};

const PADRAO: Estilo = { cor: "#747880", texto: "#fff", altura: 0.5, largura: 0.5 };

function estiloDe(kg: number): Estilo {
  return ESTILO[kg] ?? PADRAO;
}

function Anilha({
  kg,
  lado,
  ordem,
  alturaMax,
  larguraMax,
  chave,
}: {
  kg: number;
  lado: "esq" | "dir";
  ordem: number;
  alturaMax: number;
  larguraMax: number;
  chave: string;
}) {
  const e = estiloDe(kg);
  const altura = Math.round(alturaMax * e.altura);
  const largura = Math.max(6, Math.round(larguraMax * e.largura));
  const mostraNumero = largura >= 14;
  return (
    <span
      key={chave}
      className="anilha relative flex shrink-0 items-center justify-center"
      style={
        {
          height: altura,
          width: largura,
          marginInline: 1,
          background: `linear-gradient(90deg, rgba(0,0,0,.22), rgba(255,255,255,.18) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,.25)), ${e.cor}`,
          borderRadius: Math.max(3, largura * 0.28),
          boxShadow: kg === 5 ? "inset 0 0 0 1px rgba(13,15,18,.25)" : undefined,
          "--de": lado === "dir" ? "60px" : "-60px",
          animationDelay: `${ordem * 70}ms`,
        } as React.CSSProperties
      }
    >
      {mostraNumero && (
        <span
          className="font-display font-extrabold tabular-nums"
          style={{
            color: e.texto,
            writingMode: "vertical-rl",
            transform: lado === "esq" ? "rotate(180deg)" : undefined,
            fontSize: Math.min(13, largura * 0.62),
            lineHeight: 1,
          }}
        >
          {String(kg).replace(".", ",")}
        </span>
      )}
    </span>
  );
}

export function BarraAnilhas({
  porLado,
  compacto = false,
  rotulo,
}: {
  // Anilhas de UM lado, da maior pra menor.
  porLado: number[];
  compacto?: boolean;
  // Texto pra leitores de tela (ex.: "Barra com 2×20 + 5 de cada lado").
  rotulo: string;
}) {
  const alturaMax = compacto ? 54 : 150;
  const larguraMax = compacto ? 13 : 26;
  const manga = compacto ? 70 : 150; // comprimento da ponta onde entram as anilhas
  const eixo = compacto ? 64 : 140; // parte do meio, onde se segura
  // Remonta (e reanima) quando a montagem muda.
  const versao = porLado.join("-") || "vazia";

  const lado = (qual: "esq" | "dir") => {
    const anilhas = qual === "dir" ? porLado : [...porLado].reverse();
    return (
      <span
        className={`relative flex items-center ${qual === "esq" ? "justify-end" : "justify-start"}`}
        style={{ width: manga, height: alturaMax }}
      >
        {/* manga da barra */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            height: compacto ? 6 : 12,
            left: 0,
            right: 0,
            background: "linear-gradient(180deg, #e3dfd5, #9a9ca2 55%, #6d7077)",
          }}
        />
        {/* colar (trava) junto ao eixo */}
        {qual === "dir" && (
          <span aria-hidden className="relative z-10 shrink-0 rounded-sm bg-[#3a3d44]" style={{ width: compacto ? 4 : 8, height: compacto ? 12 : 24 }} />
        )}
        <span className={`relative z-10 flex items-center ${qual === "esq" ? "flex-row" : "flex-row"}`}>
          {anilhas.map((kg, i) => (
            <Anilha
              key={`${versao}-${qual}-${i}`}
              chave={`${versao}-${qual}-${i}`}
              kg={kg}
              lado={qual}
              ordem={qual === "dir" ? i : anilhas.length - 1 - i}
              alturaMax={alturaMax}
              larguraMax={larguraMax}
            />
          ))}
        </span>
        {qual === "esq" && (
          <span aria-hidden className="relative z-10 shrink-0 rounded-sm bg-[#3a3d44]" style={{ width: compacto ? 4 : 8, height: compacto ? 12 : 24 }} />
        )}
      </span>
    );
  };

  return (
    <div role="img" aria-label={rotulo} className="flex w-full items-center justify-center overflow-hidden py-1">
      {lado("esq")}
      {/* eixo central (pegada) com recartilhado */}
      <span
        aria-hidden
        className="shrink-0 rounded-full"
        style={{
          width: eixo,
          height: compacto ? 4 : 8,
          background: "repeating-linear-gradient(90deg, #8b8f97 0 2px, #b9bcc2 2px 4px)",
        }}
      />
      {lado("dir")}
    </div>
  );
}

// Legenda: "2× 20 kg", "1× 5 kg"... com a cor de cada anilha.
export function LegendaAnilhas({ porLado }: { porLado: number[] }) {
  const grupos = new Map<number, number>();
  for (const a of porLado) grupos.set(a, (grupos.get(a) ?? 0) + 1);
  if (grupos.size === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {[...grupos.entries()].map(([kg, n]) => {
        const e = estiloDe(kg);
        return (
          <li key={kg} className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-3 pl-1 text-xs">
            <span
              aria-hidden
              className="h-4 w-4 rounded-full"
              style={{ background: e.cor, boxShadow: kg === 5 ? "inset 0 0 0 1px rgba(13,15,18,.3)" : undefined }}
            />
            <span className="tabular-data">
              {n}× {String(kg).replace(".", ",")} kg
            </span>
          </li>
        );
      })}
    </ul>
  );
}
