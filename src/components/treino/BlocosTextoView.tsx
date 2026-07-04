import type { BlocoTexto } from "@/lib/planilha/parseTreino";

function agrupar(blocos: BlocoTexto[]) {
  const grupos: BlocoTexto[][] = [];
  for (const bloco of blocos) {
    const ultimoGrupo = grupos[grupos.length - 1];
    const mesmoTipo = ultimoGrupo?.[0]?.tipo === bloco.tipo;
    const agrupavel = bloco.tipo === "item-numerado" || bloco.tipo === "item-lista";
    if (agrupavel && mesmoTipo) {
      ultimoGrupo.push(bloco);
    } else {
      grupos.push([bloco]);
    }
  }
  return grupos;
}

export function BlocosTextoView({ blocos }: { blocos: BlocoTexto[] }) {
  const grupos = agrupar(blocos);

  return (
    <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-track-night">
      {grupos.map((grupo, i) => {
        const primeiro = grupo[0];

        if (primeiro.tipo === "item-numerado") {
          return (
            <ol key={i} className="flex flex-col gap-2.5 pl-5">
              {grupo.map((item, j) =>
                item.tipo === "item-numerado" ? (
                  <li key={j} className="list-decimal marker:font-medium marker:text-stadium-blue">
                    <span className="font-medium">{item.texto}</span>
                    {item.detalhe.length > 0 && (
                      <div className="tabular-data mt-0.5 text-xs text-track-fog">
                        {item.detalhe.join(" · ")}
                      </div>
                    )}
                  </li>
                ) : null,
              )}
            </ol>
          );
        }

        if (primeiro.tipo === "item-lista") {
          return (
            <ul key={i} className="flex flex-col gap-1 pl-5">
              {grupo.map((item, j) =>
                item.tipo === "item-lista" ? (
                  <li key={j} className="list-disc marker:text-sky-split">
                    {item.texto}
                  </li>
                ) : null,
              )}
            </ul>
          );
        }

        if (primeiro.tipo === "subtitulo") {
          return (
            <p key={i} className="mt-1 text-xs font-semibold tracking-wide text-deep-lane uppercase">
              {primeiro.texto}
            </p>
          );
        }

        if (primeiro.tipo === "total") {
          return (
            <span
              key={i}
              className="tabular-data mt-1 inline-flex w-fit items-center rounded-[var(--radius-badge)] bg-stadium-blue/10 px-2 py-1 text-xs font-medium text-stadium-blue"
            >
              {primeiro.texto}
            </span>
          );
        }

        return (
          <p key={i} className="text-track-night/90">
            {primeiro.texto}
          </p>
        );
      })}
    </div>
  );
}
