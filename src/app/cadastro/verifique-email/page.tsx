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
    </div>
  );
}
