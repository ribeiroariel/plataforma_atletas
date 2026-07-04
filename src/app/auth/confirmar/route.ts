import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Recebe o retorno do link de recuperação (ou confirmação) de e-mail,
// troca o código por uma sessão e redireciona para `next`.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next") ?? "/";
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL(`/login?erro=${encodeURIComponent("O link expirou ou é inválido. Peça um novo.")}`, request.url),
  );
}
