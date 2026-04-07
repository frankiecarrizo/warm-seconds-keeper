import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { GripVertical, LogIn } from "lucide-react";

const COLORS = ["hsl(172, 66%, 50%)", "hsl(172, 55%, 55%)", "hsl(172, 45%, 60%)", "hsl(172, 35%, 65%)", "hsl(172, 25%, 70%)"];

interface Props {
  data: { name: string; ingresos: number }[];
}

export function TopAccessWidget({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <LogIn className="h-4 w-4 text-info" />
          Top 5 — Mayor Ingreso
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 15, bottom: 0, left: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
              <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, backgroundColor: "hsl(var(--card))", color: "hsl(var(--card-foreground))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                labelStyle={{ color: "hsl(var(--card-foreground))" }}
                formatter={(value: number) => [`${value} estudiantes`, "Ingresaron"]}
              />
              <Bar dataKey="ingresos" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
