import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.18"],
  experimental: {
    serverActions: {
      // Las fotos de cámara fácilmente pasan de 1MB (el default).
      // El bucket de Supabase acepta hasta 10MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
