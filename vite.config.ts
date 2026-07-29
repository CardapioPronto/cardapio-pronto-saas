
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

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
      mcpPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/jspdf-autotable")) return "jspdf-autotable";
            if (id.includes("node_modules/jspdf")) return "jspdf-core";
            if (id.includes("node_modules/recharts")) return "recharts";
            if (id.includes("node_modules/html2canvas")) return "html2canvas";
          },
        },
      },
    },
    esbuild: {
      // Remove console/debugger em produção para reduzir bundle e ruído
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    // Disponibiliza variáveis de ambiente para o cliente
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
  };
});
