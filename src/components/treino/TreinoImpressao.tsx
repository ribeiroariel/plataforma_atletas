import { type TreinoParseado, unidadesRegistraveis } from "@/lib/planilha/parseTreino";
import { BlocosTextoView } from "./BlocosTextoView";
import { formatarRegistro, type RegistroExercicio, type RegistroMapa } from "./ExercicioRegistro";

type ItemRegistro = { rotulo: string; registro: RegistroExercicio | undefined };

// Versão somente-leitura do treino pra impressão/PDF: mesmos dados e
// componentes de texto do TreinoView, sem inputs nem interações.
export function TreinoImpressao({
  treino,
  concluidas,
  registros,
}: {
  treino: TreinoParseado;
  concluidas: string[];
  registros: RegistroMapa;
}) {
  const feito = (chave: string) => concluidas.includes(chave);

  function itensDaSessao(sessao: Parameters<typeof unidadesRegistraveis>[0], sessionKey: string): ItemRegistro[] {
    return unidadesRegistraveis(sessao).map((u) => ({
      rotulo: u.rotulo,
      registro: registros[`${sessionKey}:${u.itemIndex}`],
    }));
  }

  if (treino.tipo === "semana") {
    return (
      <div className="flex flex-col gap-8">
        {treino.semanas.map((semana, i) => (
          <section key={i} className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-deep-lane">
              {semana.rotulo.replace(/\n/g, " · ")}
            </h2>
            <div className="flex flex-col gap-3">
              {semana.dias.map((dia, j) => (
                <div
                  key={j}
                  className="break-inside-avoid rounded-[var(--radius-badge)] border border-track-fog/25 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stadium-blue">
                      {dia.dia}
                    </span>
                    {feito(dia.chave) && (
                      <span className="text-xs font-medium text-stadium-blue">Concluído</span>
                    )}
                  </div>
                  {dia.descanso ? (
                    <p className="text-sm text-track-fog">Descanso</p>
                  ) : (
                    <>
                      <BlocosTextoView blocos={dia.blocos} />
                      <RegistrosImpressao itens={itensDaSessao(dia, dia.chave)} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        {treino.legenda && <p className="text-xs text-track-fog">{treino.legenda}</p>}
      </div>
    );
  }

  if (treino.tipo === "blocos") {
    return (
      <div className="flex flex-col gap-4">
        {treino.objetivo && <p className="text-sm text-track-fog">{treino.objetivo}</p>}
        {treino.sessao.map((bloco, i) => (
          <div
            key={i}
            className="break-inside-avoid rounded-[var(--radius-badge)] border border-track-fog/25 p-4"
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="tabular-data shrink-0 text-xs font-semibold text-stadium-blue">
                  BLOCO {bloco.numero}
                </span>
                <h3 className="font-display text-base font-semibold text-track-night break-words">
                  {bloco.titulo}
                </h3>
              </div>
              {feito(bloco.chave) && (
                <span className="text-xs font-medium text-stadium-blue">Concluído</span>
              )}
            </div>
            <BlocosTextoView blocos={bloco.blocos} />
            {bloco.parametros && (
              <p className="tabular-data mt-3 border-t border-track-fog/15 pt-2 text-xs text-track-fog whitespace-pre-line">
                {bloco.parametros}
              </p>
            )}
            <RegistrosImpressao itens={itensDaSessao(bloco, bloco.chave)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <tbody>
        {treino.linhas.map((linha, i) => (
          <tr key={i} className="border-b border-track-fog/15 last:border-0">
            {linha.map((celula, j) => (
              <td key={j} className="px-3 py-2 align-top text-track-night/90">
                {celula}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RegistrosImpressao({ itens }: { itens: ItemRegistro[] }) {
  const preenchidos = itens.filter(
    (item): item is { rotulo: string; registro: RegistroExercicio } => !!item.registro,
  );
  if (preenchidos.length === 0) return null;

  return (
    <ul className="tabular-data mt-3 flex flex-col gap-1 border-t border-track-fog/15 pt-2 text-xs text-track-night/80">
      {preenchidos.map((item, i) => (
        <li key={i}>
          {item.rotulo}: <span className="font-medium">{formatarRegistro(item.registro)}</span>
        </li>
      ))}
    </ul>
  );
}
