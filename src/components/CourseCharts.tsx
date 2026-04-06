import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CourseOverviewData } from "@/lib/moodle-api";
import { motion } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSwapy, type WidgetConfig } from "@/hooks/use-swapy";
import { WidgetManager } from "@/components/WidgetManager";
import { GripVertical } from "lucide-react";

const DONUT_COLORS = {
  completion: ["hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"],
  grades: ["hsl(0, 72%, 51%)", "hsl(38, 92%, 50%)", "hsl(210, 100%, 52%)", "hsl(172, 66%, 50%)", "hsl(152, 60%, 42%)"],
  quiz: ["hsl(172, 66%, 50%)", "hsl(210, 100%, 52%)"],
};

interface CourseChartsProps {
  data: CourseOverviewData;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "grade-dist", label: "Distribución de Notas", visible: true },
  { id: "completion-pie", label: "Estado de Finalización", visible: true },
  { id: "quiz-avg", label: "Promedio por Quiz", visible: true },
  { id: "ranking", label: "Ranking de Estudiantes", visible: true },
  { id: "completion-table", label: "Estado por Estudiante", visible: true },
];

export function CourseCharts({ data }: CourseChartsProps) {
  const { containerRef, widgets, visibleWidgets, toggleWidget, resetLayout } = useSwapy({
    storageKey: "course-charts-layout",
    defaultWidgets: DEFAULT_WIDGETS,
  });

  const gradeDistribution = useMemo(() => {
    const buckets = [
      { name: "0-20%", count: 0, color: DONUT_COLORS.grades[0] },
      { name: "21-40%", count: 0, color: DONUT_COLORS.grades[1] },
      { name: "41-60%", count: 0, color: DONUT_COLORS.grades[2] },
      { name: "61-80%", count: 0, color: DONUT_COLORS.grades[3] },
      { name: "81-100%", count: 0, color: DONUT_COLORS.grades[4] },
    ];
    data.students.forEach((s) => {
      if (s.gradeRaw !== null && s.gradeMax > 0) {
        const pct = (s.gradeRaw / s.gradeMax) * 100;
        const idx = pct <= 20 ? 0 : pct <= 40 ? 1 : pct <= 60 ? 2 : pct <= 80 ? 3 : 4;
        buckets[idx].count++;
      }
    });
    return buckets;
  }, [data]);

  const totalGraded = gradeDistribution.reduce((s, b) => s + b.count, 0);
  const allStudents = data.allStudentsBasic || [];

  const completionPie = useMemo(() => {
    const completed = allStudents.filter((s) => s.completed).length;
    const neverAccessed = allStudents.filter((s) => !s.lastaccess).length;
    const notCompleted = allStudents.length - completed - neverAccessed;
    return [
      { name: "Finalizados", value: completed },
      { name: "No finalizados", value: notCompleted },
      { name: "Nunca ingresaron", value: neverAccessed },
    ].filter((d) => d.value > 0);
  }, [allStudents]);

  const completedCount = allStudents.filter((s) => s.completed).length;
  const completionPct = allStudents.length > 0 ? Math.round((completedCount / allStudents.length) * 100) : 0;

  const ranking = useMemo(() => {
    return data.students
      .map((s) => ({
        name: s.fullname,
        grade: s.gradeRaw !== null && s.gradeMax > 0
          ? Math.round((s.gradeRaw! / s.gradeMax) * 100 * 10) / 10
          : 0,
        quizzes: s.quizAttempts?.filter((q) => data.quizzes.some((dq) => dq.id === q.quizId) && q.attempts.length > 0).length || 0,
        completed: (s as any).completed === true,
      }))
      .sort((a, b) => b.quizzes - a.quizzes || b.grade - a.grade)
      .slice(0, 10);
  }, [data]);

  const quizAvgData = useMemo(() => {
    if (!data.quizzes.length) return [];
    return data.quizzes.map((quiz) => {
      const scores: number[] = [];
      data.students.forEach((s) => {
        const qa = s.quizAttempts?.find((q) => q.quizId === quiz.id);
        if (qa && qa.attempts.length > 0) {
          const best = Math.max(...qa.attempts.map((a: any) => a.sumgrades || 0));
          scores.push(best);
        }
      });
      const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
      return {
        name: quiz.name,
        promedio: Math.round(avg * 10) / 10,
        participantes: scores.length,
      };
    });
  }, [data]);

  const gradeMap = useMemo(() => {
    const map: Record<number, number | null> = {};
    data.students.forEach((s) => {
      const pct = s.gradeRaw !== null && s.gradeMax > 0
        ? Math.round((s.gradeRaw / s.gradeMax) * 100 * 10) / 10
        : null;
      map[s.id] = pct;
    });
    return map;
  }, [data]);

  const completionTable = useMemo(() => {
    return allStudents
      .map((s) => ({
        name: s.fullname,
        email: s.email,
        lastaccess: s.lastaccess,
        completionPct: (s as any).completionPercentage ?? (s.completed ? 100 : 0),
        status: !s.lastaccess ? "Nunca ingresó" : s.completed ? "Finalizado" : (s as any).completionPercentage > 0 ? `${(s as any).completionPercentage}%` : "No finalizado",
        grade: gradeMap[s.id] ?? null,
      }))
      .sort((a, b) => b.completionPct - a.completionPct);
  }, [allStudents, gradeMap]);

  const getBadgeVariant = (grade: number) => {
    if (grade >= 80) return "default";
    if (grade >= 60) return "secondary";
    return "destructive";
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === "Finalizado") return "default";
    if (status === "No finalizado") return "secondary";
    if (status === "Nunca ingresó") return "destructive";
    // Percentage-based status
    return "secondary";
  };

  const isVisible = (id: string) => visibleWidgets.some((w) => w.id === id);
  const fullWidthIds = new Set(["quiz-avg", "ranking", "completion-table"]);

  const renderWidget = (id: string) => {
    switch (id) {
      case "grade-dist":
        return (
          <Card className="glass-card h-full flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Distribución de Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5 flex-1">
              <div className="space-y-3">
                {gradeDistribution.map((bucket) => {
                  const pct = totalGraded > 0 ? (bucket.count / totalGraded) * 100 : 0;
                  return (
                    <div key={bucket.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{bucket.name}</span>
                        <span className="font-semibold text-foreground">{bucket.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bucket.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      case "completion-pie":
        return (
          <Card className="glass-card h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Estado de Finalización
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center gap-8 pt-4 pb-5">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionPie} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} stroke="none">
                      {completionPie.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS.completion[i % 3]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{completionPct}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {completionPie.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS.completion[i % 3] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "quiz-avg":
        if (quizAvgData.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Promedio por Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <div className="space-y-3">
                {quizAvgData.map((quiz) => {
                  const maxScore = Math.max(...quizAvgData.map(q => q.promedio), 1);
                  const pct = (quiz.promedio / maxScore) * 100;
                  return (
                    <div key={quiz.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[60%]">{quiz.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{quiz.participantes} part.</span>
                          <span className="font-semibold text-foreground">{quiz.promedio}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "hsl(210, 100%, 52%)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      case "ranking":
        if (ranking.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Ranking de Estudiantes (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Calificación</TableHead>
                      <TableHead className="text-right">Quizzes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant={s.completed ? "default" : "secondary"}>
                            {s.completed ? "Finalizado" : "No finalizado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getBadgeVariant(s.grade)}>{s.grade}%</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{s.quizzes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      case "completion-table":
        if (completionTable.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Estado por Estudiante ({completionTable.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Calificación</TableHead>
                      <TableHead className="text-right">Último acceso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completionTable.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(s.status)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.grade !== null ? (
                            <Badge variant={getBadgeVariant(s.grade)}>{s.grade}%</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {s.lastaccess
                            ? new Date(s.lastaccess * 1000).toLocaleDateString("es-AR", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : "Nunca"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <WidgetManager widgets={widgets} onToggle={toggleWidget} onReset={resetLayout} />
      </div>
      <div ref={containerRef} className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 items-stretch">
        {visibleWidgets.map((w) => {
          const content = renderWidget(w.id);
          if (!content) return null;
          return (
            <div
              key={w.id}
              data-swapy-slot={w.id}
              className={fullWidthIds.has(w.id) ? "md:col-span-2" : ""}
            >
              <motion.div
                data-swapy-item={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {content}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
