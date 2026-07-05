import { type TreinoParseado, unidadesRegistraveis } from "@/lib/planilha/parseTreino";
import { BlocosTextoView } from "./BlocosTextoView";
import { DiaAccordion } from "./DiaAccordion";
import { BotaoConcluido } from "./BotaoConcluido";
import { SessaoRegistros } from "./SessaoRegistros";
import type { RegistroMapa } from "./ExercicioRegistro";

export function TreinoView({
  treino,
  trainingPlanId,
  concluidas,
  registros,
}: {
  treino: TreinoParseado;
  trainingPlanId: string;
  concluidas: string[];
  registros: RegistroMapa;
}) {
  const feito = (chave: string) => concluidas.includes(chave);

  if (treino.tipo === "semana") {
    return (
      <div className="flex flex-col gap-6">
        {treino.semanas.map((semana, i) => (
          <section key={i} className="flex flex-col gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-deep-lane">
              {semana.rotulo.replace(/\n/g, " · ")}
            </h2>
            <div className="flex flex-col gap-2">
              {semana.dias.map((dia, j) => (
                <DiaAccordion
                  key={j}
                  dia={dia}
                  trainingPlanId={trainingPlanId}
                  concluido={feito(dia.chave)}
                  registros={registros}
                />
              ))}
            </div>
          </section>
        ))}
        {treino.legenda && (
          <p className="rounded-[var(--radius-badge)] bg-deep-lane/5 px-4 py-3 text-xs text-track-fog">
            {treino.legenda}
          </p>
        )}
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
            className={`rounded-[var(--radius-badge)] border bg-white p-3 sm:p-4 ${
              feito(bloco.chave) ? "border-stadium-blue/40" : "border-track-fog/25"
            }`}
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
              <BotaoConcluido
                trainingPlanId={trainingPlanId}
                sessionKey={bloco.chave}
                concluidoInicial={feito(bloco.chave)}
              />
            </div>
            <BlocosTextoView blocos={bloco.blocos} />
            {bloco.parametros && (
              <p className="tabular-data mt-3 border-t border-track-fog/15 pt-2 text-xs text-track-fog whitespace-pre-line">
                {bloco.parametros}
              </p>
            )}
            <SessaoRegistros
              trainingPlanId={trainingPlanId}
              sessionKey={bloco.chave}
              unidades={unidadesRegistraveis(bloco)}
              registros={registros}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-badge)] border border-track-fog/25 bg-white">
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
    </div>
  );
}
