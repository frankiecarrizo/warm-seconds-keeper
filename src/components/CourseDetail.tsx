import { useState } from "react";
import { MoodleCourseData, getQuizAttemptReview, streamCourseAnalysis } from "@/lib/moodle-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen, ChevronDown, ChevronRight, Clock, Award,
  CheckCircle2, XCircle, FileText, Loader2, AlertCircle,
  Calendar, GraduationCap, Sparkles, Brain,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QuizReviewDetail } from "@/components/QuizReviewDetail";

interface CourseDetailProps {
  course: MoodleCourseData;
}

export function CourseDetail({ course }: CourseDetailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quizReview, setQuizReview] = useState<Record<number, any>>({});
  const [loadingAttempt, setLoadingAttempt] = useState<number | null>(null);
  const [courseAnalysis, setCourseAnalysis] = useState("");
  const [courseAnalysisLoading, setCourseAnalysisLoading] = useState(false);

  const progress = course.progress ?? 0;
  const courseGrade = course.grades?.find((g: any) => g.itemtype === "course");
  const gradeItems = course.grades?.filter((g: any) => g.itemtype !== "course" && g.itemtype !== "category") ?? [];
  const completions = course.completion?.completions ?? [];

  const formatDate = (ts: number) => {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleDateString("es-AR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const getGradeColor = (pct: number) => {
    if (pct >= 80) return "text-success";
    if (pct >= 50) return "text-warning";
    return "text-destructive";
  };

  const loadAttemptReview = async (attemptId: number) => {
    if (quizReview[attemptId]) return;
    setLoadingAttempt(attemptId);
    try {
      const data = await getQuizAttemptReview(attemptId);
      if (data?.accessDenied) {
        toast.info("No se puede ver la revisión: permisos insuficientes en este quiz.");
        return;
      }
      setQuizReview((prev) => ({ ...prev, [attemptId]: data }));
    } catch (err) {
      console.error("Error loading attempt review:", err);
    } finally {
      setLoadingAttempt(null);
    }
  };

  const analyzeCourse = async () => {
    if (!course.quizAttempts || course.quizAttempts.length === 0) return;
    setCourseAnalysisLoading(true);
    setCourseAnalysis("");

    // First, load all attempt reviews that aren't loaded yet
    const allAttemptIds: number[] = [];
    for (const quiz of course.quizAttempts) {
      for (const attempt of quiz.attempts) {
        allAttemptIds.push(attempt.id);
      }
    }

    // Load missing reviews
    const reviewsToLoad = allAttemptIds.filter((id) => !quizReview[id]);
    for (const attemptId of reviewsToLoad) {
      try {
        const data = await getQuizAttemptReview(attemptId);
        setQuizReview((prev) => ({ ...prev, [attemptId]: data }));
      } catch (err) {
        console.error("Error loading review for analysis:", err);
      }
    }

    // Build quiz data with reviews for the AI
    // We need to get the latest state of quizReview after loading
    const getLatestReviews = () => {
      const latest: Record<number, any> = { ...quizReview };
      return latest;
    };

    // Small delay to ensure state is updated
    await new Promise((r) => setTimeout(r, 100));

    const quizData = course.quizAttempts.map((quiz) => {
      const gradeItem = course.grades?.find(
        (g: any) => g.itemmodule === "quiz" && g.iteminstance === quiz.quizId
      );
      return {
        quizName: quiz.quizName,
        quizId: quiz.quizId,
        maxGrade: gradeItem?.grademax ?? 10,
        attempts: quiz.attempts,
        reviews: quiz.attempts.map((attempt: any) => {
          const review = quizReview[attempt.id];
          if (!review) return { attemptId: attempt.id, questions: [] };

          // Parse HTML to extract question text for each question
          const questions = (review.questions || []).map((q: any) => {
            let questionText = "";
            if (q.html) {
              const div = document.createElement("div");
              div.innerHTML = q.html;
              const qtextEl = div.querySelector(".qtext");
              questionText = qtextEl?.textContent?.trim() || "";
              if (!questionText) {
                const fullText = div.textContent || "";
                const match = fullText.match(/Enunciado de la pregunta\s*(.+?)(?:Seleccione una|Respuesta|$)/s);
                questionText = match ? match[1].trim() : (fullText.slice(0, 150));
              }
            }
            return { ...q, questionText };
          });

          return { attemptId: attempt.id, questions };
        }),
      };
    });

    try {
      await streamCourseAnalysis({
        courseName: course.fullname,
        quizData,
        onDelta: (text) => setCourseAnalysis((prev) => prev + text),
        onDone: () => setCourseAnalysisLoading(false),
        onError: (err) => {
          console.error("Course analysis error:", err);
          setCourseAnalysisLoading(false);
        },
      });
    } catch (e) {
      console.error("Course analysis failed:", e);
      setCourseAnalysisLoading(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Card className="glass-card cursor-pointer hover:border-primary/30 transition-all group">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate text-sm">{course.fullname}</h3>
                  {course.completed ? (
                    <Badge variant="default" className="bg-success/20 text-success border-success/30 text-xs shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completado
                    </Badge>
                  ) : course.completionPercentage > 0 ? (
                    <Badge variant="secondary" className="text-xs shrink-0">{course.completionPercentage}% completado</Badge>
                  ) : progress > 0 ? (
                    <Badge variant="secondary" className="text-xs shrink-0">En progreso</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0">Sin iniciar</Badge>
                  )}
                  {course.completionMethod === "activities" && (
                    <Badge variant="outline" className="text-[10px] shrink-0 opacity-60">por actividades</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex-1 max-w-48">
                    <Progress value={course.completionPercentage || progress} className="h-1.5" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{course.completionPercentage || Math.round(progress)}%</span>
                  {courseGrade && courseGrade.graderaw != null && (
                    <span className={`text-xs font-semibold ${getGradeColor(
                      courseGrade.grademax > 0 ? (courseGrade.graderaw / courseGrade.grademax) * 100 : 0
                    )}`}>
                      {Math.round(courseGrade.graderaw * 100) / 100}/{Math.round(courseGrade.grademax * 100) / 100}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-muted-foreground group-hover:text-primary transition-colors">
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-5 mt-2 space-y-3 border-l-2 border-primary/20 pl-4"
            >
              {/* Course info summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <InfoChip icon={<Calendar className="h-3.5 w-3.5" />} label="Inicio" value={formatDate(course.startdate)} />
                <InfoChip icon={<Calendar className="h-3.5 w-3.5" />} label="Fin" value={course.enddate ? formatDate(course.enddate) : "Sin fecha"} />
                <InfoChip icon={<Clock className="h-3.5 w-3.5" />} label="Último acceso" value={formatDate(course.lastaccess ?? 0)} />
                <InfoChip icon={<GraduationCap className="h-3.5 w-3.5" />} label="Rol" value={course.roles?.join(", ") || "N/A"} />
              </div>

              {/* Grade items */}
              {gradeItems.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Calificaciones por Actividad ({gradeItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {gradeItems.map((item: any, idx: number) => {
                        const pct = item.grademax > 0 ? (item.graderaw ?? 0) / item.grademax * 100 : 0;
                        return (
                          <div key={idx} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{item.itemname || "Sin nombre"}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{item.itemmodule || item.itemtype}</p>
                            </div>
                            <div className="w-20">
                              <Progress value={pct} className="h-1" />
                            </div>
                            <span className={`text-xs font-mono font-semibold w-16 text-right ${getGradeColor(pct)}`}>
                              {(() => {
                                const raw = item.gradeformatted || "N/A";
                                if (raw.includes("<")) {
                                  const tmp = document.createElement("div");
                                  tmp.innerHTML = raw;
                                  return tmp.textContent?.trim() || raw;
                                }
                                return raw;
                              })()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completion activities */}
              {completions.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Actividades Completadas ({completions.filter((c: any) => c.complete).length}/{completions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {completions.map((comp: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded-md text-xs">
                          {comp.complete ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className={`truncate ${comp.complete ? "text-foreground" : "text-muted-foreground"}`}>
                            {(() => {
                              const raw = comp.details?.criteria || comp.title || `Actividad ${idx + 1}`;
                              // Strip HTML tags to get clean text
                              const tmp = document.createElement("div");
                              tmp.innerHTML = raw;
                              return tmp.textContent?.trim() || raw;
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quiz attempts */}
              {course.quizAttempts && course.quizAttempts.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-info" />
                      Cuestionarios ({course.quizAttempts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-3">
                    {course.quizAttempts.map((quiz) => (
                      <div key={quiz.quizId} className="space-y-2">
                        <h4 className="text-xs font-semibold text-foreground">{quiz.quizName}</h4>
                        {quiz.attempts.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sin intentos</p>
                        ) : (
                          <div className="space-y-1.5">
                            {quiz.attempts.map((attempt: any, idx: number) => {
                              const gradeItem = course.grades?.find(
                                (g: any) => g.itemmodule === "quiz" && g.iteminstance === quiz.quizId
                              );
                              const maxGrade = gradeItem?.grademax ?? 10;
                              const pct = maxGrade > 0 ? ((attempt.sumgrades ?? 0) / maxGrade) * 100 : 0;

                              return (
                                <div key={attempt.id}>
                                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
                                    <span className="text-xs text-muted-foreground w-20">
                                      Intento {idx + 1}
                                    </span>
                                    <span className={`text-xs font-mono font-semibold ${getGradeColor(pct)}`}>
                                      {attempt.sumgrades ?? "?"}/{maxGrade} ({Math.round(pct)}%)
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      {attempt.state === "finished" ? "Finalizado" : attempt.state}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (quizReview[attempt.id]) {
                                          setQuizReview((prev) => {
                                            const next = { ...prev };
                                            delete next[attempt.id];
                                            return next;
                                          });
                                        } else {
                                          loadAttemptReview(attempt.id);
                                        }
                                      }}
                                      disabled={loadingAttempt === attempt.id}
                                    >
                                      {loadingAttempt === attempt.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : quizReview[attempt.id] ? (
                                        "Ocultar"
                                      ) : (
                                        "Ver detalle"
                                      )}
                                    </Button>
                                  </div>

                                  {/* Quiz review detail */}
                                  <AnimatePresence>
                                    {quizReview[attempt.id] && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                      >
                                        <QuizReviewDetail review={quizReview[attempt.id]} />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* AI Course Analysis Button & Result */}
              {course.quizAttempts && course.quizAttempts.length > 0 && (
                <Card className="glass-card border-primary/20">
                  {!courseAnalysis && !courseAnalysisLoading ? (
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Brain className="h-4 w-4 text-primary" />
                        <span>Analizar temas a reforzar con IA</span>
                      </div>
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          analyzeCourse();
                        }}
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Analizar curso
                      </Button>
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader className="py-3 px-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-info/5">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          Diagnóstico IA — Temas a Reforzar
                          {courseAnalysisLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {!courseAnalysis && courseAnalysisLoading ? (
                          <div className="flex items-center gap-3 text-muted-foreground py-6 justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm">Cargando reviews y analizando con IA...</span>
                          </div>
                        ) : (
                          <div className="prose-sm text-sm space-y-2">
                            {courseAnalysis.split("\n").map((line, i) => {
                              if (line.startsWith("## ")) {
                                return (
                                  <h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">
                                    {line.replace(/^##\s*/, "")}
                                  </h3>
                                );
                              }
                              if (line.startsWith("### ")) {
                                return (
                                  <h4 key={i} className="text-xs font-semibold text-foreground mt-2 mb-0.5">
                                    {line.replace(/^###\s*/, "")}
                                  </h4>
                                );
                              }
                              if (line.startsWith("- ") || line.startsWith("* ")) {
                                const text = line.replace(/^[-*]\s/, "");
                                return (
                                  <div key={i} className="flex gap-2 text-muted-foreground leading-relaxed pl-1">
                                    <span className="text-primary/60 mt-1 shrink-0">•</span>
                                    <span dangerouslySetInnerHTML={{
                                      __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                                    }} />
                                  </div>
                                );
                              }
                              if (line.match(/^\d+\.\s/)) {
                                return (
                                  <div key={i} className="flex gap-2 text-muted-foreground leading-relaxed pl-1">
                                    <span className="text-primary font-mono text-xs mt-0.5 shrink-0">{line.match(/^(\d+)\./)?.[1]}.</span>
                                    <span dangerouslySetInnerHTML={{
                                      __html: line.replace(/^\d+\.\s*/, "").replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                                    }} />
                                  </div>
                                );
                              }
                              if (line.trim() === "") return <div key={i} className="h-1" />;
                              return (
                                <p key={i} className="text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{
                                  __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                                }} />
                              );
                            })}
                            {courseAnalysisLoading && (
                              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
                            )}
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
