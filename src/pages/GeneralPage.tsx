import { useMemo, useState, lazy, Suspense, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { LayoutDashboard, BookOpen, Users, Loader2, AlertCircle, GraduationCap, TrendingUp, UserX, CheckCircle2, RefreshCw, FolderTree, UserCheck, UserMinus, Trash2, LogIn, Download, FileText, FileSpreadsheet, Brain } from "lucide-react";
import { exportGeneralToCSV, exportGeneralToPDF } from "@/lib/export-utils";
import { MoodleConnectForm } from "@/components/MoodleConnectForm";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeneralBaseData, useEnrollmentData, useLoginLogs, useInvalidateGeneral } from "@/hooks/use-moodle-queries";
import { motion, AnimatePresence } from "framer-motion";
import { AIAnalysis } from "@/components/AIAnalysis";
import { toast } from "sonner";
import { MobileCardSlider } from "@/components/MobileCardSlider";

const GeneralCharts = lazy(() => import("@/components/GeneralCharts").then(m => ({ default: m.GeneralCharts })));

const GeneralPage = () => {
  const { isConnected, connect, disconnect, configUrl } = useMoodleConnection();
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isFreshLoad, setIsFreshLoad] = useState(false);
  const isMobile = useIsMobile();

  // ─── TanStack Query hooks ───
  const baseQuery = useGeneralBaseData(isConnected);
  const courseIds = useMemo(() => baseQuery.data?.courses.map(c => c.id) || [], [baseQuery.data?.courses]);
  const enrollmentQuery = useEnrollmentData(courseIds, !!baseQuery.data);
  const loginLogsQuery = useLoginLogs(!!baseQuery.data);

  const invalidateAll = useInvalidateGeneral();

  // Derived data
  const siteInfo = baseQuery.data?.siteInfo;
  const courses = baseQuery.data?.courses || [];
  const categories = baseQuery.data?.categories || [];
  const usersSummary = baseQuery.data?.usersSummary;
  const enrollmentSummaries = enrollmentQuery.data || [];
  const loginLogs = loginLogsQuery.data || [];

  const enrollmentLoading = enrollmentQuery.isFetching;
  const loading = baseQuery.isFetching;
  const error = baseQuery.error?.message || enrollmentQuery.error?.message || null;

  // Handle token errors
  useMemo(() => {
    const errMsg = baseQuery.error?.message || enrollmentQuery.error?.message;
    if (errMsg?.startsWith("TOKEN_INVALID")) {
      toast.error("Token inválido o expirado. Reconectá con un nuevo token.");
      disconnect();
    }
  }, [baseQuery.error, enrollmentQuery.error]);

  const dataReady = !enrollmentLoading && enrollmentSummaries.length > 0;

  // Category map + tree
  const categoryMap = useMemo(() => {
    if (!categories.length) return new Map();
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  const categoryChartData = useMemo(() => {
    if (!courses.length || categoryMap.size === 0) return [];
    const getTopLevelId = (catId: number): number => {
      const cat = categoryMap.get(catId);
      if (!cat || cat.parent === 0) return catId;
      return getTopLevelId(cat.parent);
    };
    const topLevelMap = new Map<number, { name: string; subcategories: Map<string, number>; total: number }>();
    courses.forEach(course => {
      const topId = getTopLevelId(course.categoryid);
      const topCat = categoryMap.get(topId);
      const topName = topCat?.name || "Sin categoría";
      if (!topLevelMap.has(topId)) topLevelMap.set(topId, { name: topName, subcategories: new Map(), total: 0 });
      const entry = topLevelMap.get(topId)!;
      entry.total++;
      const subCat = categoryMap.get(course.categoryid);
      const subName = subCat && subCat.id !== topId ? subCat.name : topName;
      entry.subcategories.set(subName, (entry.subcategories.get(subName) || 0) + 1);
    });
    return Array.from(topLevelMap.values())
      .sort((a, b) => b.total - a.total)
      .map(entry => ({
        name: entry.name,
        cursos: entry.total,
        subcategories: Array.from(entry.subcategories.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, cursos: count })),
      }));
  }, [courses, categoryMap]);

  // Aggregated stats
  const stats = useMemo(() => {
    const totalStudents = enrollmentSummaries.reduce((s, e) => s + e.totalStudents, 0);
    const uniqueTeacherIds = new Set(enrollmentSummaries.flatMap((e: any) => e.teacherIds || []));
    const totalTeachers = uniqueTeacherIds.size;
    const totalCompleted = enrollmentSummaries.reduce((s, e) => s + e.completed, 0);
    const totalChecked = enrollmentSummaries.reduce((s, e) => s + e.checkedStudents, 0);
    const totalNeverAccessed = enrollmentSummaries.reduce((s, e) => s + e.neverAccessed, 0);
    const completionRate = totalChecked > 0 ? Math.round((totalCompleted / totalChecked) * 100) : 0;
    const neverAccessedRate = totalStudents > 0 ? Math.round((totalNeverAccessed / totalStudents) * 100) : 0;
    const totalAccessed = totalStudents - totalNeverAccessed;
    return { totalStudents, totalTeachers, totalCompleted, totalChecked, totalNeverAccessed, completionRate, neverAccessedRate, totalAccessed };
  }, [enrollmentSummaries]);

  // Chart data
  const chartData = useMemo(() => {
    if (!dataReady) return null;
    const summaryMap = new Map(enrollmentSummaries.map((s) => [s.courseId, s]));
    const enrollmentChartData = courses
      .map((c) => {
        const s = summaryMap.get(c.id);
        return { name: c.fullname.length > 40 ? c.fullname.slice(0, 40) + "…" : c.fullname, estudiantes: s?.totalStudents || 0, docentes: s?.totalTeachers || 0 };
      })
      .filter((d) => d.estudiantes > 0 || d.docentes > 0)
      .sort((a, b) => b.estudiantes - a.estudiantes)
      .slice(0, 5);

    const completionChartData = courses
      .map((c) => {
        const s = summaryMap.get(c.id);
        return { name: c.fullname.length > 40 ? c.fullname.slice(0, 40) + "…" : c.fullname, finalizaciones: s?.completed || 0 };
      })
      .filter((d) => d.finalizaciones > 0)
      .sort((a, b) => b.finalizaciones - a.finalizaciones)
      .slice(0, 5);

    const neverAccessedByCoursData = courses
      .map((c) => {
        const s = summaryMap.get(c.id);
        return { name: c.fullname.length > 60 ? c.fullname.slice(0, 60) + "…" : c.fullname, sinIngreso: s?.neverAccessed || 0 };
      })
      .filter((d) => d.sinIngreso > 0)
      .sort((a, b) => b.sinIngreso - a.sinIngreso)
      .slice(0, 5);

    const accessByCoursData = courses
      .map((c) => {
        const s = summaryMap.get(c.id);
        const accessed = (s?.totalStudents || 0) - (s?.neverAccessed || 0);
        return { name: c.fullname.length > 60 ? c.fullname.slice(0, 60) + "…" : c.fullname, ingresos: accessed };
      })
      .filter((d) => d.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);

    const completionPieData = [
      { name: "Finalizaron", value: stats.totalCompleted },
      { name: "Sin finalizar", value: stats.totalChecked - stats.totalCompleted },
      { name: "Sin datos", value: stats.totalStudents - stats.totalChecked },
    ].filter((d) => d.value > 0);

    const accessPieData = [
      { name: "Ingresaron", value: stats.totalStudents - stats.totalNeverAccessed },
      { name: "Nunca ingresaron", value: stats.totalNeverAccessed },
    ].filter((d) => d.value > 0);

    const userStatusPieData = usersSummary ? [
      { name: "Activos", value: usersSummary.active },
      { name: "Suspendidos", value: usersSummary.suspended },
      { name: "Eliminados", value: usersSummary.deleted },
    ].filter((d) => d.value > 0) : [];

    return { enrollmentChartData, completionChartData, completionPieData, accessPieData, userStatusPieData, summaryMap, neverAccessedByCoursData, accessByCoursData };
  }, [dataReady, enrollmentSummaries, courses, usersSummary, stats]);

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleRefresh = useCallback(() => {
    setIsFreshLoad(true);
    invalidateAll();
  }, [invalidateAll]);

  const handleAIAnalysis = async () => {
    if (!baseQuery.data || !chartData) return;
    setAiAnalysis("");
    setAiLoading(true);
    try {
      const generalData = {
        siteName: baseQuery.data.siteInfo.sitename,
        siteUrl: baseQuery.data.siteInfo.siteurl,
        moodleVersion: baseQuery.data.siteInfo.release || baseQuery.data.siteInfo.version,
        totalCourses: courses.length,
        totalUsers: usersSummary?.total || 0,
        activeUsers: usersSummary?.active || 0,
        suspendedUsers: usersSummary?.suspended || 0,
        deletedUsers: usersSummary?.deleted || 0,
        totalStudentEnrollments: stats.totalStudents,
        totalTeachers: stats.totalTeachers,
        totalCompleted: stats.totalCompleted,
        completionRate: stats.completionRate,
        neverAccessedRate: stats.neverAccessedRate,
        totalAccessed: stats.totalAccessed,
        topCoursesByEnrollment: chartData.enrollmentChartData,
        topCoursesByCompletion: chartData.completionChartData,
        categorySummary: categoryChartData,
        loginLogsCount: loginLogs.length,
      };
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-general`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ generalData }),
      });
      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Error al analizar");
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; setAiAnalysis(fullText); }
          } catch {}
        }
      }
    } catch (e: any) {
      console.error("AI analysis error:", e);
      toast.error(e.message || "Error al generar análisis con IA");
    } finally {
      setAiLoading(false);
    }
  };

  const StatSkeleton = () => (
    <Card className="glass-card">
      <CardContent className="p-4 text-center space-y-2">
        <Skeleton className="h-5 w-5 mx-auto rounded-full" />
        <Skeleton className="h-7 w-12 mx-auto" />
        <Skeleton className="h-3 w-16 mx-auto" />
      </CardContent>
    </Card>
  );

  const ChartsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="glass-card">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!isConnected) {
    return (
      <div className="max-w-5xl mx-auto">
        <MoodleConnectForm onConnect={connect} isConnected={false} onDisconnect={disconnect} configUrl={configUrl} />
      </div>
    );
  }

  if (baseQuery.isLoading && !baseQuery.data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando datos generales del sitio...</p>
        </div>
      </div>
    );
  }

  if (!baseQuery.data) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <Card className="glass-card border-destructive/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h1 className="text-base font-semibold text-foreground">No se pudieron cargar los datos generales</h1>
                <p className="text-sm text-muted-foreground">{error || "Revisá el token y los permisos del usuario en Moodle."}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => baseQuery.refetch()} className="shrink-0 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercent = enrollmentQuery.progress.total > 0 ? Math.round((enrollmentQuery.progress.completed / enrollmentQuery.progress.total) * 100) : 0;

  // Build export data shape for backward compat
  const exportData = {
    siteInfo: baseQuery.data.siteInfo,
    courses,
    categories,
    enrollmentSummaries,
    usersSummary: usersSummary || null,
    loginLogs,
  };

  return (
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm flex-1">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Site header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card glow-primary">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                  <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{siteInfo!.sitename}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{siteInfo!.siteurl}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">Moodle {siteInfo!.release?.split(" ")[0] || siteInfo!.version}</Badge>
                    <Badge variant="outline" className="text-xs">{courses.length} cursos</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="flex-1 sm:flex-none">
                    <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Actualizar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportGeneralToCSV(exportData)} disabled={enrollmentLoading} title="Descargar CSV" className="flex-1 sm:flex-none">
                    <FileSpreadsheet className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">CSV</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportGeneralToPDF(exportData)} disabled={enrollmentLoading} title="Descargar PDF" className="flex-1 sm:flex-none">
                    <FileText className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">PDF</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAIAnalysis} disabled={aiLoading || enrollmentLoading || !chartData} title="Analizar con IA" className="flex-1 sm:flex-none">
                    <Brain className={`h-4 w-4 sm:mr-1 ${aiLoading ? "animate-pulse" : ""}`} /> <span className="hidden sm:inline">IA</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading enrollment indicator */}
        {enrollmentLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Cargando datos de inscripción... ({enrollmentQuery.progress.completed}/{enrollmentQuery.progress.total} lotes)
            <Progress value={progressPercent} className="flex-1 max-w-xs h-2" />
          </motion.div>
        )}

        {/* Stat cards */}
        {(() => {
          const row1Cards = [
            <Card key="courses" className="glass-card">
              <CardContent className="p-4 text-center">
                <BookOpen className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                <p className="text-xs text-muted-foreground">Cursos</p>
              </CardContent>
            </Card>,
            <Card key="users" className="glass-card">
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-info mx-auto mb-1" />
                <p className="text-2xl font-bold text-info">{usersSummary?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Usuarios</p>
              </CardContent>
            </Card>,
            <Card key="active" className="glass-card">
              <CardContent className="p-4 text-center">
                <UserCheck className="h-5 w-5 text-success mx-auto mb-1" />
                <p className="text-2xl font-bold text-success">{usersSummary?.active || 0}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </CardContent>
            </Card>,
            <Card key="suspended" className="glass-card">
              <CardContent className="p-4 text-center">
                <UserX className="h-5 w-5 text-warning mx-auto mb-1" />
                <p className="text-2xl font-bold text-warning">{usersSummary?.suspended || 0}</p>
                <p className="text-xs text-muted-foreground">Suspendidos</p>
              </CardContent>
            </Card>,
            enrollmentLoading ? <StatSkeleton key="teachers-skel" /> : (
              <Card key="teachers" className="glass-card">
                <CardContent className="p-4 text-center">
                  <GraduationCap className="h-5 w-5 text-accent-foreground mx-auto mb-1" />
                  <p className="text-2xl font-bold text-accent-foreground">{stats.totalTeachers}</p>
                  <p className="text-xs text-muted-foreground">Docentes</p>
                </CardContent>
              </Card>
            ),
          ];

          const row2Cards = enrollmentLoading
            ? [1,2,3,4,5].map(i => <StatSkeleton key={`skel-${i}`} />)
            : [
              <Card key="enrollments" className="glass-card">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{stats.totalStudents}</p>
                  <p className="text-xs text-muted-foreground">Inscripciones</p>
                </CardContent>
              </Card>,
              <Card key="completions" className="glass-card">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
                  <p className="text-2xl font-bold text-success">{stats.totalCompleted}</p>
                  <p className="text-xs text-muted-foreground">Finalizaciones</p>
                </CardContent>
              </Card>,
              <Card key="completion-rate" className="glass-card">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
                  <p className="text-2xl font-bold text-success">{stats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">% Finalización</p>
                </CardContent>
              </Card>,
              <Card key="never-accessed" className="glass-card">
                <CardContent className="p-4 text-center">
                  <UserMinus className="h-5 w-5 text-destructive mx-auto mb-1" />
                  <p className="text-2xl font-bold text-destructive">{stats.neverAccessedRate}%</p>
                  <p className="text-xs text-muted-foreground">% Sin ingreso</p>
                </CardContent>
              </Card>,
              <Card key="total-access" className="glass-card">
                <CardContent className="p-4 text-center">
                  <LogIn className="h-5 w-5 text-info mx-auto mb-1" />
                  <p className="text-2xl font-bold text-info">{stats.totalAccessed}</p>
                  <p className="text-xs text-muted-foreground">Total ingresos</p>
                </CardContent>
              </Card>,
            ];

          const allCards = [...row1Cards, ...row2Cards];

          if (isMobile) {
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <MobileCardSlider cardsPerPage={4}>{allCards}</MobileCardSlider>
              </motion.div>
            );
          }

          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="grid grid-cols-5 gap-3">
                {row1Cards}
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="grid grid-cols-5 gap-3">
                {row2Cards}
              </motion.div>
            </>
          );
        })()}
        {/* AI Analysis */}
        <AIAnalysis analysis={aiAnalysis} loading={aiLoading} />

        {/* Charts — lazy loaded after all data is ready */}
        {enrollmentLoading ? (
          <ChartsSkeleton />
        ) : chartData ? (
          <Suspense fallback={<ChartsSkeleton />}>
            <GeneralCharts
              enrollmentChartData={chartData.enrollmentChartData}
              completionPieData={chartData.completionPieData}
              completionRate={stats.completionRate}
              userStatusPieData={chartData.userStatusPieData}
              usersTotalCount={usersSummary?.total || 0}
              accessPieData={chartData.accessPieData}
              neverAccessedRate={stats.neverAccessedRate}
              completionChartData={chartData.completionChartData}
              categoryChartData={categoryChartData}
              courses={courses}
              summaryMap={chartData.summaryMap}
              formatDate={formatDate}
              isFreshLoad={isFreshLoad}
              loginLogs={loginLogs}
              neverAccessedByCoursData={chartData.neverAccessedByCoursData}
              accessByCoursData={chartData.accessByCoursData}
            />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
};

export default GeneralPage;
