
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente do .env para diferentes ambientes
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Disponibiliza variáveis de ambiente para o cliente
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }

            const normalizedId = id.replace(/\\/g, '/');

            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router-dom/')
            ) {
              return 'vendor-react';
            }

            if (normalizedId.includes('/node_modules/@supabase/')) {
              return 'vendor-supabase';
            }

            if (
              normalizedId.includes('/node_modules/recharts/') ||
              normalizedId.includes('/node_modules/d3-')
            ) {
              return 'vendor-charts';
            }

            if (
              normalizedId.includes('/node_modules/@radix-ui/') ||
              normalizedId.includes('/node_modules/lucide-react/') ||
              normalizedId.includes('/node_modules/class-variance-authority/') ||
              normalizedId.includes('/node_modules/tailwind-merge/') ||
              normalizedId.includes('/node_modules/clsx/')
            ) {
              return 'vendor-ui';
            }

            if (normalizedId.includes('/node_modules/@tanstack/')) {
              return 'vendor-query';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
