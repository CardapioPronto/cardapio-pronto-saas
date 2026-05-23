/** Placeholder usado no workflow de CI para não depender do projeto Supabase em produção. */
export function isCiPlaceholderSupabase(): boolean {
  return (
    import.meta.env.VITE_SUPABASE_URL === "https://example.supabase.co" &&
    import.meta.env.VITE_SUPABASE_ANON_KEY === "ci-placeholder-anon-key"
  );
}
