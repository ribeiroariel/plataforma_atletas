import { serieSemanal, type LinhaTrainingData } from "@/lib/evolucao/agregarSemana";
import { METRICAS } from "@/lib/evolucao/metricas";

function formatarSemana(semanaIso: string) {
  const d = new Date(`${semanaIso}T00:00:00Z`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

// Tabela com as últimas semanas lado a lado, complementando os gráficos de
// área da EvolucaoDashboard com os números exatos pra comparação rápida.
export function TabelaComparativa({ dados }: { dados: LinhaTrainingData[] }) {
  const linhas = METRICAS.map((m) => {
    const linhasDaMetrica = dados.filter((d) => d.tipo === m.tipo && d.variavel === m.variavel);
    const serie = serieSemanal(linhasDaMetrica).slice(-4);
    return { ...m, serie };
  }).filter((l) => l.serie.length > 0);

  if (linhas.length === 0) return null;

  const semanas = [...new Set(linhas.flatMap((l) => l.serie.map((p) => p.semana)))].sort();

  return (
    <div className="overflow-x-auto rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
      <h2 className="font-display text-lg font-semibold text-white">Últimas semanas</h2>
      <table className="mt-3 w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide text-track-fog uppercase">
            <th className="pb-2 pr-3 font-medium">Métrica</th>
            {semanas.map((s) => (
              <th key={s} className="tabular-data pb-2 pr-3 text-right font-medium">
                {formatarSemana(s)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const porSemana = new Map(l.serie.map((p) => [p.semana, p.total]));
            return (
              <tr key={l.chave} className="border-t border-white/10">
                <td className="py-2 pr-3 text-white/80">{l.titulo}</td>
                {semanas.map((s) => {
                  const v = porSemana.get(s);
                  return (
                    <td key={s} className="tabular-data py-2 pr-3 text-right text-white">
                      {v !== undefined
                        ? `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${l.unidade}`
                        : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
