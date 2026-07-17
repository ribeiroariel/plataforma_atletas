// Teste t de Welch (duas amostras independentes, variâncias desiguais) —
// mais adequado aqui que o t de Student "clássico" porque não dá pra supor
// variância igual entre semana atual e anterior (a rotina muda: descarga,
// pico de volume etc). Bicaudal: testa se houve diferença, pra qualquer
// direção (aumento ou redução).
//
// Implementação própria porque não há dependência de estatística no
// projeto — usa a identidade padrão entre a cauda da distribuição t e a
// função beta incompleta regularizada, então só precisa de log-gamma
// (aproximação de Lanczos) e da fração contínua da beta incompleta
// (algoritmo de Numerical Recipes), ambas bem estabelecidas numericamente.

function media(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function variancia(valores: number[], m: number): number {
  if (valores.length < 2) return 0;
  return valores.reduce((acc, v) => acc + (v - m) ** 2, 0) / (valores.length - 1);
}

function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const xm1 = x - 1;
  let a = c[0];
  const t = xm1 + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (xm1 + i);
  return 0.5 * Math.log(2 * Math.PI) + (xm1 + 0.5) * Math.log(t) - t + Math.log(a);
}

function betacf(x: number, a: number, b: number): number {
  const MAXIT = 200;
  const EPS = 3e-9;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betaIncompletaRegularizada(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(x, a, b)) / a;
  }
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}

// P(|T_gl| >= |t|), teste bicaudal.
function pValorBicaudal(t: number, gl: number): number {
  const x = gl / (gl + t * t);
  return betaIncompletaRegularizada(x, gl / 2, 0.5);
}

export type ResultadoTesteT = {
  mediaAnterior: number;
  mediaAtual: number;
  variacaoPercentual: number | null;
  t: number;
  gl: number;
  pValor: number;
  significativo: boolean;
  // Com menos de 3 pontos em algum dos dois períodos o teste t não é
  // minimamente confiável — mostramos a variação % mas não a
  // significância, pra não sugerir confiança estatística que não existe.
  amostraSuficiente: boolean;
};

export function testeT(amostraAnterior: number[], amostraAtual: number[]): ResultadoTesteT | null {
  if (amostraAnterior.length === 0 || amostraAtual.length === 0) return null;

  const mA = media(amostraAnterior);
  const mB = media(amostraAtual);
  const variacaoPercentual = mA > 0 ? ((mB - mA) / mA) * 100 : null;
  const amostraSuficiente = amostraAnterior.length >= 3 && amostraAtual.length >= 3;

  if (!amostraSuficiente) {
    return {
      mediaAnterior: mA,
      mediaAtual: mB,
      variacaoPercentual,
      t: NaN,
      gl: NaN,
      pValor: NaN,
      significativo: false,
      amostraSuficiente: false,
    };
  }

  const vA = variancia(amostraAnterior, mA);
  const vB = variancia(amostraAtual, mB);
  const nA = amostraAnterior.length;
  const nB = amostraAtual.length;
  const erroPadrao = Math.sqrt(vA / nA + vB / nB);

  if (erroPadrao === 0) {
    const iguais = mA === mB;
    return {
      mediaAnterior: mA,
      mediaAtual: mB,
      variacaoPercentual,
      t: 0,
      gl: nA + nB - 2,
      pValor: iguais ? 1 : 0,
      significativo: !iguais,
      amostraSuficiente,
    };
  }

  const t = (mB - mA) / erroPadrao;
  const gl = (vA / nA + vB / nB) ** 2 / ((vA / nA) ** 2 / (nA - 1) + (vB / nB) ** 2 / (nB - 1));
  const pValor = pValorBicaudal(t, gl);

  return {
    mediaAnterior: mA,
    mediaAtual: mB,
    variacaoPercentual,
    t,
    gl,
    pValor,
    significativo: pValor < 0.05,
    amostraSuficiente,
  };
}
