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

export type DiaSemana = { dia: string; blocos: BlocoTexto[]; descanso: boolean };
export type SemanaTreino = { rotulo: string; dias: DiaSemana[] };
export type ModoSemana = {
  tipo: "semana";
  titulo: string;
  semanas: SemanaTreino[];
  legenda?: string;
};

export type BlocoSessao = { numero: string; titulo: string; blocos: BlocoTexto[]; parametros: string };
export type ModoBlocos = {
  tipo: "blocos";
  titulo: string;
  objetivo?: string;
  sessao: BlocoSessao[];
};

export type ModoGenerico = { tipo: "generico"; titulo: string; linhas: string[][] };

export type TreinoParseado = ModoSemana | ModoBlocos | ModoGenerico;

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

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

    if (total) {
      blocos.push({ tipo: "total", texto: linha });
    } else if (itemNumerado) {
      blocos.push({ tipo: "item-numerado", texto: itemNumerado[2], detalhe: [] });
    } else if (itemLista) {
      blocos.push({ tipo: "item-lista", texto: itemLista[1] });
    } else if (subtitulo) {
      blocos.push({ tipo: "subtitulo", texto: linha.replace(/:$/, "") });
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
        dia: String(cabecalho[col] ?? ""),
        blocos: descanso ? [] : parseCelula(conteudo),
        descanso,
      });
    }
    semanas.push({ rotulo, dias });
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
