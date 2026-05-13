import { PubfyWordmark } from "@/components/brand/PubfyWordmark";

type AppBootstrapLoaderProps = {
  className?: string;
};

/** Alinhado ao #pubfy-initial-loader em index.html: fundo Pubfy + wordmark + anel verde (sem emoji). */
export function AppBootstrapLoader({ className }: AppBootstrapLoaderProps) {
  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-center gap-[18px] bg-[#FAF8F2] px-4 ${className ?? ""}`}
      role="status"
      aria-live="polite"
      aria-label="Carregando Pubfy"
    >
      <span className="sr-only">Carregando Pubfy…</span>
      <PubfyWordmark className="min-h-[2.75rem]" />
      <div
        className="size-9 shrink-0 rounded-full border-[3px] border-[rgba(61,64,91,0.12)] border-t-green animate-spin motion-reduce:animate-none"
        aria-hidden
      />
    </div>
  );
}
