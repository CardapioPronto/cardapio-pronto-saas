
import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { initSupabase, setupAuthListeners } from './lib/supabase-init';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@vercel/analytics/react';
import AppRoutes from './components/AppRoutes';

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

  if (isLoading || !supabaseReady) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-4xl text-primary animate-spin">
          🍕
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
        <Analytics />
      </div>
    </AuthProvider>
  );
}

export default App;
