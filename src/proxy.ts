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
    path.startsWith("/feed");

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
    return NextResponse.redirect(new URL(rotaPapel(papel), request.url));
  }

  if (path.startsWith("/treinador") && papel !== "coach") {
    return NextResponse.redirect(new URL(rotaPapel(papel), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
