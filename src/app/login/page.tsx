import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { CampoSenha } from "@/components/auth/CampoSenha";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-lane-chalk px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-track-night">
          Entrar
        </h1>
        <p className="mt-1 text-sm text-track-fog">
          Acesse sua conta de atleta ou treinador.
        </p>

        {erro && (
          <p className="mt-4 rounded-[var(--radius-badge)] border border-split-ember/30 bg-split-ember/10 px-3 py-2 text-sm text-split-ember">
            {erro}
          </p>
        )}

        <form action={login} className="mt-6 flex flex-col gap-4">
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

          <CampoSenha name="senha" label="Senha" autoComplete="current-password" />

          <button
            type="submit"
            className="mt-2 rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 font-medium text-white transition-colors hover:bg-deep-lane"
          >
            Entrar
          </button>
        </form>

        <p className="mt-6 text-sm text-track-fog">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-stadium-blue hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
