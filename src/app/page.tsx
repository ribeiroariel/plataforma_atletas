import Image from "next/image";
import Link from "next/link";
import { IconeAcademia, IconeCorrida, IconePista } from "@/components/icons/IconesTreino";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-end overflow-hidden bg-track-night">
        <Image
          src="/fotos/hero-chegada.webp"
          alt="Atleta cruzando a linha de chegada em prova de atletismo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[65%_30%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,25,48,0.15) 0%, rgba(10,25,48,0.55) 55%, rgba(10,25,48,0.94) 100%)",
          }}
        />
        <div className="relative z-10 w-full px-6 pb-14 pt-24 sm:px-10 sm:pb-16">
          <div className="max-w-2xl animate-[subir_0.6s_ease-out]">
            <p className="text-xs font-semibold tracking-[0.2em] text-sky-split uppercase">
              Plataforma de treinamento · Atletismo
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
              O treino sai da pista e vira progresso visível.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
              Planos de treino organizados, evolução semana a semana e um
              treinador que acompanha tudo — atleta e treinador na mesma
              plataforma.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/cadastro"
                className="rounded-[var(--radius-badge)] bg-stadium-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-split hover:text-track-night"
              >
                Criar conta
              </Link>
              <Link
                href="/login"
                className="rounded-[var(--radius-badge)] border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Valor */}
      <section className="bg-lane-chalk px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <IconeAcademia className="h-6 w-6 text-stadium-blue" />
            <h3 className="font-display text-lg font-semibold text-track-night">
              Treino renderizado como app
            </h3>
            <p className="text-sm text-track-fog">
              A planilha que o treinador monta vira uma tela organizada por
              dia, com exercícios e séries fáceis de seguir — ou baixe o
              arquivo original quando quiser.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <IconeCorrida className="h-6 w-6 text-stadium-blue" />
            <h3 className="font-display text-lg font-semibold text-track-night">
              Evolução semana a semana
            </h3>
            <p className="text-sm text-track-fog">
              Volume de academia, corrida, bicicleta e cardio somados por
              semana, com variação percentual e recorde marcado quando
              acontece de verdade.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <IconePista className="h-6 w-6 text-stadium-blue" />
            <h3 className="font-display text-lg font-semibold text-track-night">
              Seu treinador acompanha tudo
            </h3>
            <p className="text-sm text-track-fog">
              Um painel próprio mostra todos os atletas vinculados, as
              observações de cada treino e um comparativo lado a lado entre
              atletas.
            </p>
          </div>
        </div>
      </section>

      {/* Split com foto */}
      <section className="grid grid-cols-1 bg-white lg:grid-cols-2">
        <div className="relative min-h-[360px]">
          <Image
            src="/fotos/retrato-402.webp"
            alt="Atleta da equipe FURB durante prova de atletismo"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-top"
          />
        </div>
        <div className="flex flex-col justify-center gap-4 px-6 py-14 sm:px-12 lg:py-0">
          <p className="text-xs font-semibold tracking-[0.2em] text-stadium-blue uppercase">
            Feita por quem também compete
          </p>
          <h2 className="font-display text-3xl font-bold text-track-night">
            Montada por um treinador que também está na pista
          </h2>
          <p className="max-w-md text-track-fog">
            Cada planilha, cada zona de frequência e cada estrutura de
            treino aqui reflete rotina real de pista e de academia — não um
            modelo genérico de aplicativo de treino.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden bg-track-night px-6 py-20 sm:px-10">
        <div className="absolute inset-0 opacity-25">
          <Image
            src="/fotos/prova-167.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_25%]"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,25,48,0.85) 0%, rgba(10,25,48,0.96) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Pronto para começar?
          </h2>
          <p className="text-white/70">
            Crie sua conta de atleta ou de treinador — o que você vê depois
            de entrar já muda de acordo com o seu papel.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/cadastro"
              className="rounded-[var(--radius-badge)] bg-stadium-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-split hover:text-track-night"
            >
              Criar conta
            </Link>
            <Link
              href="/login"
              className="rounded-[var(--radius-badge)] border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Entrar
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
