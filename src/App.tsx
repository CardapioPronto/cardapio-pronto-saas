
import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { initSupabase, setupAuthListeners } from './lib/supabase-init';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/react';
import AppRoutes from './components/AppRoutes';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { captureException } from '@/lib/observability';
import { CookieConsentBar } from '@/components/legal/CookieConsentBar';
import { AppBootstrapLoader } from '@/components/brand/AppBootstrapLoader';
import { OfflineStatusBanner } from '@/components/pwa/OfflineStatusBanner';

// Create a client
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      captureException(error, {
        source: 'react_query',
        queryHash: query.queryHash,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      captureException(error, {
        source: 'react_query_mutation',
        mutationKey: mutation.options.mutationKey,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function App() {
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSupabase = async () => {
      const isReady = await initSupabase();
      setSupabaseReady(isReady);

      if (isReady) {
        setupAuthListeners();
      }
      setIsLoading(false);
    };

    initializeSupabase();
  }, []);

  if (isLoading) {
    return <AppBootstrapLoader />;
  }

  // Verifica se está em produção e não é localhost para carregar o Analytics
  const isProduction = import.meta.env.PROD && 
                      typeof window !== 'undefined' && 
                      !window.location.hostname.includes('localhost') &&
                      !window.location.hostname.includes('lovableproject.com');

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AppRoutes />
                <CookieConsentBar />
                <OfflineStatusBanner />
              </BrowserRouter>
              <Toaster />
              {isProduction && <Analytics />}
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
