import { useEffect, useMemo } from "react";
import { LayoutDashboard, BookOpen, Users, Loader2, AlertCircle, GraduationCap, TrendingUp, UserX, CheckCircle2, RefreshCw, FolderTree, UserCheck, UserMinus, Trash2, LogIn, Download, FileText, FileSpreadsheet } from "lucide-react";
import { exportGeneralToCSV, exportGeneralToPDF } from "@/lib/export-utils";
import { MoodleConnectForm } from "@/components/MoodleConnectForm";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGeneralAnalytics } from "@/hooks/use-general-analytics";
import { motion, AnimatePresence } from "framer-motion";
import { GeneralCharts } from "@/components/GeneralCharts";



const GeneralPage = () => {
  const {
    isConnected,
    data,
    loading,
    enrollmentLoading,
    error,
    setError,
    fetchGeneralData,
  } = useGeneralAnalytics();

  // Build category map and tree data for chart
  const categoryMap = useMemo(() => {
    if (!data?.categories) return new Map();
    return new Map(data.categories.map(c => [c.id, c]));
  }, [data?.categories]);

  const categoryChartData = useMemo(() => {
    if (!data?.courses || categoryMap.size === 0) return [];
    const getTopLevelId = (catId: number): number => {
      const cat = categoryMap.get(catId);
      if (!cat || cat.parent === 0) return catId;
      return getTopLevelId(cat.parent);
    };

    const topLevelMap = new Map<number, { name: string; subcategories: Map<string, number>; total: number }>();

    data.courses.forEach(course => {
      const topId = getTopLevelId(course.categoryid);
      const topCat = categoryMap.get(topId);
      const topName = topCat?.name || "Sin categoría";
      
      if (!topLevelMap.has(topId)) {
        topLevelMap.set(topId, { name: topName, subcategories: new Map(), total: 0 });
      }
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
        subcategories: Array.from(entry.subcategories.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, cursos: count })),
      }));
  }, [data?.courses, categoryMap]);

  useEffect(() => {
    if (isConnected && !data && !loading) {
      fetchGeneralData();
    }
  }, [isConnected]);

  const { connect, disconnect, configUrl } = useMoodleConnection();

  if (!isConnected) {
    return (
      <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <MoodleConnectForm onConnect={connect} isConnected={false} onDisconnect={disconnect} configUrl={configUrl} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando datos generales del sitio...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-8">
        <Card className="glass-card border-destructive/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h1 className="text-base font-semibold text-foreground">No se pudieron cargar los datos generales</h1>
                <p className="text-sm text-muted-foreground">{error || "Revisá el token y los permisos del usuario en Moodle."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { siteInfo, courses, categories, enrollmentSummaries, usersSummary } = data;

  // Aggregated stats
  const totalStudents = enrollmentSummaries.reduce((s, e) => s + e.totalStudents, 0);
  const uniqueTeacherIds = new Set(enrollmentSummaries.flatMap((e: any) => e.teacherIds || []));
  const totalTeachers = uniqueTeacherIds.size;
  const totalEnrolled = enrollmentSummaries.reduce((s, e) => s + e.totalEnrolled, 0);
  const totalCompleted = enrollmentSummaries.reduce((s, e) => s + e.completed, 0);
  const totalChecked = enrollmentSummaries.reduce((s, e) => s + e.checkedStudents, 0);
  const totalNeverAccessed = enrollmentSummaries.reduce((s, e) => s + e.neverAccessed, 0);
  const completionRate = totalChecked > 0 ? Math.round((totalCompleted / totalChecked) * 100) : 0;
  const neverAccessedRate = totalStudents > 0 ? Math.round((totalNeverAccessed / totalStudents) * 100) : 0;
  const totalAccessed = totalStudents - totalNeverAccessed;

  // Unique students/teachers (approximate since same user can be in multiple courses)
  const summaryMap = new Map(enrollmentSummaries.map((s) => [s.courseId, s]));

  // Chart data: top 5 courses by enrollment
  const enrollmentChartData = courses
    .map((c) => {
      const s = summaryMap.get(c.id);
      return { name: c.shortname || c.fullname.slice(0, 25), estudiantes: s?.totalStudents || 0, docentes: s?.totalTeachers || 0 };
    })
    .filter((d) => d.estudiantes > 0 || d.docentes > 0)
    .sort((a, b) => b.estudiantes - a.estudiantes)
    .slice(0, 5);

  // Chart data: top 5 courses by completions
  const completionChartData = courses
    .map((c) => {
      const s = summaryMap.get(c.id);
      return { name: c.fullname.length > 40 ? c.fullname.slice(0, 40) + "…" : c.fullname, finalizaciones: s?.completed || 0 };
    })
    .filter((d) => d.finalizaciones > 0)
    .sort((a, b) => b.finalizaciones - a.finalizaciones)
    .slice(0, 5);

  // Completion pie
  const completionPieData = [
    { name: "Finalizaron", value: totalCompleted },
    { name: "Sin finalizar", value: totalChecked - totalCompleted },
    { name: "Sin datos", value: totalStudents - totalChecked },
  ].filter((d) => d.value > 0);

  // Access pie
  const accessPieData = [
    { name: "Ingresaron", value: totalStudents - totalNeverAccessed },
    { name: "Nunca ingresaron", value: totalNeverAccessed },
  ].filter((d) => d.value > 0);

  // User status pie
  const userStatusPieData = usersSummary ? [
    { name: "Activos", value: usersSummary.active },
    { name: "Suspendidos", value: usersSummary.suspended },
    { name: "Eliminados", value: usersSummary.deleted },
  ].filter((d) => d.value > 0) : [];

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive hover:text-destructive">✕</Button>
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
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{siteInfo.sitename}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{siteInfo.siteurl}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">Moodle {siteInfo.release?.split(" ")[0] || siteInfo.version}</Badge>
                    <Badge variant="outline" className="text-xs">{courses.length} cursos</Badge>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={fetchGeneralData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportGeneralToCSV(data)} disabled={enrollmentLoading} title="Descargar CSV">
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportGeneralToPDF(data)} disabled={enrollmentLoading} title="Descargar PDF">
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
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
            Cargando datos de inscripción de cursos... ({enrollmentSummaries.length}/{courses.length})
            <Progress value={(enrollmentSummaries.length / courses.length) * 100} className="flex-1 max-w-xs h-2" />
          </motion.div>
        )}

        {/* Stat cards - Row 1 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{courses.length}</p>
              <p className="text-xs text-muted-foreground">Cursos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-info mx-auto mb-1" />
              <p className="text-2xl font-bold text-info">{usersSummary?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Usuarios</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{usersSummary?.active || 0}</p>
              <p className="text-xs text-muted-foreground">Activos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <UserX className="h-5 w-5 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold text-warning">{usersSummary?.suspended || 0}</p>
              <p className="text-xs text-muted-foreground">Suspendidos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-5 w-5 text-accent-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-accent-foreground">{totalTeachers}</p>
              <p className="text-xs text-muted-foreground">Docentes</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat cards - Row 2 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Inscripciones</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Finalizaciones</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-success">{completionRate}%</p>
              <p className="text-xs text-muted-foreground">% Finalización</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <UserMinus className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-2xl font-bold text-destructive">{neverAccessedRate}%</p>
              <p className="text-xs text-muted-foreground">% Sin ingreso</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <LogIn className="h-5 w-5 text-info mx-auto mb-1" />
              <p className="text-2xl font-bold text-info">{totalAccessed}</p>
              <p className="text-xs text-muted-foreground">Total ingresos</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        {enrollmentSummaries.length > 0 && (
          <GeneralCharts
            enrollmentChartData={enrollmentChartData}
            completionPieData={completionPieData}
            completionRate={completionRate}
            userStatusPieData={userStatusPieData}
            usersTotalCount={usersSummary?.total || 0}
            accessPieData={accessPieData}
            neverAccessedRate={neverAccessedRate}
            completionChartData={completionChartData}
            categoryChartData={categoryChartData}
            courses={courses}
            summaryMap={summaryMap}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
};

export default GeneralPage;
