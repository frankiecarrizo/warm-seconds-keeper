import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

interface Props {
  data: { name: string; estudiantes: number; docentes: number }[];
}

export function TopEnrollmentWidget({ data }: Props) {
  if (data.length === 0) return null;
  const max = data[0]?.estudiantes || 1;

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          Top 5 — Inscripciones por Curso
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-5 flex-1">
        <div className="space-y-3">
          {data.map((item, idx) => {
            const pct = (item.estudiantes / max) * 100;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[60%]">{item.name}</span>
                  <span className="font-semibold text-foreground">{item.estudiantes}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
