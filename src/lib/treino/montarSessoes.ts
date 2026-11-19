import {
  roteiroDaSessao,
  type BlocoTexto,
  type ItemRoteiro,
  type ModoBlocos,
  type ModoSemana,
} from "@/lib/planilha/parseTreino";
import { mapearSessoesParaCalendario } from "@/lib/planilha/calendario";

// Formato "de tela" do treino: tudo que o componente interativo precisa, já
// calculado no servidor (o parser depende da biblioteca de planilha, pesada
// demais pra mandar pro navegador).
export type SessaoTela = {
  chave: string;
  rotuloCurto: string; // "Seg" / "B1"
  rotulo: string; // "Segunda" / "Bloco 1"
  titulo: string;
  nota?: string; // ex.: "~75-85 min"
  descanso: boolean;
  // Antes da data de início definida: fora do plano (tratado como sem treino).
  antesDoInicio?: boolean;
  data?: string; // yyyy-mm-dd, só no modo semana
  roteiro: ItemRoteiro[];
  parametros?: string;
};

// observacoes: recado da semana (coluna "Observações" da planilha).
export type GrupoTela = { rotulo: string; subtitulo?: string; observacoes?: string; sessoes: SessaoTela[] };

// As planilhas costumam abrir o dia com uma linha tipo
// "INFERIOR – QUADRÍCEPS  |  ~75-85 min": a parte antes da barra vira o
// título da sessão e o resto (duração etc.) vira uma nota ao lado.
function cabecalhoDoDia(blocos: BlocoTexto[]): { titulo: string; nota?: string; consumiuPrimeiro: boolean } {
  const primeiro = blocos[0];
  if (!primeiro) return { titulo: "", consumiuPrimeiro: false };
  if (primeiro.tipo === "paragrafo" || primeiro.tipo === "subtitulo") {
    const [titulo, ...resto] = primeiro.texto.split("|").map((p) => p.trim());
    // Só "consome" a linha (tira do roteiro) se ela for curta o bastante pra
    // ser um título de verdade — um parágrafo longo de instrução fica onde está.
    const ehTitulo = titulo.length <= 60;
    return {
      titulo: ehTitulo ? titulo : "",
      nota: ehTitulo ? resto.filter(Boolean).join(" · ") || undefined : undefined,
      consumiuPrimeiro: ehTitulo,
    };
  }
  return { titulo: "", consumiuPrimeiro: false };
}

function abreviar(dia: string): string {
  const limpo = dia.trim();
  return limpo.length <= 3 ? limpo : limpo.slice(0, 3);
}

export function gruposDaSemana(treino: ModoSemana, dataInicio: string, apartirDe?: string | null): GrupoTela[] {
  const mapeadas = new Map(mapearSessoesParaCalendario(treino, dataInicio, apartirDe).map((s) => [s.sessionKey, s]));

  return treino.semanas.map((semana, i) => {
    const linhas = semana.rotulo.split("\n").map((l) => l.trim()).filter(Boolean);
    // "Semanas\n1-2" é um rótulo só, quebrado em duas linhas na planilha;
    // já "Semana 1\nAdaptação" é rótulo + descrição.
    const junto = linhas.join(" ");
    const curto = junto.length <= 16;
    return {
      rotulo: (curto ? junto : linhas[0]) || `Semana ${i + 1}`,
      subtitulo: curto ? undefined : linhas.slice(1).join(" · ") || undefined,
      observacoes: semana.observacoes,
      sessoes: semana.dias.map((dia) => {
        // Célula vazia na planilha = dia sem treino, igual a descanso.
        const antesDoInicio = !!mapeadas.get(dia.chave)?.antesDoInicio;
        const livre = antesDoInicio || dia.descanso || dia.blocos.length === 0;
        const cabecalho = cabecalhoDoDia(dia.blocos);
        const roteiro = livre ? [] : roteiroDaSessao(dia);
        return {
          chave: dia.chave,
          rotuloCurto: abreviar(dia.dia),
          rotulo: dia.dia,
          titulo: antesDoInicio ? "Antes do início" : livre ? "Descanso" : cabecalho.titulo,
          nota: cabecalho.nota,
          descanso: livre,
          antesDoInicio,
          data: mapeadas.get(dia.chave)?.data,
          roteiro: cabecalho.consumiuPrimeiro && roteiro[0]?.tipo === "texto" ? roteiro.slice(1) : roteiro,
        };
      }),
    };
  });
}

export function gruposDosBlocos(treino: ModoBlocos): GrupoTela[] {
  return [
    {
      rotulo: "Sessão",
      sessoes: treino.sessao.map((bloco) => ({
        chave: bloco.chave,
        rotuloCurto: `B${bloco.numero}`,
        rotulo: `Bloco ${bloco.numero}`,
        titulo: bloco.titulo,
        descanso: false,
        roteiro: roteiroDaSessao(bloco),
        parametros: bloco.parametros || undefined,
      })),
    },
  ];
}

// Sessões que contam para o progresso (descanso não conta).
export function sessoesTreinaveis(grupos: GrupoTela[]): SessaoTela[] {
  return grupos.flatMap((g) => g.sessoes).filter((s) => !s.descanso && s.roteiro.length > 0);
}
