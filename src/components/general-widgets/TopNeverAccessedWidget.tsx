import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { GripVertical, UserMinus } from "lucide-react";

const COLORS = ["hsl(0, 72%, 51%)", "hsl(0, 65%, 58%)", "hsl(0, 55%, 62%)", "hsl(0, 45%, 66%)", "hsl(0, 35%, 70%)"];

interface Props {
  data: { name: string; sinIngreso: number }[];
}

export function TopNeverAccessedWidget({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <UserMinus className="h-4 w-4 text-destructive" />
          Top 5 — Sin Ingresar Nunca
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
                formatter={(value: number) => [`${value} estudiantes`, "Sin ingresar"]}
              />
              <Bar dataKey="sinIngreso" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
