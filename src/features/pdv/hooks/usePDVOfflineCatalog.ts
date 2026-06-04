import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  fetchPDVMesas,
  fetchPDVOfflineCatalog,
  PDVOfflineCatalogSnapshot,
  readPDVOfflineCatalog,
  writePDVOfflineCatalog,
} from "../services/pdvOfflineCatalogService";

export type PDVCatalogDataSource = "network" | "cache" | "none";

export function usePDVOfflineCatalog(restaurantId: string) {
  const { isOnline, isChecking } = useNetworkStatus();
  const [snapshot, setSnapshot] = useState<PDVOfflineCatalogSnapshot | null>(null);
  const [dataSource, setDataSource] = useState<PDVCatalogDataSource>("none");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCatalog = useCallback(async () => {
    if (!restaurantId) {
      setSnapshot(null);
      setDataSource("none");
      setLoading(false);
      return;
    }

    const cached = readPDVOfflineCatalog(restaurantId);
    if (cached) {
      setSnapshot(cached);
      setDataSource("cache");
      setLoading(false);
    } else {
      setSnapshot(null);
      setDataSource("none");
      setLoading(true);
    }

    if (!isOnline) {
      setError(cached ? null : "Nenhum catálogo sincronizado está disponível neste dispositivo.");
      setLoading(false);
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      const nextSnapshot = await fetchPDVOfflineCatalog(restaurantId);
      writePDVOfflineCatalog(nextSnapshot);
      setSnapshot(nextSnapshot);
      setDataSource("network");
    } catch (syncError) {
      console.error("Erro ao sincronizar dados locais do PDV:", syncError);
      setError(
        cached
          ? "Não foi possível atualizar os dados. Exibindo a última sincronização disponível."
          : "Não foi possível carregar os dados do PDV.",
      );
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [isOnline, restaurantId]);

  const refreshMesas = useCallback(async () => {
    if (!restaurantId || !isOnline) return;

    try {
      const mesas = await fetchPDVMesas(restaurantId);
      setSnapshot((current) => {
        if (!current) return current;
        const nextSnapshot = {
          ...current,
          mesas,
        };
        writePDVOfflineCatalog(nextSnapshot);
        return nextSnapshot;
      });
    } catch (refreshError) {
      console.error("Erro ao atualizar mesas do PDV:", refreshError);
    }
  }, [isOnline, restaurantId]);

  useEffect(() => {
    void syncCatalog();
  }, [syncCatalog]);

  useEffect(() => {
    if (!restaurantId || !isOnline) return;

    const handleMesasChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ restaurantId?: string }>).detail;
      if (!detail?.restaurantId || detail.restaurantId === restaurantId) {
        void refreshMesas();
      }
    };

    window.addEventListener("mesas:changed", handleMesasChanged);

    const channel = supabase
      .channel(`pdv-offline-catalog-mesas-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mesas",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => void refreshMesas(),
      )
      .subscribe();

    return () => {
      window.removeEventListener("mesas:changed", handleMesasChanged);
      void supabase.removeChannel(channel);
    };
  }, [isOnline, refreshMesas, restaurantId]);

  return {
    produtos: snapshot?.products ?? [],
    totalProdutos: snapshot?.productsTotal ?? 0,
    produtosListaTruncada: snapshot?.productsTruncated ?? false,
    categorias: snapshot?.categories ?? [],
    mesas: snapshot?.mesas ?? [],
    areas: snapshot?.areas ?? [],
    ultimaSincronizacao: snapshot?.syncedAt ?? null,
    possuiDadosLocais: Boolean(snapshot),
    usandoCache: dataSource === "cache",
    dataSource,
    isOnline,
    isChecking,
    loading,
    syncing,
    error,
    syncCatalog,
    refreshMesas,
  };
}
