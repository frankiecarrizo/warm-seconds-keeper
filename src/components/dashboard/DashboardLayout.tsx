import { GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearMoodleConnection, getMoodleConnection } from "@/lib/moodle-store";
import SiteInfoCard from "./SiteInfoCard";
import AIAnalysisPanel from "./AIAnalysisPanel";
import SSOValidatorCard from "./SSOValidatorCard";

interface Props {
  onDisconnect: () => void;
}

const DashboardLayout = ({ onDisconnect }: Props) => {
  const conn = getMoodleConnection();

  const handleDisconnect = () => {
    clearMoodleConnection();
    onDisconnect();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Learner Arc</h1>
              {conn?.siteName && (
                <p className="text-xs text-muted-foreground">{conn.siteName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {conn?.username && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {conn.username}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Desconectar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <SiteInfoCard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AIAnalysisPanel />
          </div>
          <div>
            <SSOValidatorCard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
