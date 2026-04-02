import { BookOpen, Users, Loader2, Sparkles, AlertCircle, Download, FileText } from "lucide-react";
import { MoodleConnectForm } from "@/components/MoodleConnectForm";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseSearch } from "@/components/CourseSearch";
import { CourseCharts } from "@/components/CourseCharts";
import { AIAnalysis } from "@/components/AIAnalysis";
import { CourseMessaging } from "@/components/CourseMessaging";
import { useCourseAnalytics } from "@/hooks/use-course-analytics";
import { motion, AnimatePresence } from "framer-motion";
import { exportCourseToCSV, exportCourseToPDF } from "@/lib/export-utils";
import { MoodleConfig } from "@/lib/moodle-api";

const CoursesPage = () => {
  const {
    isConnected,
    courses,
    searchLoading,
    search,
    selectedCourse,
    selectCourse,
    fetchCourseData,
    courseData,
    dataLoading,
    analysis,
    analysisLoading,
    analyze,
    error,
    setError,
  } = useCourseAnalytics();

  const { connect, disconnect, configUrl } = useMoodleConnection();

  if (!isConnected) {
    return (
      <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <MoodleConnectForm onConnect={connect} isConnected={false} onDisconnect={disconnect} configUrl={configUrl} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive hover:text-destructive">✕</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <CourseSearch
          courses={courses}
          loading={searchLoading}
          onSearch={search}
          onSelectCourse={selectCourse}
          selectedCourse={selectedCourse}
        />
      </motion.div>

      {/* Selected course */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card className="glass-card glow-primary">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
                    <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{selectedCourse.fullname}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">{selectedCourse.shortname}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    {!courseData && !dataLoading && (
                      <Button variant="default" onClick={fetchCourseData} className="flex-1 sm:flex-none">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Cargar datos
                      </Button>
                    )}
                    {courseData && !analysisLoading && (
                      <Button variant="glow" onClick={analyze} className="flex-1 sm:flex-none">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analizar con IA
                      </Button>
                    )}
                    {courseData && (
                      <>
                        <Button variant="outline" size="icon" onClick={() => exportCourseToCSV(selectedCourse.fullname, courseData, analysis)} title="Descargar CSV">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => exportCourseToPDF(selectedCourse.fullname, courseData, analysis)} title="Descargar PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {dataLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Obteniendo datos del curso desde Moodle...</p>
                  <p className="text-xs text-muted-foreground">Esto puede tardar según la cantidad de estudiantes</p>
                </div>
              </div>
            )}

            {/* Quick stats */}
            {courseData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Row 1 */}
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{courseData.totalEnrolled}</p>
                    <p className="text-xs text-muted-foreground">Total inscriptos</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{courseData.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">Estudiantes</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-accent-foreground">{courseData.totalTeachers}</p>
                    <p className="text-xs text-muted-foreground">Docentes/Gestores</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-warning">
                      {courseData.totalStudents - (courseData.allStudentsBasic || courseData.students).filter((s: any) => s.completed).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Sin finalizar</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">
                      {(courseData.allStudentsBasic || courseData.students).filter((s: any) => s.completed).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Finalizaron</p>
                  </CardContent>
                </Card>

                {/* Row 2 */}
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">
                      {courseData.totalStudents > 0
                        ? Math.round(((courseData.allStudentsBasic || courseData.students).filter((s: any) => s.completed).length / courseData.totalStudents) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">% Finalización</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">
                      {courseData.totalStudents > 0
                        ? Math.round((courseData.neverAccessed / courseData.totalStudents) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Nunca ingresaron</p>
                    <p className="text-[10px] text-muted-foreground">({courseData.neverAccessed} de {courseData.totalStudents})</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-info">
                      {courseData.totalStudents > 0
                        ? Math.round(((courseData.totalStudents - courseData.neverAccessed) / courseData.totalStudents) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Ingresaron</p>
                    <p className="text-[10px] text-muted-foreground">({courseData.totalStudents - courseData.neverAccessed} de {courseData.totalStudents})</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-warning">
                      {courseData.students.filter((s) => s.gradeRaw !== null && s.gradeMax > 0).length > 0
                        ? Math.round(
                            courseData.students
                              .filter((s) => s.gradeRaw !== null && s.gradeMax > 0)
                              .reduce((sum, s) => sum + (s.gradeRaw! / s.gradeMax) * 100, 0) /
                            courseData.students.filter((s) => s.gradeRaw !== null && s.gradeMax > 0).length
                          )
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Promedio general</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-info">{courseData.quizzes.length}</p>
                    <p className="text-xs text-muted-foreground">Quizzes</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Charts */}
            {courseData && <CourseCharts data={courseData} />}

            {/* Messaging */}
            {courseData && (() => {
              const saved = localStorage.getItem("moodle-config");
              const cfg = saved ? JSON.parse(saved) as MoodleConfig : null;
              return cfg ? (
                <CourseMessaging
                  allStudentsBasic={courseData.allStudentsBasic || courseData.students}
                  courseName={selectedCourse.fullname}
                  config={cfg}
                />
              ) : null;
            })()}

            {/* AI Analysis */}
            <AIAnalysis analysis={analysis} loading={analysisLoading} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!selectedCourse && courses.length === 0 && (
        <div className="text-center py-20">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Buscá un curso</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Usá el buscador para encontrar un curso y generar un dashboard completo con análisis de IA
          </p>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;