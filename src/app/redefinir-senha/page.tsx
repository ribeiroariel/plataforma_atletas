import { RedefinirSenhaForm } from "@/components/auth/RedefinirSenhaForm";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-lane-chalk px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-bold text-track-night">
          Nova senha
        </h1>
        <p className="mt-1 text-sm text-track-fog">
          Escolha uma nova senha para sua conta.
        </p>

        {erro && (
          <p className="mt-4 rounded-[var(--radius-badge)] border border-split-ember/30 bg-split-ember/10 px-3 py-2 text-sm text-split-ember">
            {erro}
          </p>
        )}

        <RedefinirSenhaForm />
      </div>
    </div>
  );
}
