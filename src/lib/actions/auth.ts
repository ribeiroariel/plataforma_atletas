"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPapel, rotaPapel, type Papel } from "@/lib/supabase/profile";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error || !data.user) {
    redirect(`/login?erro=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  }

  const papel = await getPapel(supabase, data.user.id);
  redirect(rotaPapel(papel));
}

export async function cadastrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const papelForm = String(formData.get("papel") ?? "");

  if (papelForm !== "athlete" && papelForm !== "coach") {
    redirect(`/cadastro?erro=${encodeURIComponent("Selecione se você é atleta ou treinador.")}`);
  }
  if (!nome) {
    redirect(`/cadastro?erro=${encodeURIComponent("Informe seu nome.")}`);
  }

  const papel = papelForm as Papel;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome, papel } },
  });

  if (error) {
    redirect(`/cadastro?erro=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/cadastro/verifique-email");
  }

  redirect(rotaPapel(papel));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
