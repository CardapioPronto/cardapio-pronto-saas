
import React, { ReactNode } from "react"; // Ensure React is imported
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";

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
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
