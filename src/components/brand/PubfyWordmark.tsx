/**
 * Logo textual leve para navbar / sidebar (elimina raster PNG grande no bundle inicial).
 */
type PubfyWordmarkProps = {
  className?: string;
};

export function PubfyWordmark({ className }: PubfyWordmarkProps) {
  return (
    <span className={`flex items-center gap-2 font-bold tracking-tight text-navy ${className ?? ""}`}>
      <span className="relative flex flex-col leading-none">
        <span className="text-xl md:text-2xl">Pubfy</span>
        <span className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-green/70" />
      </span>
      <span className="hidden rounded-md bg-orange/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange sm:inline-block">
        menu
      </span>
    </span>
  );
}
