import * as XLSX from "xlsx";

const DIAS_SEMANA = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];

export type BlocoTexto =
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "item-numerado"; texto: string; detalhe: string[] }
  | { tipo: "item-lista"; texto: string }
  | { tipo: "total"; texto: string };

export type DiaSemana = { chave: string; dia: string; blocos: BlocoTexto[]; descanso: boolean };
export type SemanaTreino = { rotulo: string; dias: DiaSemana[] };
export type ModoSemana = {
  tipo: "semana";
  titulo: string;
  semanas: SemanaTreino[];
  legenda?: string;
};

export type BlocoSessao = {
  chave: string;
  numero: string;
  titulo: string;
  blocos: BlocoTexto[];
  parametros: string;
};
export type ModoBlocos = {
  tipo: "blocos";
  titulo: string;
  objetivo?: string;
  sessao: BlocoSessao[];
};

export type ModoGenerico = { tipo: "generico"; titulo: string; linhas: string[][] };

export type TreinoParseado = ModoSemana | ModoBlocos | ModoGenerico;

// Uma "unidade registrável" é o exercício dentro de uma sessão sobre o qual o
// atleta pode lançar um valor (kg/tempo/distância/pace). O itemIndex é estável:
// depende só da ordem dos blocos parseados, então a mesma planilha sempre gera
// os mesmos índices (usados como chave em exercise_logs).
//   rotulo  -> nome do exercício, usado para exibir na tela (mantido curto).
//   detalhe -> a linha de séries/reps/distância que ficou junto do item na
//              planilha (ex.: "4x8-10 | RIR 1-2 | desc.: 2-3min"), usada só
//              pra inferir a métrica plausível (sugerirMetrica.ts) — nunca
//              exibida sozinha.
export type UnidadeRegistravel = { itemIndex: number; rotulo: string; detalhe?: string };

// Linha solta (não numerada) que descreve um tiro/intervalo de pista, ex.:
// "7x200m", "6x400m", "2x500m + 300m", ou com um rótulo antes do número
// ("Acelerações: 3x60m – 80, 85, 90%"). Planilhas de pista costumam colocar
// isso como parágrafo avulso sob um subtítulo tipo "SESSÃO PRINCIPAL:", não
// como item de lista numerada — sem esse reconhecimento extra, o tiro nunca
// vira uma unidade registrável. Sem âncora no início de propósito, pra
// pegar tanto "7x200m" quanto "Acelerações: 3x60m".
const PADRAO_INTERVALO_PISTA = /\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(km|m)\b/i;

