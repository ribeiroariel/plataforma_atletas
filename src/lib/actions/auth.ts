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
  const confirmarSenha = String(formData.get("confirmar_senha") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const papelForm = String(formData.get("papel") ?? "");

  if (papelForm !== "athlete" && papelForm !== "coach") {
    redirect(`/cadastro?erro=${encodeURIComponent("Selecione se você é atleta ou treinador.")}`);
  }
  if (!nome) {
    redirect(`/cadastro?erro=${encodeURIComponent("Informe seu nome.")}`);
  }
  if (senha !== confirmarSenha) {
    redirect(`/cadastro?erro=${encodeURIComponent("As senhas não coincidem.")}`);
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

export async function enviarRecuperacao(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/recuperar-senha?erro=${encodeURIComponent("Informe seu e-mail.")}`);
  }

  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host") ?? ""}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirmar?next=/redefinir-senha`,
  });

  // Sempre mostra sucesso (não revela se o e-mail existe ou não).
  redirect("/recuperar-senha?enviado=1");
}

export async function definirNovaSenha(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar_senha") ?? "");

  if (senha.length < 6) {
    redirect(`/redefinir-senha?erro=${encodeURIComponent("A senha precisa de ao menos 6 caracteres.")}`);
  }
  if (senha !== confirmar) {
    redirect(`/redefinir-senha?erro=${encodeURIComponent("As senhas não coincidem.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?erro=${encodeURIComponent("O link de recuperação expirou. Peça um novo.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    redirect(`/redefinir-senha?erro=${encodeURIComponent("Não deu para redefinir. Peça um novo link.")}`);
  }

  const papel = await getPapel(supabase, user!.id);
  redirect(rotaPapel(papel));
}
