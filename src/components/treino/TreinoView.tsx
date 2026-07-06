import { type TreinoParseado } from "@/lib/planilha/parseTreino";
import { TreinoImersivo } from "./TreinoImersivo";
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
  if (treino.tipo === "semana" || treino.tipo === "blocos") {
    return (
      <TreinoImersivo
        treino={treino}
        trainingPlanId={trainingPlanId}
        concluidas={concluidas}
        registros={registros}
        legenda={treino.tipo === "semana" ? treino.legenda : undefined}
      />
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
