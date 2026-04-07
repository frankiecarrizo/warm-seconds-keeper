import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, GraduationCap } from "lucide-react";
import { getGraderReport, GraderReport as GRReport, MoodleConfig } from "@/lib/moodle-api";
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

export function GraderReport({ courseId, courseName }: Props) {
  const [data, setData] = useState<GRReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cfg = getConfig();
    if (!cfg) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getGraderReport(cfg, courseId);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const averages = useMemo(() => {
    if (!data) return {};
    const avgs: Record<number, { sum: number; count: number }> = {};
    for (const item of data.gradeItems) {
      avgs[item.id] = { sum: 0, count: 0 };
    }
    for (const s of data.students) {
      for (const item of data.gradeItems) {
        const g = s.grades[item.id];
        if (g && g.grade !== null) {
          avgs[item.id].sum += g.grade;
          avgs[item.id].count++;
        }
      }
    }
    return avgs;
  }, [data]);

  const exportCSV = useCallback(() => {
    if (!data) return;
    const headers = ["Nombre", "Email", ...data.gradeItems.map(g => g.itemname), "Total curso"];
    const rows = data.students.map(s => [
      s.fullname,
      s.email,
      ...data.gradeItems.map(g => {
        const grade = s.grades[g.id];
        return grade?.grade !== null && grade?.grade !== undefined
          ? `${Math.round(grade.grade * 100) / 100}/${grade.grademax}`
          : "-";
      }),
      s.courseTotal !== null ? `${Math.round(s.courseTotal * 100) / 100}/${s.courseTotalMax}` : "-",
    ]);
    // Add averages row
    const avgRow = [
      "Promedio general",
      "",
      ...data.gradeItems.map(g => {
        const a = averages[g.id];
        return a && a.count > 0 ? (Math.round((a.sum / a.count) * 100) / 100).toString() : "-";
      }),
      "",
    ];
    const csv = [headers, ...rows, avgRow].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calificaciones_${courseName.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  }, [data, courseName, averages]);

  const formatGrade = (grade: number | null | undefined, max: number) => {
    if (grade === null || grade === undefined) return "-";
    return `${Math.round(grade * 100) / 100}`;
  };

  const getGradeColor = (grade: number | null | undefined, max: number) => {
    if (grade === null || grade === undefined) return "";
    if (max === 0) return "";
    const pct = (grade / max) * 100;
    if (pct >= 80) return "text-success";
    if (pct >= 60) return "text-warning";
    return "text-destructive";
  };

  if (!data && !loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Reporte de calificaciones (Grader)</p>
          <Button onClick={load} variant="outline" size="sm">
            <GraduationCap className="mr-2 h-4 w-4" />
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
          <span className="text-sm text-muted-foreground">Cargando calificaciones...</span>
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
            <GraduationCap className="h-4 w-4 text-primary" />
            Calificaciones ({data.students.length} estudiantes, {data.gradeItems.length} ítems)
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
                    {data.gradeItems.map(g => (
                      <th key={g.id} className="p-2 font-medium text-muted-foreground min-w-[60px] text-center">
                        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxWidth: "30px" }} className="max-h-[120px] overflow-hidden" title={g.itemname}>
                          {g.itemname.length > 25 ? g.itemname.slice(0, 25) + "…" : g.itemname}
                        </div>
                      </th>
                    ))}
                    <th className="p-2 font-semibold text-center min-w-[60px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="sticky left-0 bg-card z-10 p-2 font-medium">{s.fullname}</td>
                      {data.gradeItems.map(g => {
                        const grade = s.grades[g.id];
                        return (
                          <td key={g.id} className={`p-2 text-center font-mono ${getGradeColor(grade?.grade, grade?.grademax || g.grademax)}`}>
                            {formatGrade(grade?.grade, grade?.grademax || g.grademax)}
                          </td>
                        );
                      })}
                      <td className={`p-2 text-center font-mono font-semibold ${getGradeColor(s.courseTotal, s.courseTotalMax)}`}>
                        {s.courseTotal !== null ? `${Math.round(s.courseTotal * 100) / 100}` : "-"}
                      </td>
                    </tr>
                  ))}
                  {/* Average row */}
                  <tr className="border-t-2 border-primary/30 bg-muted/20 font-semibold">
                    <td className="sticky left-0 bg-muted/20 z-10 p-2">Promedio general</td>
                    {data.gradeItems.map(g => {
                      const a = averages[g.id];
                      const avg = a && a.count > 0 ? Math.round((a.sum / a.count) * 100) / 100 : null;
                      return (
                        <td key={g.id} className={`p-2 text-center font-mono ${getGradeColor(avg, g.grademax)}`}>
                          {avg !== null ? avg : "-"}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
