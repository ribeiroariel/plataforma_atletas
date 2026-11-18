import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const body = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Plataforma de Treinamento",
  description: "Acompanhamento de treinos para atletas e treinador",
  applicationName: "Treinos",
  // No iPhone, "Adicionar à Tela de Início" abre em tela cheia.
  appleWebApp: { capable: true, title: "Treinos", statusBarStyle: "black-translucent" },
};

// Cor da barra do sistema no celular, igual ao topo escuro do site.
export const viewport: Viewport = {
  themeColor: "#0d0f12",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
