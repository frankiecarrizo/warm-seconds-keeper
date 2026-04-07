import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, ClipboardList, Square, CheckSquare, XSquare } from "lucide-react";
import { getActivityCompletionReport, ActivityCompletionReport as ACReport, MoodleConfig } from "@/lib/moodle-api";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Props {
  courseId: number;
  courseName: string;
}

function getConfig(): MoodleConfig | null {
  const saved = localStorage.getItem("moodle-config");
  return saved ? JSON.parse(saved) : null;
}

export function ActivityCompletionReport({ courseId, courseName }: Props) {
  const [data, setData] = useState<ACReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cfg = getConfig();
    if (!cfg) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getActivityCompletionReport(cfg, courseId);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const exportCSV = useCallback(() => {
    if (!data) return;
    const headers = ["Nombre", "Email", ...data.activities.map(a => a.name)];
    const rows = data.students.map(s => [
      s.fullname,
      s.email,
      ...data.activities.map(a => {
        const state = s.completions[a.cmid];
        return state === 1 || state === 2 ? "✓" : state === 3 ? "✗" : "-";
      }),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finalización_actividades_${courseName.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  }, [data, courseName]);

  const getIcon = (state: number | undefined) => {
    if (state === 1 || state === 2) return <CheckSquare className="h-4 w-4 text-success" />;
    if (state === 3) return <XSquare className="h-4 w-4 text-destructive" />;
    if (state === 0) return <Square className="h-4 w-4 text-muted-foreground/50" />;
    return <Square className="h-4 w-4 text-muted-foreground/25" />;
  };

  if (!data && !loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Reporte de finalización de actividades</p>
          <Button onClick={load} variant="outline" size="sm">
            <ClipboardList className="mr-2 h-4 w-4" />
            Cargar reporte
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando finalización de actividades...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Finalización de Actividades ({data.students.length} estudiantes, {data.activities.length} actividades)
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="mr-2 h-3 w-3" />CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={load}>Recargar</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="sticky left-0 bg-card z-10 text-left p-2 font-semibold min-w-[180px]">Estudiante</th>
                    {data.activities.map(a => (
                      <th key={a.cmid} className="p-2 font-medium text-muted-foreground min-w-[40px] text-center">
                        <div className="writing-mode-vertical max-h-[120px] overflow-hidden" title={a.name} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxWidth: "30px" }}>
                          {a.name.length > 25 ? a.name.slice(0, 25) + "…" : a.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.students.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="sticky left-0 bg-card z-10 p-2 font-medium">{s.fullname}</td>
                      {data.activities.map(a => (
                        <td key={a.cmid} className="p-2 text-center">
                          {getIcon(s.completions[a.cmid])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
