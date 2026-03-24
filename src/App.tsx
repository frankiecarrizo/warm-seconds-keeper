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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { isConnected, configUrl, disconnect } = useMoodleConnection();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar isConnected={isConnected} configUrl={configUrl} onDisconnect={disconnect} />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-auto">
              <ThemeSwitcher />
            </div>
          </div>
          {children}
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MoodleConnectionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
