// Gera a imagem de resumo do treino (1080×1350, formato de story/feed) e
// abre o compartilhamento do celular; onde isso não existe, baixa o arquivo.

export type ResumoTreino = {
  titulo: string;
  subtitulo: string; // ex.: "Segunda · 16 nov"
  numeros: { valor: string; rotulo: string }[]; // até 4
  recordes: string[]; // ex.: "Agachamento livre · 100 kg"
  esforco?: number;
};

function quebrar(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > larguraMax && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function compartilharResumo(resumo: ResumoTreino): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const estilo = getComputedStyle(document.body);
  const display = estilo.getPropertyValue("--font-display").trim() || "sans-serif";
  const mono = estilo.getPropertyValue("--font-mono").trim() || "monospace";
  await document.fonts.ready;

  const L = 1080;
  const A = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "cancelado";

  // Fundo com as "raias" diagonais do site.
  ctx.fillStyle = "#0d0f12";
  ctx.fillRect(0, 0, L, A);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 3;
  for (let x = -A; x < L + A; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, A);
    ctx.lineTo(x + A * 0.47, 0);
    ctx.stroke();
  }
  ctx.fillStyle = "#e6411a";
  ctx.fillRect(0, 0, L, 18);

  const margem = 80;
  let y = 150;

  ctx.fillStyle = "#e6411a";
  ctx.font = `500 30px ${mono}`;
  ctx.fillText("TREINO CONCLUÍDO", margem, y);
  y += 30;

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 118px ${display}`;
  for (const linha of quebrar(ctx, resumo.titulo.toUpperCase(), L - margem * 2).slice(0, 3)) {
    y += 112;
    ctx.fillText(linha, margem, y);
  }

  y += 60;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 32px ${mono}`;
  ctx.fillText(resumo.subtitulo.toUpperCase(), margem, y);

  // Números em grade 2×2.
  y += 90;
  const col = (L - margem * 2) / 2;
  resumo.numeros.slice(0, 4).forEach((n, i) => {
    const x = margem + (i % 2) * col;
    const yy = y + Math.floor(i / 2) * 210;
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 130px ${display}`;
    ctx.fillText(n.valor, x, yy + 110);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `500 26px ${mono}`;
    ctx.fillText(n.rotulo.toUpperCase(), x, yy + 155);
  });
  y += Math.ceil(Math.min(4, resumo.numeros.length) / 2) * 210 + 30;

  if (resumo.recordes.length > 0) {
    ctx.fillStyle = "#ffc83d";
    ctx.font = `500 28px ${mono}`;
    ctx.fillText(`★ ${resumo.recordes.length === 1 ? "NOVO RECORDE" : "NOVOS RECORDES"}`, margem, y);
    ctx.font = `800 50px ${display}`;
    for (const r of resumo.recordes.slice(0, 3)) {
      y += 62;
      ctx.fillText(r, margem, y);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `500 26px ${mono}`;
  ctx.fillText("TREINOS · PLATAFORMA DE TREINAMENTO", margem, A - 70);

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) return "cancelado";
  const arquivo = new File([blob], "treino.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: resumo.titulo });
      return "compartilhado";
    } catch {
      return "cancelado"; // a pessoa fechou a folha de compartilhar
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "treino.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "baixado";
}
