import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { MoodleConnectionProvider, useMoodleConnection } from "@/hooks/use-moodle-connection";
import Index from "./pages/Index.tsx";
import CoursesPage from "./pages/CoursesPage.tsx";
import GeneralPage from "./pages/GeneralPage.tsx";
import SsoLogin from "./pages/SsoLogin.tsx";
import NotificationsPage from "./pages/NotificationsPage.tsx";
import CertificatesPage from "./pages/CertificatesPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isConnected, configUrl, disconnect } = useMoodleConnection();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex items-center justify-end px-4 py-2">
          <ThemeSwitcher />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          {children}
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar isConnected={isConnected} configUrl={configUrl} onDisconnect={disconnect} />
        <main className="flex-1 overflow-auto min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-auto">
              <ThemeSwitcher />
            </div>
          </div>
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MoodleConnectionProvider>
          <Routes>
            <Route path="/sso" element={<SsoLogin />} />
            <Route path="/sso-login" element={<SsoLogin />} />
            <Route path="/" element={<AppLayout><GeneralPage /></AppLayout>} />
            <Route path="/cursos" element={<AppLayout><CoursesPage /></AppLayout>} />
            <Route path="/estudiantes" element={<AppLayout><Index /></AppLayout>} />
            <Route path="/notificaciones" element={<AppLayout><NotificationsPage /></AppLayout>} />
            <Route path="/certificados" element={<AppLayout><CertificatesPage /></AppLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MoodleConnectionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
