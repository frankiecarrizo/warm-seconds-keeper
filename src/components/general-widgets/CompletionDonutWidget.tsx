import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { GripVertical } from "lucide-react";

const COLORS = ["hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

interface Props {
  data: { name: string; value: number }[];
  rate: number;
}

export function CompletionDonutWidget({ data, rate }: Props) {
  if (data.length === 0) return null;

  return (
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          Finalización Global
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-8 pt-4 pb-5 flex-1">
        <div className="relative w-36 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} stroke="none">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % 3]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{rate}%</span>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % 3] }} />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-semibold text-foreground ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
