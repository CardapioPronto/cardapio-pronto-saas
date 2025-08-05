
import { ReactNode } from "react";
import { DashboardSidebarV2 } from "./DashboardSidebarV2";
import DashboardHeader from "./DashboardHeader";

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
}

export default function DashboardLayoutV2({ title, children }: DashboardLayoutProps) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <DashboardSidebarV2 />
      <div className="flex flex-col min-w-0">
        <DashboardHeader title={title} />
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
