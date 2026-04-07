import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, LogIn } from "lucide-react";

interface Props {
  data: { name: string; ingresos: number }[];
}

export function TopAccessWidget({ data }: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.ingresos));

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <LogIn className="h-4 w-4 text-info" />
          Top 5 — Mayor Ingreso
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-2.5">
        {data.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground truncate flex-1" title={item.name}>
                {item.name.length > 45 ? item.name.slice(0, 45) + "…" : item.name}
              </span>
              <span className="text-xs font-semibold text-primary tabular-nums shrink-0">
                {item.ingresos}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.ingresos / max) * 100}%`,
                  backgroundColor: `hsl(172, ${66 - i * 8}%, ${50 + i * 4}%)`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
