
import React, { ReactNode } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { TrialBanner } from "@/components/subscription/TrialBanner";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen w-full flex bg-beige/10">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader title={title} />
        <main className="flex-1 p-6 overflow-auto w-full">
          <TrialBanner />
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
