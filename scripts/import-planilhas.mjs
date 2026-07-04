// Lê os .xlsx de /planilhas, sobe cada um no Storage, grava em training_plans
// e, se existir uma aba "Registro", grava os números em training_data.
//
// Uso:  node scripts/import-planilhas.mjs
// Precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local (nunca comitar essa chave).

import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { parseTreino } from "../src/lib/planilha/parseTreino.ts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASTA_PLANILHAS = path.join(process.cwd(), "planilhas");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TIPOS_VALIDOS = ["academia", "corrida", "bicicleta", "cardio"];

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function primeiroNome(nomeArquivo) {
  const base = path.basename(nomeArquivo, path.extname(nomeArquivo));
  return normalizar(base.split(/[_-]/)[0]);
}

async function encontrarAtleta(nomeArquivo) {
  const alvo = primeiroNome(nomeArquivo);
  const { data: atletas, error } = await admin.from("athletes").select("id, nome");
  if (error) throw error;

  const encontrados = atletas.filter((a) => normalizar(a.nome).split(/\s+/)[0] === alvo);

  if (encontrados.length === 0) {
    return { erro: `nenhum atleta encontrado para o prefixo "${alvo}" (arquivo ${nomeArquivo})` };
  }
  if (encontrados.length > 1) {
    return {
      erro: `mais de um atleta bate com o prefixo "${alvo}" (${encontrados
        .map((a) => a.nome)
        .join(", ")}) — renomeie o arquivo para desambiguar`,
    };
  }
  return { atleta: encontrados[0] };
}

function acharAbaRegistro(workbook) {
  const nome = workbook.SheetNames.find((n) => normalizar(n) === "registro");
  return nome ? workbook.Sheets[nome] : null;
}

function normalizarCabecalho(cabecalho) {
  const mapa = {
    data: "data",
    tipo: "tipo",
    "volume (kg)": "volume_kg",
    "volume(kg)": "volume_kg",
    "distancia (km)": "distancia_km",
    "distancia(km)": "distancia_km",
    "pace (min/km)": "pace_min_km",
    "pace(min/km)": "pace_min_km",
    "tempo (min)": "tempo_min",
    "tempo(min)": "tempo_min",
  };
  return mapa[normalizar(cabecalho)] ?? null;
}

function paraDataIso(valor) {
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === "number") {
    // serial de data do Excel
    const data = XLSX.SSF.parse_date_code(valor);
    if (!data) return null;
    const iso = new Date(Date.UTC(data.y, data.m - 1, data.d));
    return iso.toISOString().slice(0, 10);
  }
  if (typeof valor === "string" && valor.trim()) {
    const partes = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/) ??
      valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!partes) return null;
    if (partes[0].includes("/")) {
      return `${partes[3]}-${partes[2]}-${partes[1]}`;
    }
    return partes[0];
  }
  return null;
}

