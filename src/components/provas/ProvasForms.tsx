"use client";

import { useActionState, useTransition } from "react";
import { criarMarca, criarProva, removerMarca, removerProva } from "@/lib/actions/provas";

const CAMPO =
  "h-12 w-full rounded-xl bg-bone px-3 text-base text-ink ring-1 ring-ash outline-none placeholder:text-cinza focus:ring-2 focus:ring-ink";
const BOTAO =
  "h-12 rounded-xl bg-tartan px-5 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-tartan-escuro disabled:opacity-50";

function Aviso({ estado, sucesso }: { estado: { ok: true } | { erro: string } | null; sucesso: string }) {
  if (!estado) return null;
  return "erro" in estado ? (
    <p className="text-xs text-erro">{estado.erro}</p>
  ) : (
    <p className="text-xs text-ok">{sucesso}</p>
  );
}

export function NovaProvaForm({ hoje }: { hoje: string }) {
  const [estado, acao, pendente] = useActionState(criarProva, null);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="rotulo text-cinza">Nome da prova</span>
        <input name="nome" required maxLength={120} placeholder="ex.: Estadual Sub-23" className={CAMPO} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Data</span>
          <input type="date" name="data" required min={hoje} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Local · opcional</span>
          <input name="local" maxLength={120} placeholder="ex.: Blumenau" className={CAMPO} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? "Salvando…" : "Adicionar prova"}
        </button>
        <Aviso estado={estado} sucesso="Prova adicionada." />
      </div>
    </form>
  );
}

export function NovaMarcaForm({ hoje, provasConhecidas }: { hoje: string; provasConhecidas: string[] }) {
  const [estado, acao, pendente] = useActionState(criarMarca, null);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Prova</span>
          <input name="prova" required maxLength={60} list="provas-conhecidas" placeholder="ex.: 100 m" className={CAMPO} />
          <datalist id="provas-conhecidas">
            {provasConhecidas.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Tipo de marca</span>
          <select name="unidade" defaultValue="s" className={CAMPO}>
            <option value="s">Tempo (menor é melhor)</option>
            <option value="m">Distância ou altura, em metros</option>
            <option value="pts">Pontos</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Marca</span>
          <input name="valor" required inputMode="decimal" placeholder="10,85 ou 1:58,30" className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Data</span>
          <input type="date" name="data" required max={hoje} defaultValue={hoje} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-cinza">Competição · opcional</span>
          <input name="competicao" maxLength={120} className={CAMPO} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? "Salvando…" : "Registrar marca"}
        </button>
        <Aviso estado={estado} sucesso="Marca registrada." />
      </div>
    </form>
  );
}

export function BotaoRemover({ tipo, id, rotulo }: { tipo: "prova" | "marca"; id: string; rotulo: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      aria-label={`Remover ${rotulo}`}
      title="Remover"
      onClick={() => {
        if (!window.confirm(`Remover ${rotulo}?`)) return;
        iniciar(async () => {
          await (tipo === "prova" ? removerProva(id) : removerMarca(id));
        });
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cinza transition-colors hover:bg-bone hover:text-erro disabled:opacity-40"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    </button>
  );
}
