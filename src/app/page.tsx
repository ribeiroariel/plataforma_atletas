import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-lane-chalk px-6 text-center">
      <h1 className="font-display text-4xl font-bold text-track-night">
        Plataforma de Treinamento
      </h1>
      <p className="max-w-md text-track-fog">
        Acompanhamento de treinos para atletas e treinador.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/login"
          className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 font-medium text-white transition-colors hover:bg-deep-lane"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="rounded-[var(--radius-badge)] border border-track-fog/40 px-4 py-2 font-medium text-track-night transition-colors hover:bg-white"
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}
