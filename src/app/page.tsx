import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-[100svh] flex-col">
      <Image
        src="/fotos/hero-chegada.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-105 object-cover object-[65%_30%] blur-md"
      />
      <div
        className="absolute inset-0"
        style={{ background: "rgba(10,25,48,0.72)" }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="text-xs font-semibold tracking-[0.25em] text-sky-split uppercase">
          Plataforma de treinos
        </span>
        <h1 className="max-w-2xl font-display text-4xl font-bold leading-[1.08] text-white sm:text-6xl">
          O acompanhamento dos seus treinos, num lugar só.
        </h1>
        <p className="max-w-md text-base text-white/70">
          Uma plataforma em desenvolvimento para os atletas que treinam com as
          planilhas do Ariel — pensada para facilitar o dia a dia deles.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-[var(--radius-badge)] bg-stadium-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-split hover:text-track-night"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-[var(--radius-badge)] border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Criar conta
          </Link>
        </div>
      </main>
    </div>
  );
}
