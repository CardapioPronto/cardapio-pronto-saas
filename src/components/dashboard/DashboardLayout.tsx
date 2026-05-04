
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
    <div className="h-screen w-full overflow-hidden bg-beige/10 md:flex">
      <DashboardSidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <DashboardHeader title={title} />
        <main className="dashboard-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          {/* <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6"> */}
          <div className="mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <TrialBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
