import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fotos de celular (2–5 MB) estouram o teto padrão de 1 MB do body das
    // Server Actions do Next e falhavam ANTES de chegar na action criarPost
    // (que aceita até 5 MB). 6mb dá folga para o overhead de multipart sobre
    // o limite de 5 MB da imagem.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
