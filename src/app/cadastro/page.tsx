import Link from "next/link";
import { CadastroForm } from "@/components/auth/CadastroForm";

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

        <CadastroForm />

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
