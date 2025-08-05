
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-beige/20">
      <div className="w-full h-full flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
};
