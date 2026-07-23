import {
  type TreinoParseado,
  type DiaSemana,
  type BlocoSessao,
  unidadesRegistraveis,
} from "@/lib/planilha/parseTreino";
import { registrosDoExercicio, type RegistroExercicio, type RegistroMapa } from "./ExercicioRegistro";
import { BlocosTextoView } from "./BlocosTextoView";

// Visão somente-leitura do que o atleta efetivamente registrou numa sessão —
// usada pelo treinador. Não reaproveita DiaAccordion/ExercicioRegistro de
// propósito: aqueles componentes são interativos (escrevem via server action
// checando o atleta logado) e aqui não deve existir nenhum controle de
// edição, só os dados.

function minutosParaPace(min: number): string {
  const totalSeg = Math.round(min * 60);
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function valorUnico(registro: RegistroExercicio): string {
  switch (registro.metrica) {
    case "kg":
      return `${registro.valor} kg`;
    case "distancia":
      return `${registro.valor} km`;
    case "pace":
      return `${minutosParaPace(registro.valor)} /km`;
    case "tempo":
      return `${registro.valor} min`;
  }
}

// Carga (kg) pode ter várias séries — mostra todas juntas, na ordem, ex.
// "80, 85, 90 kg". Qualquer outra métrica continua sendo um valor só.
function valorFormatado(registrosPorSerie: Record<number, RegistroExercicio>): string {
  const series = Object.keys(registrosPorSerie)
    .map(Number)
    .sort((a, b) => a - b);
  if (series.length === 0) return "—";
  if (series.length === 1) return valorUnico(registrosPorSerie[series[0]]);

  const unidade = registrosPorSerie[series[0]].metrica === "kg" ? "kg" : "";
  const valores = series.map((s) => registrosPorSerie[s].valor).join(", ");
  return unidade ? `${valores} ${unidade}` : valores;
}

function SessaoExecutada({
  chave,
  titulo,
  blocos,
  unidades,
  registros,
  concluida,
}: {
  chave: string;
  titulo: string;
  blocos?: DiaSemana["blocos"];
  unidades: ReturnType<typeof unidadesRegistraveis>;
  registros: RegistroMapa;
  concluida: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-badge)] border p-3 sm:p-4 ${
        concluida ? "border-stadium-blue/40 bg-stadium-blue/5" : "border-track-fog/20 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-track-night">{titulo}</h3>
        <span
          className={`shrink-0 rounded-[var(--radius-badge)] px-2 py-0.5 text-xs font-medium ${
            concluida ? "bg-stadium-blue/15 text-stadium-blue" : "bg-track-fog/15 text-track-fog"
          }`}
        >
          {concluida ? "Concluída" : "Não concluída"}
        </span>
      </div>

      {blocos && <BlocosTextoView blocos={blocos} />}

      {unidades.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 border-t border-track-fog/15 pt-2">
          {unidades.map((u) => (
            <li key={u.itemIndex} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 break-words text-track-night/80">{u.rotulo}</span>
              <span className="tabular-data shrink-0 font-medium text-track-night">
                {valorFormatado(registrosDoExercicio(registros, chave, u.itemIndex))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TreinoExecutadoView({
  treino,
  concluidas,
  registros,
}: {
  treino: TreinoParseado;
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
              {semana.dias
                .filter((dia) => !dia.descanso)
                .map((dia: DiaSemana, j) => (
                  <SessaoExecutada
                    key={j}
                    chave={dia.chave}
                    titulo={dia.dia}
                    unidades={unidadesRegistraveis(dia)}
                    registros={registros}
                    concluida={feito(dia.chave)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (treino.tipo === "blocos") {
    return (
      <div className="flex flex-col gap-3">
        {treino.sessao.map((bloco: BlocoSessao, i) => (
          <SessaoExecutada
            key={i}
            chave={bloco.chave}
            titulo={`Bloco ${bloco.numero} — ${bloco.titulo}`}
            blocos={bloco.blocos}
            unidades={unidadesRegistraveis(bloco)}
            registros={registros}
            concluida={feito(bloco.chave)}
          />
        ))}
      </div>
    );
  }

  return (
    <p className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white px-4 py-6 text-sm text-track-fog">
      Esse formato de planilha ainda não tem visão de treino executado.
    </p>
  );
}
