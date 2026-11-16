// As fotos do site, com o tamanho de cada arquivo e o "foco": o ponto da
// imagem onde está o atleta (0 a 1, da esquerda pra direita e de cima pra
// baixo). O componente FotoFoco usa isso pra manter o atleta no centro do
// quadro, seja ele largo, quadrado ou em pé.
export type FotoSite = {
  src: string;
  largura: number;
  altura: number;
  foco: [number, number];
  alt: string;
};

export const FOTOS = {
  chegada: {
    src: "/fotos/hero-chegada.webp",
    largura: 2400,
    altura: 1252,
    foco: [0.69, 0.4],
    alt: "Atleta cruzando a linha de chegada com o braço erguido",
  },
  prova: {
    src: "/fotos/prova-167.webp",
    largura: 2000,
    altura: 1334,
    foco: [0.59, 0.55],
    alt: "Atletas em plena prova de velocidade",
  },
  corrida: {
    src: "/fotos/corrida-402.webp",
    largura: 1600,
    altura: 1067,
    foco: [0.47, 0.42],
    alt: "Atleta correndo na pista",
  },
  saltoAreia: {
    src: "/fotos/salto-areia.webp",
    largura: 880,
    altura: 950,
    foco: [0.33, 0.44],
    alt: "Atleta aterrissando na caixa de areia do salto em distância",
  },
  saltoCorrida: {
    src: "/fotos/salto-corrida.webp",
    largura: 1147,
    altura: 868,
    foco: [0.455, 0.5],
    alt: "Atleta na corrida de aproximação do salto em distância",
  },
  revezamento: {
    src: "/fotos/revezamento.webp",
    largura: 1145,
    altura: 840,
    foco: [0.36, 0.56],
    alt: "Atleta correndo com o bastão numa prova de revezamento",
  },
  futebolDisputa: {
    src: "/fotos/futebol-disputa.webp",
    largura: 1280,
    altura: 852,
    foco: [0.555, 0.58],
    alt: "Jogador protegendo a bola do marcador",
  },
  futebolConducao: {
    src: "/fotos/futebol-conducao.webp",
    largura: 1280,
    altura: 854,
    foco: [0.5, 0.5],
    alt: "Jogador conduzindo a bola em velocidade",
  },
  futebolTreino: {
    src: "/fotos/futebol-treino.webp",
    largura: 1146,
    altura: 1600,
    foco: [0.52, 0.5],
    alt: "Jogadores disputando a bola num treino de futebol",
  },
} satisfies Record<string, FotoSite>;
