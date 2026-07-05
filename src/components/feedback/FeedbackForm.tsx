"use client";

import { useActionState, useState } from "react";
import { enviarFeedback } from "@/lib/actions/feedback";

const CATEGORIAS = [
  { valor: "ideia", rotulo: "Ideia de melhoria" },
  { valor: "problema", rotulo: "Problema / bug" },
  { valor: "elogio", rotulo: "Elogio" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export function FeedbackForm() {
  const [estado, formAction, pendente] = useActionState(enviarFeedback, null);

  const [categoria, setCategoria] = useState<string>("ideia");
  const [mensagem, setMensagem] = useState("");
  // Guarda o último envio já "limpo" para não apagar o que o usuário digitar
  // depois de enviar (cada sucesso é um objeto novo).
  const [sucessoTratado, setSucessoTratado] = useState<unknown>(null);

  const sucesso = estado !== null && "ok" in estado;

  // Limpa o formulário uma única vez por envio bem-sucedido.
  if (sucesso && estado !== sucessoTratado) {
    setCategoria("ideia");
    setMensagem("");
    setSucessoTratado(estado);
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-5 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-track-night">
        Categoria
        <select
          name="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night outline-none transition-colors focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-track-night">
        Sua sugestão
        <textarea
          name="mensagem"
          rows={5}
          maxLength={2000}
          required
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Conte o que você gostaria de ver melhorado no site..."
          className="resize-none rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night outline-none transition-colors placeholder:text-track-fog focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
        />
        <span className="self-end text-xs text-track-fog">{mensagem.length}/2000</span>
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm" aria-live="polite">
          {estado !== null && "erro" in estado && (
            <span role="alert" className="font-medium text-split-ember">
              {estado.erro}
            </span>
          )}
          {sucesso && (
            <span className="font-medium text-stadium-blue">
              Obrigado! Sua sugestão foi enviada.
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={pendente || !mensagem.trim()}
          className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-deep-lane focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stadium-blue/40 disabled:opacity-60"
        >
          {pendente ? "Enviando..." : "Enviar sugestão"}
        </button>
      </div>
    </form>
  );
}
