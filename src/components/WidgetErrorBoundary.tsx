import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WidgetErrorBoundaryProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`glass-card ${className || ""}`}>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

export function WidgetError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <Card className="glass-card border-destructive/30">
      <CardContent className="p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-destructive flex-1 truncate">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function WidgetErrorBoundary({ loading, error, onRetry, children }: WidgetErrorBoundaryProps) {
  if (loading) return <WidgetSkeleton />;
  if (error) return <WidgetError error={error} onRetry={onRetry} />;
  return <>{children}</>;
}
