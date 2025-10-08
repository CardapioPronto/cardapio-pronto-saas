
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-4xl text-primary animate-spin">
          🍕
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto">
        {children}
      </main>
    </div>
  );
};
