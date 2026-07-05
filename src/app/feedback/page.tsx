import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 bg-lane-chalk px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-track-night">Feedback</h1>
        <p className="text-sm text-track-fog">
          Tem uma ideia para melhorar o site? Encontrou algo que não funciona? Conte pra gente.
          Suas sugestões ajudam a plataforma a ficar melhor para todos os atletas.
        </p>
      </div>
      <FeedbackForm />
    </div>
  );
}
