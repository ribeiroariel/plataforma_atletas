import type { ModoSemana } from "./parseTreino";

export type SessaoDoDia = {
  data: string; // yyyy-mm-dd
  semanaIndex: number;
  diaLabel: string;
  sessionKey: string;
  descanso: boolean;
  resumo: string;
};

function segundaFeiraDaSemana(dataIso: string): Date {
  const d = new Date(`${dataIso}T00:00:00Z`);
  const diaSemana = d.getUTCDay(); // 0 = domingo
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setUTCDate(d.getUTCDate() + deslocamento);
  return d;
}

function formatarISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resumoDoDia(dia: ModoSemana["semanas"][number]["dias"][number]): string {
  if (dia.descanso) return "Descanso";
  const primeiro = dia.blocos[0];
  if (!primeiro) return "";
  if (primeiro.tipo === "paragrafo" || primeiro.tipo === "subtitulo" || primeiro.tipo === "item-numerado") {
    return primeiro.texto;
  }
  return "";
}

// Mapeia cada dia de um plano em modo "semana" pra uma data de calendário
// real: a Segunda da semana 1 é a segunda-feira que CONTÉM dataInicio (não
// necessariamente dataInicio em si — alinhamos ao início real da semana de
// calendário, pra semana 1/2/3... corresponderem a semanas reais do
// calendário, não a blocos arbitrários de 7 dias a partir de um dia
// qualquer). As semanas seguintes são semanas de calendário consecutivas.
export function mapearSessoesParaCalendario(treino: ModoSemana, dataInicio: string): SessaoDoDia[] {
  const segunda = segundaFeiraDaSemana(dataInicio);
  const resultado: SessaoDoDia[] = [];

  treino.semanas.forEach((semana, i) => {
    semana.dias.forEach((dia, col) => {
      const data = new Date(segunda);
      data.setUTCDate(data.getUTCDate() + i * 7 + col);
      resultado.push({
        data: formatarISO(data),
        semanaIndex: i,
        diaLabel: dia.dia,
        sessionKey: dia.chave,
        descanso: dia.descanso,
        resumo: resumoDoDia(dia),
      });
    });
  });

  return resultado;
}
