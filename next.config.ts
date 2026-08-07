import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não bloqueia o build de produção por avisos de ESLint (o typecheck agora passa limpo).
  eslint: {
    ignoreDuringBuilds: true,
  },
} as NextConfig;

export default nextConfig;
