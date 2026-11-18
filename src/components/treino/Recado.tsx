"use client";

import { useActionState, useState } from "react";
import { responderRecado } from "@/lib/actions/sessao";
import { dataCurta } from "@/lib/datas";
import type { Resposta } from "@/lib/treino/logs";

// Um recado do atleta com a conversa que veio depois. Atleta e treinador
// podem responder; a tela se atualiza quando a resposta é gravada.
export function Recado({
  id,
  texto,
  data,
  respostas,
  caminho,
  autor,
}: {
  id: string;
  texto: string;
  data: string;
  respostas: Resposta[];
  // Página a redesenhar depois de responder.
  caminho: string;
  // Nome de quem escreveu o recado, quando quem lê é o treinador.
  autor?: string;
}) {
  const [estado, formAction, pendente] = useActionState(responderRecado, null);
  const [resposta, setResposta] = useState("");
  const [aberto, setAberto] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-ash">
      <p className="tabular-data text-[11px] text-cinza">
        {autor ? `${autor} · ` : ""}
        {dataCurta(data)}
      </p>
      <p className="text-sm leading-relaxed break-words text-ink/85">{texto}</p>

      {respostas.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2 border-l-2 border-ash pl-3">
          {respostas.map((r) => (
            <li key={r.id} className={`rounded-xl px-3 py-2 text-sm ${r.meu ? "bg-ink text-white" : "bg-bone text-ink/85"}`}>
              <span className={`rotulo mr-2 text-[10px] ${r.meu ? "text-white/55" : "text-cinza"}`}>
                {r.meu ? "Você" : r.autor} · {dataCurta(r.quando)}
              </span>
              <span className="break-words">{r.texto}</span>
            </li>
          ))}
        </ul>
      )}

      {aberto ? (
        <form
          action={(formData) => {
            formAction(formData);
            setResposta("");
          }}
          className="mt-1 flex flex-col gap-2"
        >
          <input type="hidden" name="observation_id" value={id} />
          <input type="hidden" name="caminho" value={caminho} />
          <label className="sr-only" htmlFor={`resposta-${id}`}>
            Sua resposta
          </label>
          <textarea
            id={`resposta-${id}`}
            name="texto"
            rows={2}
            maxLength={2000}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Escreva sua resposta"
            className="rounded-xl bg-bone px-3 py-2 text-sm text-ink ring-1 ring-ash outline-none focus:ring-2 focus:ring-ink"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pendente || resposta.trim().length === 0}
              className="h-10 rounded-full bg-ink px-4 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-ink-3 disabled:opacity-40"
            >
              {pendente ? "Enviando…" : "Responder"}
            </button>
            {estado && "erro" in estado && <span className="text-xs text-erro">{estado.erro}</span>}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rotulo w-fit py-1 text-[10px] text-ink underline-offset-4 hover:underline"
        >
          Responder
        </button>
      )}
    </li>
  );
}
