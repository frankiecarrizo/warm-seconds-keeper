import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { BookOpen, FolderTree, GripVertical, TrendingUp, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useSwapy, type WidgetConfig } from "@/hooks/use-swapy";
import { WidgetManager } from "@/components/WidgetManager";
import type { LoginLogEntry } from "@/hooks/use-general-analytics";

const COLORS = [
  "hsl(172, 66%, 50%)",
  "hsl(210, 100%, 52%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 72%, 51%)",
  "hsl(152, 60%, 42%)",
];

interface GeneralChartsProps {
  enrollmentChartData: { name: string; estudiantes: number; docentes: number }[];
  completionPieData: { name: string; value: number }[];
  completionRate: number;
  userStatusPieData: { name: string; value: number }[];
  usersTotalCount: number;
  accessPieData: { name: string; value: number }[];
  neverAccessedRate: number;
  completionChartData: { name: string; finalizaciones: number }[];
  categoryChartData: { name: string; cursos: number; subcategories: { name: string; cursos: number }[] }[];
  courses: any[];
  summaryMap: Map<number, any>;
  formatDate: (ts: number) => string;
  loginLogs: LoginLogEntry[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "top-enrollment", label: "Top 5 — Inscripciones", visible: true },
  { id: "completion-donut", label: "Finalización Global", visible: true },
  { id: "user-status", label: "Estado de Usuarios", visible: true },
  { id: "access-donut", label: "Acceso a la Plataforma", visible: true },
  { id: "logins-by-month", label: "Ingresos por Mes", visible: true },
  { id: "heatmap", label: "Mapa de Calor", visible: true },
  { id: "top-completions", label: "Top 5 — Finalizaciones", visible: true },
  { id: "categories", label: "Cursos por Categoría", visible: true },
  { id: "all-courses", label: "Todos los Cursos", visible: true },
];

export function GeneralCharts({
  enrollmentChartData,
  completionPieData,
  completionRate,
  userStatusPieData,
  usersTotalCount,
  accessPieData,
  neverAccessedRate,
  completionChartData,
  categoryChartData,
  courses,
  summaryMap,
  formatDate,
  loginLogs,
}: GeneralChartsProps) {
  const { containerRef, widgets, visibleWidgets, toggleWidget, resetLayout } = useSwapy({
    storageKey: "general-charts-layout",
    defaultWidgets: DEFAULT_WIDGETS,
  });

  const fullWidthIds = new Set(["top-completions", "categories", "all-courses"]);

  const renderWidget = (id: string) => {
    switch (id) {
      case "top-enrollment":
        return (
          <Card className="glass-card h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Top 5 — Inscripciones por Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <div className="space-y-3">
                {enrollmentChartData.map((item, idx) => {
                  const max = enrollmentChartData[0]?.estudiantes || 1;
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

      case "completion-donut":
        return (
          <Card className="glass-card h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Finalización Global
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center gap-8 pt-4 pb-5">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={completionPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} stroke="none">
                      {completionPieData.map((_, i) => (
                        <Cell key={i} fill={["hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"][i % 3]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {completionPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"][i % 3] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "user-status":
        if (userStatusPieData.length === 0) return null;
        return (
          <Card className="glass-card h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Estado de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center gap-8 pt-4 pb-5">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userStatusPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} stroke="none">
                      {userStatusPieData.map((_, i) => (
                        <Cell key={i} fill={["hsl(172, 66%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"][i % 3]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{usersTotalCount}</span>
                  <span className="text-[10px] text-muted-foreground">usuarios</span>
                </div>
              </div>
              <div className="space-y-2">
                {userStatusPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["hsl(172, 66%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"][i % 3] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "access-donut":
        return (
          <Card className="glass-card h-full">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Acceso a la Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center gap-8 pt-4 pb-5">
              <div className="relative w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={accessPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270} stroke="none">
                      {accessPieData.map((_, i) => (
                        <Cell key={i} fill={["hsl(172, 66%, 50%)", "hsl(0, 72%, 51%)"][i % 2]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{100 - neverAccessedRate}%</span>
                </div>
              </div>
              <div className="space-y-2">
                {accessPieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["hsl(172, 66%, 50%)", "hsl(0, 72%, 51%)"][i % 2] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "top-completions":
        if (completionChartData.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                Top 5 — Finalizaciones por Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-5">
              <div className="space-y-3">
                {completionChartData.map((item, idx) => {
                  const max = completionChartData[0]?.finalizaciones || 1;
                  const pct = (item.finalizaciones / max) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[60%]">{item.name}</span>
                        <span className="font-semibold text-foreground">{item.finalizaciones}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "hsl(152, 60%, 42%)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );

      case "categories":
        if (categoryChartData.length === 0) return null;
        return (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                <FolderTree className="h-4 w-4 text-accent-foreground" />
                Cursos por Categoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryChartData.map((cat, idx) => (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <Badge variant="secondary" className="text-xs">{cat.cursos} cursos</Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {cat.subcategories.map((sub) => {
                        const pct = Math.max((sub.cursos / cat.cursos) * 100, 4);
                        const colorIdx = idx % COLORS.length;
                        return (
                          <div
                            key={sub.name}
                            className="relative group rounded-md overflow-hidden"
                            style={{
                              width: `${pct}%`,
                              minWidth: 40,
                              height: 32,
                              backgroundColor: COLORS[colorIdx],
                              opacity: sub.name === cat.name ? 1 : 0.7,
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center px-1">
                              <span className="text-[10px] font-medium text-white truncate">{sub.cursos}</span>
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 whitespace-nowrap">
                              <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border">
                                {sub.name}: {sub.cursos} cursos
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {cat.subcategories.length > 1 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
                        {cat.subcategories.map((sub) => (
                          <span key={sub.name} className="text-[10px] text-muted-foreground">
                            {sub.name} ({sub.cursos})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "all-courses":
        return (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
                <BookOpen className="h-4 w-4 text-primary" />
                Todos los Cursos ({courses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-card z-10">Curso</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-center">Estudiantes</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-center">Docentes</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-center">Finalizaron</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-center">% Final.</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-center">Sin ingreso</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-center">Inicio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course: any) => {
                      const s = summaryMap.get(course.id);
                      const compPct = s?.avgCompletionPercentage ?? (s && s.checkedStudents > 0 ? Math.round((s.completed / s.checkedStudents) * 100) : null);
                      return (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate max-w-[250px]">{course.fullname}</p>
                              <p className="text-xs text-muted-foreground">{course.shortname}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {s ? <Badge variant="secondary">{s.totalStudents}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {s ? <span className="text-sm text-muted-foreground">{s.totalTeachers}</span> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {s ? <span className="text-sm font-medium text-success">{s.completed}</span> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {compPct !== null ? (
                              <Badge variant="outline" className={compPct >= 70 ? "border-success text-success" : compPct >= 40 ? "border-warning text-warning" : "border-destructive text-destructive"}>
                                {compPct}%
                              </Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {s ? <span className={`text-sm ${s.neverAccessed > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>{s.neverAccessed}</span> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {formatDate(course.startdate)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
      <div ref={containerRef} className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.map((w) => {
          const content = renderWidget(w.id);
          if (!content) return null;
          return (
            <div
              key={w.id}
              data-swapy-slot={w.id}
              className={fullWidthIds.has(w.id) ? "lg:col-span-2" : ""}
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
