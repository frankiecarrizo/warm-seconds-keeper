import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { GripVertical, TrendingUp } from "lucide-react";
import type { LoginLogEntry } from "@/hooks/use-moodle-queries";

interface Props {
  loginLogs: LoginLogEntry[];
}

export function LoginsByMonthWidget({ loginLogs }: Props) {
  const loginsByMonth = useMemo(() => {
    if (!loginLogs.length) return [];
    const months = new Map<string, number>();
    loginLogs.forEach((l) => {
      const d = new Date(l.timecreated * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.set(key, (months.get(key) || 0) + 1);
    });
    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => {
        const [y, m] = month.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("es", { month: "short", year: "2-digit" });
        return { month: label, ingresos: count };
      });
  }, [loginLogs]);

  if (loginsByMonth.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <TrendingUp className="h-4 w-4 text-primary" />
          Ingresos por Mes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-5">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={loginsByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="ingresos" stroke="hsl(172, 66%, 50%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(172, 66%, 50%)" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
