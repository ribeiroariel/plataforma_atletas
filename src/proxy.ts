import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPapel, rotaPapel } from "@/lib/supabase/profile";

const ROTAS_AUTH = ["/login", "/cadastro"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const rotaDeAuth = ROTAS_AUTH.includes(path);
  const rotaProtegida =
    path.startsWith("/atleta") ||
    path.startsWith("/treinador") ||
    path.startsWith("/feed") ||
    path.startsWith("/feedback");

  if (!user) {
    if (rotaProtegida) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const papel = await getPapel(supabase, user.id);

  if (rotaDeAuth) {
    return NextResponse.redirect(new URL(rotaPapel(papel), request.url));
  }

  if (path.startsWith("/atleta") && papel !== "athlete") {
    // Treinador que também tem cadastro de atleta pode ver o próprio lado de
    // atleta (botão "Ver como atleta"); os demais voltam pro seu painel.
    const { data: atleta } = await supabase.from("athletes").select("id").eq("user_id", user.id).maybeSingle();
    if (!atleta) {
      return NextResponse.redirect(new URL(rotaPapel(papel), request.url));
    }
  }

  // Lembra em qual lado a pessoa está, pro feed/feedback mostrarem o menu certo.
  if (path.startsWith("/atleta") || path.startsWith("/treinador")) {
    response.cookies.set("visao", path.startsWith("/atleta") ? "athlete" : "coach", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (path.startsWith("/treinador") && papel !== "coach") {
    return NextResponse.redirect(new URL(rotaPapel(papel), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
