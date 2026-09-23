import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { SidebarProvider } from "../contexts/SidebarContext";
import { HeaderProvider } from "../contexts/HeaderContext";

const LayoutContent = () => {
  return (
    <div className="min-h-screen bg-[var(--theme-bg-main)] transition-colors">
      <AppSidebar />
      <AppHeader />
      <main className="pt-20 pl-0 sm:pl-64 min-h-screen bg-[var(--theme-bg-main)] transition-colors">
        <div className="p-5 sm:p-7 lg:p-9 max-w-[1680px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AppLayout = () => {
  return (
    <HeaderProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </HeaderProvider>
  );
};

export default AppLayout;
