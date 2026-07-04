"use client";

import { useState } from "react";
import { cadastrar } from "@/lib/actions/auth";
import { CampoSenha } from "./CampoSenha";
import { MedidorForcaSenha } from "./MedidorForcaSenha";

export function CadastroForm() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const senhasNaoConferem = confirmarSenha.length > 0 && senha !== confirmarSenha;

  return (
    <form action={cadastrar} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-track-night">
        Nome
        <input
          type="text"
          name="nome"
          required
          autoComplete="name"
          className="rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
        />
      </label>

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

      <div className="flex flex-col gap-1.5">
        <CampoSenha
          name="senha"
          label="Senha"
          autoComplete="new-password"
          minLength={6}
          value={senha}
          onChange={setSenha}
        />
        <MedidorForcaSenha senha={senha} />
      </div>

      <div className="flex flex-col gap-1.5">
        <CampoSenha
          name="confirmar_senha"
          label="Confirmar senha"
          autoComplete="new-password"
          minLength={6}
          value={confirmarSenha}
          onChange={setConfirmarSenha}
        />
        {senhasNaoConferem && (
          <p className="text-xs text-split-ember">As senhas não coincidem.</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-track-night">Eu sou</legend>
        <div className="flex gap-3">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night has-[:checked]:border-stadium-blue has-[:checked]:bg-stadium-blue/5">
            <input type="radio" name="papel" value="athlete" defaultChecked required />
            Atleta
          </label>
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night has-[:checked]:border-stadium-blue has-[:checked]:bg-stadium-blue/5">
            <input type="radio" name="papel" value="coach" required />
            Treinador
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={senhasNaoConferem}
        className="mt-2 rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-50"
      >
        Criar conta
      </button>
    </form>
  );
}
