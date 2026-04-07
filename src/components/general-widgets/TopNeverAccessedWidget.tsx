import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical, UserMinus } from "lucide-react";

interface Props {
  data: { name: string; sinIngreso: number }[];
}

export function TopNeverAccessedWidget({ data }: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.sinIngreso));

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <UserMinus className="h-4 w-4 text-destructive" />
          Top 5 — Sin Ingresar Nunca
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4 space-y-2.5">
        {data.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-foreground truncate flex-1" title={item.name}>
                {item.name.length > 45 ? item.name.slice(0, 45) + "…" : item.name}
              </span>
              <span className="text-xs font-semibold text-destructive tabular-nums shrink-0">
                {item.sinIngreso}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.sinIngreso / max) * 100}%`,
                  backgroundColor: `hsl(0, ${72 - i * 8}%, ${51 + i * 4}%)`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
