/** Remove efeitos colaterais de modais Radix (overlay preso, body sem clique). */
export function cleanupStaleRadixOverlays() {
  if (typeof document === "undefined") return;

  document.body.style.pointerEvents = "";
  document.body.style.overflow = "";
  document.body.removeAttribute("data-scroll-locked");

  document.querySelectorAll('[data-state="closed"]').forEach((node) => {
    const el = node as HTMLElement;
    if (!el.classList.contains("fixed") || !el.classList.contains("inset-0")) return;
    if (!/\bbg-black\//.test(el.className)) return;
    el.remove();
  });
}
