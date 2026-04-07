import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

interface Props {
  data: { name: string; finalizaciones: number }[];
}

export function TopCompletionsWidget({ data }: Props) {
  if (data.length === 0) return null;
  const max = data[0]?.finalizaciones || 1;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          Top 5 — Finalizaciones por Curso
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-5">
        <div className="space-y-3">
          {data.map((item, idx) => {
            const pct = (item.finalizaciones / max) * 100;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.name}</span>
                  <span className="font-semibold text-foreground">{item.finalizaciones}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "hsl(152, 60%, 42%)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
