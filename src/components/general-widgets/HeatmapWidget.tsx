import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, Flame } from "lucide-react";
import type { LoginLogEntry } from "@/hooks/use-moodle-queries";

interface Props {
  loginLogs: LoginLogEntry[];
}

export function HeatmapWidget({ loginLogs }: Props) {
  const heatmapData = useMemo(() => {
    if (!loginLogs.length) return { grid: [] as { day: number; hour: number; count: number }[], maxCount: 0 };
    const gridMap = new Map<string, number>();
    loginLogs.forEach((l) => {
      const d = new Date(l.timecreated * 1000);
      const day = d.getDay();
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      gridMap.set(key, (gridMap.get(key) || 0) + 1);
    });
    let maxCount = 0;
    const cells: { day: number; hour: number; count: number }[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = gridMap.get(`${day}-${hour}`) || 0;
        if (count > maxCount) maxCount = count;
        cells.push({ day, hour, count });
      }
    }
    return { grid: cells, maxCount };
  }, [loginLogs]);

  if (heatmapData.grid.length === 0 || heatmapData.maxCount === 0) return null;

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const getHeatColor = (count: number) => {
    if (count === 0) return "hsl(var(--muted))";
    const intensity = Math.min(count / heatmapData.maxCount, 1);
    const lightness = 85 - intensity * 55;
    const saturation = 30 + intensity * 40;
    return `hsl(172, ${saturation}%, ${lightness}%)`;
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <Flame className="h-4 w-4 text-warning" />
          Mapa de Calor — Días y Horarios
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-5 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex mb-1 ml-10">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">{h}</div>
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
              <span className="w-9 text-[10px] text-muted-foreground text-right shrink-0">{dayNames[dayIdx]}</span>
              <div className="flex flex-1 gap-px">
                {Array.from({ length: 24 }, (_, h) => {
                  const cell = heatmapData.grid.find((c) => c.day === dayIdx && c.hour === h);
                  const count = cell?.count || 0;
                  return (
                    <div key={h} className="flex-1 aspect-square rounded-sm relative group cursor-default" style={{ backgroundColor: getHeatColor(count), minHeight: 16 }}>
                      {count > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 whitespace-nowrap">
                          <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border">
                            {dayNames[dayIdx]} {h}:00 — {count} ingresos
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-3 ml-10">
            <span className="text-[10px] text-muted-foreground">Menos</span>
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: i === 0 ? "hsl(var(--muted))" : `hsl(172, ${30 + i * 40}%, ${85 - i * 55}%)` }} />
            ))}
            <span className="text-[10px] text-muted-foreground">Más</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