function paceParaMinutos(valor) {
  if (typeof valor === "number") return valor;
  const texto = String(valor).trim();
  const match = texto.match(/^(\d+):([0-5]\d)$/);
  if (match) {
    return Number(match[1]) + Number(match[2]) / 60;
  }
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function parseLinhaRegistro(linha, indice, nomeArquivo) {
  const erros = [];
  const hoje = new Date().toISOString().slice(0, 10);

  const data = paraDataIso(linha.data);
  if (!data) erros.push("data ausente ou inválida");
  else if (data > hoje) erros.push("data no futuro");

  const tipo = normalizar(linha.tipo);
  if (!TIPOS_VALIDOS.includes(tipo)) {
    erros.push(`tipo "${linha.tipo}" inválido (use academia, corrida, bicicleta ou cardio)`);
  }

  const preenchidos = {
    volume_kg: linha.volume_kg !== undefined && linha.volume_kg !== "",
    distancia_km: linha.distancia_km !== undefined && linha.distancia_km !== "",
    pace_min_km: linha.pace_min_km !== undefined && linha.pace_min_km !== "",
    tempo_min: linha.tempo_min !== undefined && linha.tempo_min !== "",
  };

  let variavel = null;
  let unidade = null;
  let valor = null;

  if (tipo === "academia") {
    if (!preenchidos.volume_kg) erros.push("tipo academia precisa da coluna Volume (kg)");
    if (preenchidos.distancia_km || preenchidos.pace_min_km || preenchidos.tempo_min) {
      erros.push("tipo academia não deve preencher outras colunas de valor");
    }
    variavel = "volume_carga";
    unidade = "kg";
    valor = Number(linha.volume_kg);
  } else if (tipo === "corrida" || tipo === "bicicleta") {
    if (preenchidos.distancia_km && preenchidos.pace_min_km) {
      erros.push("preencha Distância OU Pace, nunca as duas na mesma linha");
    } else if (preenchidos.distancia_km) {
      variavel = "distancia";
      unidade = "km";
      valor = Number(linha.distancia_km);
    } else if (preenchidos.pace_min_km) {
      variavel = "pace";
      unidade = "min/km";
      valor = paceParaMinutos(linha.pace_min_km);
    } else {
      erros.push(`tipo ${tipo} precisa da coluna Distância (km) ou Pace (min/km)`);
    }
    if (preenchidos.volume_kg || preenchidos.tempo_min) {
      erros.push(`tipo ${tipo} não deve preencher Volume (kg) ou Tempo (min)`);
    }
  } else if (tipo === "cardio") {
    if (!preenchidos.tempo_min) erros.push("tipo cardio precisa da coluna Tempo (min)");
    if (preenchidos.volume_kg || preenchidos.distancia_km || preenchidos.pace_min_km) {
      erros.push("tipo cardio não deve preencher outras colunas de valor");
    }
    variavel = "tempo";
    unidade = "min";
    valor = Number(linha.tempo_min);
  }

  if (valor !== null && (!Number.isFinite(valor) || valor <= 0)) {
    erros.push("valor precisa ser um número positivo");
  }

  if (erros.length > 0) {
    return { ok: false, erro: `${nomeArquivo} linha ${indice + 2}: ${erros.join("; ")}` };
  }

  return { ok: true, linha: { data, tipo, variavel, unidade, valor } };
}

function lerRegistro(sheet, nomeArquivo) {
  const linhasBrutas = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const linhasNormalizadas = linhasBrutas.map((linha) => {
    const nova = {};
    for (const [chave, valor] of Object.entries(linha)) {
      const chaveNova = normalizarCabecalho(chave);
      if (chaveNova) nova[chaveNova] = valor;
    }
    return nova;
  });

  const validas = [];
  const erros = [];
  linhasNormalizadas.forEach((linha, indice) => {
    const resultado = parseLinhaRegistro(linha, indice, nomeArquivo);
    if (resultado.ok) validas.push(resultado.linha);
    else erros.push(resultado.erro);
  });

  return { validas, erros };
}

async function importarArquivo(nomeArquivo) {
  console.log(`\n--- ${nomeArquivo} ---`);
  const caminhoCompleto = path.join(PASTA_PLANILHAS, nomeArquivo);

  const { atleta, erro: erroAtleta } = await encontrarAtleta(nomeArquivo);
  if (erroAtleta) {
    console.error(`  ERRO: ${erroAtleta}`);
    return;
  }

  const buffer = fs.readFileSync(caminhoCompleto);
  const caminhoStorage = `${atleta.id}/${nomeArquivo}`;
  const modoTreino = parseTreino(buffer).tipo;

  const { error: uploadErro } = await admin.storage
    .from("training-plans")
    .upload(caminhoStorage, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
  if (uploadErro) {
    console.error(`  ERRO ao subir para o Storage: ${uploadErro.message}`);
    return;
  }
  console.log(`  Storage ok: ${caminhoStorage}`);

  const { error: planoErro } = await admin
    .from("training_plans")
    .upsert(
      {
        athlete_id: atleta.id,
        arquivo_url: caminhoStorage,
        nome_arquivo: nomeArquivo,
        modo_treino: modoTreino,
      },
      { onConflict: "athlete_id,nome_arquivo" },
    );
  if (planoErro) {
    console.error(`  ERRO ao gravar training_plans: ${planoErro.message}`);
    return;
  }
  console.log(`  training_plans ok (atleta: ${atleta.nome})`);

  const workbook = XLSX.readFile(caminhoCompleto);
  const abaRegistro = acharAbaRegistro(workbook);
  if (!abaRegistro) {
    console.log(`  Sem aba "Registro" — só o plano foi importado.`);
    return;
  }

  const { validas, erros } = lerRegistro(abaRegistro, nomeArquivo);
  erros.forEach((e) => console.error(`  REJEITADO: ${e}`));

  if (validas.length === 0) {
    console.log(`  Nenhuma linha válida em "Registro".`);
    return;
  }

  const linhas = validas.map((l) => ({ athlete_id: atleta.id, ...l }));
  const { error: dadosErro } = await admin
    .from("training_data")
    .upsert(linhas, { onConflict: "athlete_id,data,tipo,variavel" });

  if (dadosErro) {
    console.error(`  ERRO ao gravar training_data: ${dadosErro.message}`);
    return;
  }
  console.log(`  training_data ok: ${validas.length} linha(s) gravada(s), ${erros.length} rejeitada(s).`);
}

async function main() {
  if (!fs.existsSync(PASTA_PLANILHAS)) {
    console.error(`Pasta não encontrada: ${PASTA_PLANILHAS}`);
    process.exit(1);
  }

  const arquivos = fs
    .readdirSync(PASTA_PLANILHAS)
    .filter((f) => f.toLowerCase().endsWith(".xlsx"));

  if (arquivos.length === 0) {
    console.log("Nenhum .xlsx encontrado em /planilhas.");
    return;
  }

  for (const arquivo of arquivos) {
    await importarArquivo(arquivo);
  }
}

main().catch((e) => {
  console.error("Falha geral do import:", e);
  process.exit(1);
});
