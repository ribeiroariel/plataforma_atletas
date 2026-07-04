import Link from "next/link";

export default function VerifiqueEmailPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-lane-chalk px-6 text-center">
      <h1 className="font-display text-2xl font-bold text-track-night">
        Confirme seu e-mail
      </h1>
      <p className="max-w-sm text-track-fog">
        Enviamos um link de confirmação para o seu e-mail. Abra-o para
        ativar sua conta e depois volte para entrar.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-[var(--radius-badge)] border border-track-fog/40 px-4 py-2 text-sm font-medium text-track-night hover:bg-white"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
