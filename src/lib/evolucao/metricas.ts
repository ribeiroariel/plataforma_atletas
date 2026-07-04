export const METRICAS = [
  { chave: "academia", tipo: "academia", variavel: "volume_carga", unidade: "kg", titulo: "Volume de academia" },
  { chave: "corrida", tipo: "corrida", variavel: "distancia", unidade: "km", titulo: "Volume de corrida" },
  { chave: "bicicleta", tipo: "bicicleta", variavel: "distancia", unidade: "km", titulo: "Volume de bicicleta" },
  { chave: "cardio", tipo: "cardio", variavel: "tempo", unidade: "min", titulo: "Volume de cardio" },
] as const;

// Paleta categórica validada (checks de contraste/CVD/croma) para até 5 atletas
// na mesma tela — passa dos 5 e a leitura já não é mais confiável, use small
// multiples em vez de espremer mais uma cor.
export const CORES_COMPARATIVO = ["#1C6DD0", "#0F9B8E", "#5B4FA8", "#2F8FCC", "#26568C"];
