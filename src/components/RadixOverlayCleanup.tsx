import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cleanupStaleRadixOverlays } from "@/lib/radixOverlayCleanup";

/** Fecha overlays Radix órfãos ao trocar de rota (ex.: Sheet do menu mobile). */
export function RadixOverlayCleanup() {
  const location = useLocation();

  useEffect(() => {
    cleanupStaleRadixOverlays();
  }, []);

  useEffect(() => {
    cleanupStaleRadixOverlays();
  }, [location.pathname]);

  return null;
}
