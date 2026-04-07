import { useSwapy, type WidgetConfig } from "@/hooks/use-swapy";
import { WidgetManager } from "@/components/WidgetManager";
import { motion } from "framer-motion";
import type { LoginLogEntry } from "@/hooks/use-moodle-queries";

// Lazy widget components — only mount when visible, so their useMemo never runs otherwise
import { TopEnrollmentWidget } from "@/components/general-widgets/TopEnrollmentWidget";
import { CompletionDonutWidget } from "@/components/general-widgets/CompletionDonutWidget";
import { UserStatusWidget } from "@/components/general-widgets/UserStatusWidget";
import { AccessDonutWidget } from "@/components/general-widgets/AccessDonutWidget";
import { LoginsByMonthWidget } from "@/components/general-widgets/LoginsByMonthWidget";
import { HeatmapWidget } from "@/components/general-widgets/HeatmapWidget";
import { TopCompletionsWidget } from "@/components/general-widgets/TopCompletionsWidget";
import { CategoriesWidget } from "@/components/general-widgets/CategoriesWidget";
import { AllCoursesWidget } from "@/components/general-widgets/AllCoursesWidget";

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
  isFreshLoad?: boolean;
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

const FULL_WIDTH_IDS = new Set(["top-completions", "categories", "all-courses", "logins-by-month", "heatmap"]);

export function GeneralCharts(props: GeneralChartsProps) {
  const { containerRef, widgets, visibleWidgets, toggleWidget, resetLayout, showAll, hideAll } = useSwapy({
    storageKey: "general-charts-layout",
    defaultWidgets: DEFAULT_WIDGETS,
    forceHideAll: props.isFreshLoad,
  });

  // Each widget component is only mounted when visible.
  // Heavy computations (useMemo) inside each widget never execute when hidden.
  const renderWidget = (id: string) => {
    switch (id) {
      case "top-enrollment":
        return <TopEnrollmentWidget data={props.enrollmentChartData} />;
      case "completion-donut":
        return <CompletionDonutWidget data={props.completionPieData} rate={props.completionRate} />;
      case "user-status":
        return <UserStatusWidget data={props.userStatusPieData} total={props.usersTotalCount} />;
      case "access-donut":
        return <AccessDonutWidget data={props.accessPieData} accessRate={100 - props.neverAccessedRate} />;
      case "logins-by-month":
        return <LoginsByMonthWidget loginLogs={props.loginLogs} />;
      case "heatmap":
        return <HeatmapWidget loginLogs={props.loginLogs} />;
      case "top-completions":
        return <TopCompletionsWidget data={props.completionChartData} />;
      case "categories":
        return <CategoriesWidget data={props.categoryChartData} />;
      case "all-courses":
        return <AllCoursesWidget courses={props.courses} summaryMap={props.summaryMap} formatDate={props.formatDate} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <WidgetManager widgets={widgets} onToggle={toggleWidget} onReset={resetLayout} onShowAll={showAll} onHideAll={hideAll} />
      </div>
      <div ref={containerRef} className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2 items-stretch">
        {visibleWidgets.map((w) => {
          const content = renderWidget(w.id);
          if (!content) return null;
          return (
            <div key={w.id} data-swapy-slot={w.id} className={FULL_WIDTH_IDS.has(w.id) ? "lg:col-span-2" : ""}>
              <motion.div data-swapy-item={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                {content}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
