"use client";

import { useState } from "react";
import { definirNovaSenha } from "@/lib/actions/auth";
import { CampoSenha } from "./CampoSenha";
import { MedidorForcaSenha } from "./MedidorForcaSenha";

export function RedefinirSenhaForm() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const naoConferem = confirmar.length > 0 && senha !== confirmar;

  return (
    <form action={definirNovaSenha} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <CampoSenha
          name="senha"
          label="Nova senha"
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
          label="Confirmar nova senha"
          autoComplete="new-password"
          minLength={6}
          value={confirmar}
          onChange={setConfirmar}
        />
        {naoConferem && <p className="text-xs text-split-ember">As senhas não coincidem.</p>}
      </div>

      <button
        type="submit"
        disabled={naoConferem}
        className="mt-1 rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-50"
      >
        Salvar nova senha
      </button>
    </form>
  );
}
