import Link from "next/link";
import { enviarRecuperacao } from "@/lib/actions/auth";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  const { erro, enviado } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-lane-chalk px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-track-night">
          Recuperar senha
        </h1>
        <p className="mt-1 text-sm text-track-fog">
          Enviamos um link para você criar uma nova senha.
        </p>

        {erro && (
          <p className="mt-4 rounded-[var(--radius-badge)] border border-split-ember/30 bg-split-ember/10 px-3 py-2 text-sm text-split-ember">
            {erro}
          </p>
        )}

        {enviado ? (
          <p className="mt-6 rounded-[var(--radius-badge)] border border-stadium-blue/30 bg-stadium-blue/10 px-3 py-3 text-sm text-track-night">
            Se houver uma conta com esse e-mail, o link de recuperação já está a
            caminho. Confira sua caixa de entrada (e o spam).
          </p>
        ) : (
          <form action={enviarRecuperacao} className="mt-6 flex flex-col gap-4">
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
            <button
              type="submit"
              className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 font-medium text-white transition-colors hover:bg-deep-lane"
            >
              Enviar link de recuperação
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-track-fog">
          <Link href="/login" className="font-medium text-stadium-blue hover:underline">
            Voltar para entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
