import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WidgetConfig } from "@/hooks/use-swapy";
import { LayoutGrid, Eye, EyeOff, GripVertical, Layers } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WidgetManagerProps {
  widgets: WidgetConfig[];
  onToggle: (id: string) => void;
  onReset: () => void;
  onShowAll?: () => void;
}

export function WidgetManager({ widgets, onToggle, onReset, onShowAll }: WidgetManagerProps) {
  const [open, setOpen] = useState(false);
  const visibleCount = widgets.filter((w) => w.visible).length;
  const allHidden = visibleCount === 0;

  // Show tooltip hint when all widgets are hidden (first time)
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (allHidden && !open) {
      const timer = setTimeout(() => setShowHint(true), 800);
      return () => clearTimeout(timer);
    }
    setShowHint(false);
  }, [allHidden, open]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); setShowHint(false); }}>
      <TooltipProvider delayDuration={0}>
        <Tooltip open={showHint}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`gap-2 h-8 ${allHidden ? "animate-pulse border-primary text-primary" : ""}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Agregar widget</span>
                {visibleCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {visibleCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs max-w-[200px]">
            Hacé clic para agregar gráficos y widgets al dashboard
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">Widgets disponibles</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={onShowAll || onReset}
            >
              <Layers className="h-3 w-3 mr-1" />
              Mostrar todos
            </Button>
          </div>
          {widgets.map((w) => (
            <button
              key={w.id}
              onClick={() => onToggle(w.id)}
              className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left"
            >
              {w.visible ? (
                <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={`text-xs flex-1 ${w.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>
                {w.label}
              </span>
            </button>
          ))}
          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border flex items-center gap-1">
            <GripVertical className="h-3 w-3" />
            Arrastrá los widgets para reordenarlos
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
