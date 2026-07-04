import Link from "next/link";
import { cadastrar } from "@/lib/actions/auth";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-lane-chalk px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-track-night">
          Criar conta
        </h1>
        <p className="mt-1 text-sm text-track-fog">
          Diga se você é atleta ou treinador — isso define o que você vê depois de entrar.
        </p>

        {erro && (
          <p className="mt-4 rounded-[var(--radius-badge)] border border-split-ember/30 bg-split-ember/10 px-3 py-2 text-sm text-split-ember">
            {erro}
          </p>
        )}

        <form action={cadastrar} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-track-night">
            Nome
            <input
              type="text"
              name="nome"
              required
              autoComplete="name"
              className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-track-night">
            E-mail
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-track-night">
            Senha
            <input
              type="password"
              name="senha"
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-track-night">Eu sou</legend>
            <div className="flex gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night has-[:checked]:border-stadium-blue has-[:checked]:bg-stadium-blue/5">
                <input type="radio" name="papel" value="athlete" defaultChecked required />
                Atleta
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night has-[:checked]:border-stadium-blue has-[:checked]:bg-stadium-blue/5">
                <input type="radio" name="papel" value="coach" required />
                Treinador
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-2 rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 font-medium text-white transition-colors hover:bg-deep-lane"
          >
            Criar conta
          </button>
        </form>

        <p className="mt-6 text-sm text-track-fog">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-stadium-blue hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