// Dada uma sessão (um DiaSemana no modo semana ou um BlocoSessao no modo
// blocos), devolve a lista de exercícios registráveis com itemIndex 0-based:
//  - cada bloco item-numerado (com sua linha de detalhe) ou item-lista, na
//    ordem em que aparece;
//  - cada parágrafo solto que pareça um tiro de pista (padrão NxDDDm);
//  - se a sessão não tiver nenhum item desses, a própria sessão vira UMA
//    unidade (itemIndex 0), rotulada pelo título/resumo dela.
export function unidadesRegistraveis(sessao: DiaSemana | BlocoSessao): UnidadeRegistravel[] {
  const itens: UnidadeRegistravel[] = [];
  for (const bloco of sessao.blocos) {
    if (bloco.tipo === "item-numerado") {
      itens.push({ itemIndex: itens.length, rotulo: bloco.texto, detalhe: bloco.detalhe.join(" ") });
    } else if (bloco.tipo === "item-lista") {
      itens.push({ itemIndex: itens.length, rotulo: bloco.texto });
    } else if (bloco.tipo === "paragrafo" && PADRAO_INTERVALO_PISTA.test(bloco.texto.trim())) {
      itens.push({ itemIndex: itens.length, rotulo: bloco.texto });
    }
  }
  if (itens.length > 0) return itens;

  const fallback =
    "titulo" in sessao
      ? sessao.titulo
      : (sessao.blocos.find((b) => b.tipo === "paragrafo" || b.tipo === "subtitulo")?.texto ??
        sessao.dia);
  return [{ itemIndex: 0, rotulo: fallback }];
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

// Linha tipo "Cardio: Caminhada em esteira – 30min | 6-7km/h | ..." colada
// logo após uma lista numerada de musculação (sem numeração própria). Sem
// esse reconhecimento, ela cai no fallback de "não bate com nada" e vira
// detalhe do ÚLTIMO exercício numerado (ex.: grudada em "Supino inclinado –
// halteres"), fazendo o cardio virar texto descritivo de outro exercício em
// vez de um item registrável próprio — bug real visto nas planilhas da
// Bruna. Allowlist deliberadamente restrita (só atividades, não qualquer
// "Rótulo:") pra não confundir com notas de técnica tipo "Técnica: cotovelos
// altos...", que devem continuar como detalhe do exercício anterior.
const RE_ATIVIDADE_EXTRA = /^(cardio|sprint|corrida|caminhada|bicicleta|esteira)\s*:\s*(.+)/i;

export function parseCelula(textoOriginal: string): BlocoTexto[] {
  const linhas = String(textoOriginal ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());

  const blocos: BlocoTexto[] = [];

  for (const linha of linhas) {
    if (!linha) continue;

    const itemNumerado = linha.match(/^(\d+)\.\s+(.*)/);
    const itemLista = linha.match(/^[•\-]\s+(.*)/);
    const total = /^total\s*:/i.test(linha);
    const subtitulo = linha.length < 40 && /:$/.test(linha) && !/\d/.test(linha);
    const atividadeExtra = RE_ATIVIDADE_EXTRA.test(linha);

    if (total) {
      blocos.push({ tipo: "total", texto: linha });
    } else if (itemNumerado) {
      blocos.push({ tipo: "item-numerado", texto: itemNumerado[2], detalhe: [] });
    } else if (itemLista) {
      blocos.push({ tipo: "item-lista", texto: itemLista[1] });
    } else if (subtitulo) {
      blocos.push({ tipo: "subtitulo", texto: linha.replace(/:$/, "") });
    } else if (atividadeExtra) {
      blocos.push({ tipo: "item-lista", texto: linha });
    } else {
      const ultimo = blocos[blocos.length - 1];
      if (ultimo?.tipo === "item-numerado") {
        ultimo.detalhe.push(linha);
      } else {
        blocos.push({ tipo: "paragrafo", texto: linha });
      }
    }
  }

  return blocos;
}

function linhasDaAba(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(primeiraAba, { header: 1, defval: "" });
}

function ehGradeDeSemana(linhas: string[][]): boolean {
  const cabecalho = linhas[1]?.slice(1).map(normalizar) ?? [];
  const acertos = DIAS_SEMANA.filter((d) => cabecalho.includes(d));
  return acertos.length >= 5;
}

function ehTabelaDeBlocos(linhas: string[][]): number {
  return linhas.findIndex((linha) => {
    const normalizada = linha.map(normalizar);
    return normalizada.includes("bloco") && normalizada.includes("descricao");
  });
}

function parseGradeDeSemana(linhas: string[][]): ModoSemana {
  const titulo = String(linhas[0]?.[0] ?? "Plano de treino");
  const cabecalho = linhas[1] ?? [];
  const semanas: SemanaTreino[] = [];
  let legenda: string | undefined;
  let indiceSemana = 0;

  for (let i = 2; i < linhas.length; i++) {
    const linha = linhas[i];
    const rotulo = String(linha[0] ?? "").trim();
    if (!rotulo) continue;
    if (/^legenda/i.test(rotulo)) {
      legenda = linha.join(" ").trim();
      continue;
    }

    const dias: DiaSemana[] = [];
    for (let col = 1; col < cabecalho.length; col++) {
      const conteudo = String(linha[col] ?? "").trim();
      const descanso = /^descanso$/i.test(conteudo);
      dias.push({
        chave: `s${indiceSemana}-d${col}`,
        dia: String(cabecalho[col] ?? ""),
        blocos: descanso ? [] : parseCelula(conteudo),
        descanso,
      });
    }
    semanas.push({ rotulo, dias });
    indiceSemana++;
  }

  return { tipo: "semana", titulo, semanas, legenda };
}

function parseTabelaDeBlocos(linhas: string[][], indiceCabecalho: number): ModoBlocos {
  const titulo = String(linhas[0]?.[0] ?? "Sessão de treino");
  const objetivo = linhas[1]?.[0] ? String(linhas[1][0]) : undefined;

  const sessao: BlocoSessao[] = [];
  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const [numero, descricaoTitulo, descricao, parametros] = linhas[i];
    if (!/^\d+$/.test(String(numero ?? "").trim())) continue;

    const blocosTexto = parseCelula(String(descricao ?? ""));
    const tituloColuna = String(descricaoTitulo ?? "").replace(/\n/g, " ").trim();
    const primeiraLinha = String(descricao ?? "").split("\n")[0]?.trim() ?? "";

    sessao.push({
      chave: `b${String(numero).trim()}`,
      numero: String(numero ?? ""),
      titulo: tituloColuna || primeiraLinha,
      blocos: blocosTexto,
      parametros: String(parametros ?? ""),
    });
  }

  return { tipo: "blocos", titulo, objetivo, sessao };
}

function parseGenerico(linhas: string[][]): ModoGenerico {
  return {
    tipo: "generico",
    titulo: String(linhas[0]?.[0] ?? "Plano de treino"),
    linhas: linhas.slice(1).filter((l) => l.some((c) => String(c).trim())),
  };
}

export function parseTreino(buffer: Buffer): TreinoParseado {
  const linhas = linhasDaAba(buffer);

  if (ehGradeDeSemana(linhas)) {
    return parseGradeDeSemana(linhas);
  }

  const indiceCabecalhoBlocos = ehTabelaDeBlocos(linhas);
  if (indiceCabecalhoBlocos >= 0) {
    return parseTabelaDeBlocos(linhas, indiceCabecalhoBlocos);
  }

  return parseGenerico(linhas);
}
