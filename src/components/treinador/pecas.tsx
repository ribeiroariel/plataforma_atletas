import type { DiaResumo, EstadoDia } from "@/lib/treinador/resumoAtletas";

export function Avatar({
  nome,
  url,
  tamanho = 44,
  className = "",
}: {
  nome: string;
  url: string | null;
  tamanho?: number;
  className?: string;
}) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: tamanho, height: tamanho }}
    />
  ) : (
    <span
      aria-hidden
      className={`font-display flex shrink-0 items-center justify-center rounded-full bg-ink font-extrabold text-white ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    >
      {iniciais || "?"}
    </span>
  );
}

const COR_ESTADO: Record<EstadoDia, string> = {
  feito: "bg-ok",
  parcial: "bg-sinal",
  perdido: "bg-erro/70",
  planejado: "bg-ink/25",
  descanso: "bg-transparent border border-dashed border-ink/20",
  vazio: "bg-transparent border border-dashed border-ink/10",
};

const NOME_ESTADO: Record<EstadoDia, string> = {
  feito: "concluído",
  parcial: "com registros",
  perdido: "não feito",
  planejado: "planejado",
  descanso: "descanso",
  vazio: "sem treino",
};

// A semana do atleta em sete quadradinhos: verde feito, amarelo começou,
// vermelho passou e não fez, cinza ainda vai acontecer.
export function SemanaPontos({ dias, hoje, grande = false }: { dias: DiaResumo[]; hoje: string; grande?: boolean }) {
  return (
    <ol className="flex gap-1" aria-label="Semana do atleta">
      {dias.map((d) => (
        <li key={d.data} className="flex flex-1 flex-col items-center gap-1" title={`${d.rotuloCurto}: ${d.titulo || NOME_ESTADO[d.estado]} (${NOME_ESTADO[d.estado]})`}>
          <span className={`w-full rounded-[4px] ${grande ? "h-3" : "h-2"} ${COR_ESTADO[d.estado]}`} />
          <span className={`rotulo text-[9px] ${d.data === hoje ? "font-bold text-tartan" : "text-cinza"}`}>
            {d.rotuloCurto[0]}
            <span className="sr-only">
              {d.rotuloCurto.slice(1)}: {NOME_ESTADO[d.estado]}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function LegendaEstados() {
  return (
    <ul className="rotulo flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-cinza">
      {(["feito", "parcial", "perdido", "planejado"] as const).map((e) => (
        <li key={e} className="flex items-center gap-2">
          <span aria-hidden className={`h-2 w-5 rounded-[4px] ${COR_ESTADO[e]}`} />
          {NOME_ESTADO[e]}
        </li>
      ))}
    </ul>
  );
}

// Anel de progresso (0 a 1) com o número no meio.
export function Anel({ fracao, rotulo, tamanho = 72 }: { fracao: number; rotulo: string; tamanho?: number }) {
  const raio = 15.9155; // circunferência = 100, então o traço é a própria %
  const pct = Math.max(0, Math.min(1, fracao)) * 100;
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }} role="img" aria-label={`${Math.round(pct)}% ${rotulo}`}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={raio} fill="none" stroke="currentColor" strokeWidth="3.2" className="text-ash" />
        <circle
          cx="18"
          cy="18"
          r={raio}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={`${pct} 100`}
          className={pct >= 75 ? "text-ok" : pct >= 40 ? "text-tartan" : "text-erro"}
        />
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center text-lg leading-none font-extrabold tabular-nums">
        {Math.round(pct)}
        <span className="text-[10px]">%</span>
      </span>
    </div>
  );
}
