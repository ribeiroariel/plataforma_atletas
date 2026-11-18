import type { MetadataRoute } from "next";

// Permite "instalar" o site na tela inicial do celular: abre em tela cheia,
// sem a barra do navegador, direto na tela do atleta.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treinos — Plataforma de Treinamento",
    short_name: "Treinos",
    description: "Seus treinos, cargas e evolução num lugar só.",
    start_url: "/atleta",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0f12",
    theme_color: "#0d0f12",
    lang: "pt-BR",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
