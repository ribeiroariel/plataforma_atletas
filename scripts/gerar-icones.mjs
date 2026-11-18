// Gera os ícones do aplicativo (tela inicial do celular) a partir do símbolo
// do site: quadrado laranja com três barras brancas.
// Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";

function svg(tamanho, margem) {
  // "margem" deixa a área segura pros ícones que o Android recorta em círculo.
  const s = tamanho;
  const area = s - margem * 2;
  const barra = area * 0.13;
  const espaco = area * 0.11;
  const base = margem + area * 0.8;
  const x0 = margem + (area - (barra * 3 + espaco * 2)) / 2;
  const alturas = [0.28, 0.42, 0.6].map((h) => h * area);
  const barras = alturas
    .map((h, i) => `<rect x="${x0 + i * (barra + espaco)}" y="${base - h}" width="${barra}" height="${h}" rx="${barra / 2}" fill="#fff"/>`)
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="#e6411a"/>${barras}</svg>`,
  );
}

const saidas = [
  { arquivo: "public/icone-192.png", tamanho: 192, margem: 30 },
  { arquivo: "public/icone-512.png", tamanho: 512, margem: 80 },
  { arquivo: "public/icone-maskable-512.png", tamanho: 512, margem: 130 },
  { arquivo: "src/app/apple-icon.png", tamanho: 180, margem: 28 },
  { arquivo: "src/app/icon.png", tamanho: 64, margem: 8 },
];

for (const { arquivo, tamanho, margem } of saidas) {
  await sharp(svg(tamanho, margem)).png().toFile(arquivo);
  console.log("ok", arquivo);
}
