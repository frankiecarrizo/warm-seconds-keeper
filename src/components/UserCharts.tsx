import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { UserFullData } from "@/lib/moodle-api";
import { motion } from "framer-motion";
import { useSwapy, type WidgetConfig } from "@/hooks/use-swapy";
import { WidgetManager } from "@/components/WidgetManager";
import { GripVertical } from "lucide-react";

const DONUT_COLORS = {
  status: ["hsl(172, 66%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"],
  quiz: ["hsl(210, 100%, 52%)", "hsl(172, 66%, 50%)"],
};

interface UserChartsProps {
  data: UserFullData;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "radar", label: "Perfil del Estudiante", visible: true },
  { id: "completion-pie", label: "Estado de Cursos", visible: true },
];

export function UserCharts({ data }: UserChartsProps) {
  const { containerRef, widgets, visibleWidgets, toggleWidget, resetLayout } = useSwapy({
    storageKey: "user-charts-layout",
    defaultWidgets: DEFAULT_WIDGETS,
  });

  const courseProgressData = useMemo(() => {
    return data.courses.map((c) => ({
      name: c.fullname,
      progreso: c.progress ?? 0,
    }));
  }, [data]);

  const completionPieData = useMemo(() => {
    const completed = data.courses.filter((c) => c.completed).length;
    const inProgress = data.courses.filter((c) => !c.completed && (c.progress ?? 0) > 0).length;
    const notStarted = data.courses.filter((c) => !c.completed && (c.progress ?? 0) === 0).length;
    return [
      { name: "Completados", value: completed },
      { name: "En progreso", value: inProgress },
      { name: "Sin iniciar", value: notStarted },
    ].filter((d) => d.value > 0);
  }, [data]);

  const completedCount = data.courses.filter((c) => c.completed).length;
  const completionPct = data.courses.length > 0 ? Math.round((completedCount / data.courses.length) * 100) : 0;

  const gradeData = useMemo(() => {
    return data.courses
      .filter((c) => c.grades && c.grades.length > 0)
      .map((c) => {
        const courseGrade = c.grades?.find((g: any) => g.itemtype === "course");
        const gradeRaw = courseGrade?.graderaw ?? 0;
        const gradeMax = courseGrade?.grademax ?? 100;
        const percentage = gradeMax > 0 ? (gradeRaw / gradeMax) * 100 : 0;
        return {
          name: c.fullname,
          calificacion: Math.round(percentage * 10) / 10,
        };
      })
      .filter((d) => d.calificacion > 0);
  }, [data]);

  const quizPerformanceData = useMemo(() => {
    const quizzes: { name: string; intentos: number; mejorNota: number }[] = [];
    data.courses.forEach((c) => {
      c.quizAttempts?.forEach((q) => {
        if (q.attempts.length > 0) {
          const gradeItem = c.grades?.find(
            (g: any) => g.itemmodule === "quiz" && g.iteminstance === q.quizId
          );
          let bestPct: number;
          if (gradeItem && gradeItem.grademax > 0) {
            bestPct = ((gradeItem.graderaw ?? 0) / gradeItem.grademax) * 100;
          } else {
            bestPct = Math.max(...q.attempts.map((a: any) => a.sumgrades || 0));
          }
          quizzes.push({
            name: q.quizName,
            intentos: q.attempts.length,
            mejorNota: Math.round(bestPct * 10) / 10,
          });
        }
      });
    });
    return quizzes.slice(0, 10);
  }, [data]);

  const radarData = useMemo(() => {
    const avgCompletionPct = data.courses.reduce((s, c) => s + (c.completionPercentage ?? (c.completed ? 100 : 0)), 0) / (data.courses.length || 1);
    const completionRate = avgCompletionPct;
    const avgGrade = gradeData.length > 0
      ? gradeData.reduce((s, g) => s + g.calificacion, 0) / gradeData.length
      : 0;
    const quizAvg = quizPerformanceData.length > 0
      ? (quizPerformanceData.reduce((s, q) => s + q.mejorNota, 0) / quizPerformanceData.length)
      : 0;
    const recentActivity = data.courses.filter(
      (c) => c.lastaccess && Date.now() / 1000 - c.lastaccess < 365 * 24 * 3600
    ).length / (data.courses.length || 1) * 100;

    return [
      { metric: "Progreso", value: Math.round(avgCompletionPct) },
      { metric: "Completación", value: Math.round(completionRate) },
      { metric: "Calificaciones", value: Math.round(avgGrade) },
      { metric: "Quizzes", value: Math.round(quizAvg) },
      { metric: "Actividad", value: Math.round(recentActivity) },
    ];
  }, [data, gradeData, quizPerformanceData]);

  const getGradeColor = (grade: number) => {
    if (grade >= 80) return "hsl(152, 60%, 42%)";
    if (grade >= 60) return "hsl(38, 92%, 50%)";
    return "hsl(0, 72%, 51%)";
  };

  const isVisible = (id: string) => visibleWidgets.some((w) => w.id === id);

  const renderWidget = (id: string) => {
    switch (id) {
      case "radar":
        return (
           <Card className="glass-card h-full flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Perfil del Estudiante
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4 flex-1">
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="hsl(172, 66%, 50%)" fill="hsl(172, 66%, 50%)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      case "completion-pie":
        return (
           <Card className="glass-card h-full flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Estado de Cursos
              </CardTitle>
            </CardHeader>
             <CardContent className="flex items-center justify-center gap-8 pt-2 pb-4 flex-1">
               <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} stroke="none">
                      {completionPieData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS.status[i % 3]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{completionPct}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {completionPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS.status[i % 3] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "progress":
        if (courseProgressData.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Progreso por Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <div className="space-y-3">
                {courseProgressData.map((course) => (
                  <div key={course.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[70%]">{course.name}</span>
                      <span className="font-semibold text-foreground">{Math.round(course.progreso)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${course.progreso}%`,
                          backgroundColor: course.progreso >= 100 ? "hsl(152, 60%, 42%)" : "hsl(172, 66%, 50%)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "grades":
        if (gradeData.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Calificaciones por Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <div className="space-y-3">
                {gradeData.map((course) => (
                  <div key={course.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[70%]">{course.name}</span>
                      <span className="font-semibold text-foreground">{course.calificacion}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${course.calificacion}%`, backgroundColor: getGradeColor(course.calificacion) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "quizzes":
        if (quizPerformanceData.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Rendimiento en Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <div className="space-y-3">
                {quizPerformanceData.map((quiz) => {
                  const maxNota = 100;
                  return (
                    <div key={quiz.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[55%]">{quiz.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{quiz.intentos} int.</span>
                          <span className="font-semibold text-foreground">{quiz.mejorNota}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(quiz.mejorNota / maxNota) * 100}%`, backgroundColor: getGradeColor(quiz.mejorNota) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  // Determine which widgets span full width
  const fullWidthIds = new Set<string>([]);

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
                className="h-full"
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
