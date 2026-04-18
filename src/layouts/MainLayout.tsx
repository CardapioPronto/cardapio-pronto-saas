
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserSession } from '@/hooks/useUserSession';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { authUser, loading } = useUserSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto">{children}</main>
    </div>
  );
};
