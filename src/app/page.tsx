import Link from "next/link";
import { Marca } from "@/components/layout/Sidebar";
import { FOTOS } from "@/lib/fotos";
import { FotoFoco } from "@/components/ui/FotoFoco";
import { FotoRotativa } from "@/components/ui/FotoRotativa";
import { Revelar } from "@/components/ui/Revelar";
import { DemoRegistro } from "@/components/landing/DemoRegistro";

const PALAVRAS = ["Força", "Velocidade", "Pista", "Academia", "Resistência", "Constância"];

const PASSOS = [
  {
    numero: "01",
    titulo: "Abra o treino do dia",
    texto: "A planilha do treinador vira uma tela limpa: a semana, o dia de hoje e cada exercício na ordem.",
  },
  {
    numero: "02",
    titulo: "Registre série por série",
    texto: "Carga, tempo ou pace direto no exercício. Salva sozinho, lembra a semana passada e cronometra o descanso.",
  },
  {
    numero: "03",
    titulo: "Acompanhe a evolução",
    texto: "Volume por semana e progressão de carga por exercício — você e seu treinador olhando os mesmos números.",
  },
];

// Galeria da página inicial: atletas da equipe em prova e em jogo.
// "caixa" define o tamanho de cada foto na grade (2 colunas no celular, 12 no computador).
const GALERIA = [
  {
    foto: FOTOS.futebolTreino,
    caixa: "col-span-2 aspect-[16/11] md:col-span-7 md:aspect-auto md:min-h-[30rem]",
    sizes: "(min-width: 768px) 58vw, 100vw",
  },
  {
    foto: FOTOS.saltoAreia,
    caixa: "col-span-2 aspect-[4/3] md:col-span-5 md:aspect-auto",
    sizes: "(min-width: 768px) 42vw, 100vw",
  },
  {
    foto: FOTOS.revezamento,
    caixa: "aspect-[3/4] md:col-span-4 md:aspect-[4/3]",
    sizes: "(min-width: 768px) 33vw, 50vw",
  },
  {
    foto: FOTOS.futebolDisputa,
    caixa: "aspect-[3/4] md:col-span-4 md:aspect-[4/3]",
    sizes: "(min-width: 768px) 33vw, 50vw",
  },
  {
    foto: FOTOS.saltoCorrida,
    caixa: "col-span-2 aspect-[16/10] md:col-span-4 md:aspect-[4/3]",
    sizes: "(min-width: 768px) 33vw, 100vw",
  },
  {
    foto: FOTOS.futebolConducao,
    caixa: "col-span-2 aspect-[16/10] md:col-span-5 md:aspect-auto md:min-h-[20rem]",
    sizes: "(min-width: 768px) 42vw, 100vw",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col bg-ink text-white">
      {/* Abertura */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <FotoRotativa />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/35" />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
          <Marca />
          <nav className="flex items-center gap-2">
            <Link
              href="/cadastro"
              className="hidden min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-white/80 transition-colors hover:text-white sm:flex"
            >
              Criar conta
            </Link>
            <Link
              href="/login"
              className="flex min-h-[44px] items-center rounded-full bg-white px-5 text-sm font-bold text-ink transition-colors hover:bg-sinal"
            >
              Entrar
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mt-auto flex flex-col gap-6 px-5 pb-12 sm:px-10 sm:pb-16">
          <p className="rotulo animate-subir text-sinal">Plataforma de treinos · atletismo e força</p>
          <h1 className="font-display animate-subir max-w-5xl text-[clamp(3.25rem,11vw,9rem)] leading-[0.9] font-black uppercase [animation-delay:80ms]">
            Treino feito
            <br />é treino <span className="text-tartan">anotado.</span>
          </h1>
          <div className="animate-subir flex flex-col gap-6 [animation-delay:200ms] sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              O lugar onde os atletas do Ariel abrem a planilha da semana, registram cada carga e enxergam a própria
              evolução.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="flex min-h-[56px] items-center gap-3 rounded-full bg-tartan px-8 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-tartan-escuro"
              >
                Entrar no treino
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/cadastro"
                className="flex min-h-[56px] items-center rounded-full border border-white/35 px-8 text-sm font-bold tracking-wide uppercase transition-colors hover:bg-white hover:text-ink"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa */}
      <div className="overflow-hidden border-y border-white/10 bg-tartan py-3" aria-hidden>
        <div className="esteira flex w-max gap-8 whitespace-nowrap">
          {[...PALAVRAS, ...PALAVRAS, ...PALAVRAS, ...PALAVRAS].map((p, i) => (
            <span key={i} className="font-display flex items-center gap-8 text-2xl font-extrabold uppercase">
              {p}
              <span className="h-2 w-2 rounded-full bg-ink" />
            </span>
          ))}
        </div>
      </div>

      {/* Registro — amostra interativa */}
      <section className="raias px-5 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Revelar>
            <p className="rotulo text-tartan">Registro de cargas</p>
            <h2 className="font-display mt-3 text-5xl leading-[0.92] font-black uppercase sm:text-7xl">
              Anotar leva
              <br />
              dois toques.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
              Entre uma série e outra não dá pra brigar com planilha no celular. Aqui a carga da semana passada já vem
              sugerida: ajuste no <span className="text-white">+</span> e <span className="text-white">−</span>, toque
              no check e o descanso começa a contar.
            </p>
          </Revelar>
          <Revelar atraso={150} className="flex justify-center lg:justify-end">
            <DemoRegistro />
          </Revelar>
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-bone px-5 py-20 text-ink sm:px-10 sm:py-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
          <Revelar>
            <h2 className="font-display max-w-3xl text-5xl leading-[0.92] font-black uppercase sm:text-7xl">
              Da planilha
              <br />
              ao resultado.
            </h2>
          </Revelar>
          <ol className="grid gap-px overflow-hidden rounded-3xl bg-ash ring-1 ring-ash md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.numero} className="bg-white">
                <Revelar atraso={i * 120} className="flex h-full flex-col gap-3 p-7 sm:p-9">
                  <span className="font-display text-6xl leading-none font-black text-tartan">{p.numero}</span>
                  <h3 className="font-display text-2xl leading-tight font-extrabold uppercase">{p.titulo}</h3>
                  <p className="text-sm leading-relaxed text-cinza">{p.texto}</p>
                </Revelar>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Fotos */}
      <section className="px-5 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-12">
          {GALERIA.map((item, i) => (
            <Revelar
              key={item.foto.src}
              modo="cortina"
              atraso={(i % 3) * 110}
              className={`relative overflow-hidden rounded-2xl ${item.caixa}`}
            >
              <FotoFoco
                foto={item.foto}
                sizes={item.sizes}
                className="transition-transform duration-[1200ms] hover:scale-105"
              />
            </Revelar>
          ))}
          <Revelar className="col-span-2 flex flex-col justify-between gap-8 rounded-2xl bg-ink-2 p-7 sm:p-10 md:col-span-7">
            <p className="font-display text-4xl leading-[0.95] font-black uppercase sm:text-6xl">
              O treino é seu.
              <br />
              <span className="text-sinal">O registro também.</span>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/cadastro"
                className="flex min-h-[52px] items-center rounded-full bg-white px-7 text-sm font-bold tracking-wide text-ink uppercase transition-colors hover:bg-sinal"
              >
                Criar minha conta
              </Link>
              <Link href="/login" className="rotulo text-white/60 underline-offset-4 hover:text-white hover:underline">
                Já tenho conta
              </Link>
            </div>
          </Revelar>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-6 sm:px-10">
        <Marca />
        <p className="rotulo text-white/35">Plataforma em desenvolvimento · feita para quem treina</p>
      </footer>
    </div>
  );
}
