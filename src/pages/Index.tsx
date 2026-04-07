import { BookOpen, User, Calendar, Clock, Loader2, Sparkles, Download, FileText, FileSpreadsheet, AlertCircle, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoodleConnectForm } from "@/components/MoodleConnectForm";
import { UserSearch } from "@/components/UserSearch";
import { UserCharts } from "@/components/UserCharts";
import { AIAnalysis } from "@/components/AIAnalysis";
import { CourseDetail } from "@/components/CourseDetail";
import { useMoodleAnalytics } from "@/hooks/use-moodle-analytics";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { MoodleCertificate } from "@/lib/moodle-api";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const {
    isConnected,
    connect,
    disconnect,
    users,
    searchLoading,
    search,
    selectedUser,
    selectUser,
    fetchUserData,
    userData,
    dataLoading,
    analysis,
    analysisLoading,
    analyze,
    error,
    setError,
  } = useMoodleAnalytics();
  const { configUrl } = useMoodleConnection();

  const formatDate = (ts: number) => {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  };

  const daysSince = (ts: number) => {
    if (!ts) return null;
    return Math.floor((Date.now() - ts * 1000) / (1000 * 60 * 60 * 24));
  };

  const handleCertificateDownload = async (cert: MoodleCertificate) => {
    if (!userData) return;

    toast.info("Descargando certificado...");

    try {
      const { callProxy } = await import("@/lib/moodle-api");
      const res = await callProxy("download_certificate", {
        url: cert.downloadUrl,
        type: cert.type,
        certificateId: cert.id,
        userId: userData.user.id,
      });

      if (!res?.downloadable || !res?.base64) {
        throw new Error(res?.reason || "No se pudo descargar el certificado.");
      }

      const byteChars = atob(res.base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);

      const blob = new Blob([byteArray], { type: res.contentType || "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${cert.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Certificado descargado");
    } catch (e: any) {
      toast.error(e.message || "Error al descargar");
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Export button */}
        {userData && (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:px-4">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToPDF(userData, analysis)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(userData, analysis)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-destructive hover:text-destructive">
                ✕
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection form (only when not connected) */}
        {!isConnected && (
          <MoodleConnectForm
            onConnect={connect}
            isConnected={false}
            onDisconnect={disconnect}
            configUrl={configUrl}
          />
        )}

        {/* User search */}
        {isConnected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <UserSearch
              users={users}
              loading={searchLoading}
              onSearch={search}
              onSelectUser={selectUser}
              selectedUser={selectedUser}
            />
          </motion.div>
        )}

        {/* Selected user card + actions */}
        <AnimatePresence>
          {selectedUser && (
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
                       {selectedUser.profileimageurl ? (
                         <img src={selectedUser.profileimageurl} alt="" className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover" />
                       ) : (
                         <User className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{selectedUser.fullname}</h2>
                       <p className="text-xs sm:text-sm text-muted-foreground truncate">{selectedUser.email} · @{selectedUser.username}</p>
                       <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                         <span className="flex items-center gap-1">
                           <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                           Desde {formatDate(selectedUser.firstaccess)}
                         </span>
                         <span className="flex items-center gap-1">
                           <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                           Último: {formatDate(selectedUser.lastaccess)}
                         </span>
                         {daysSince(selectedUser.firstaccess) !== null && (
                           <span className="text-primary font-mono font-medium text-xs sm:text-sm">
                             {daysSince(selectedUser.firstaccess)} días en plataforma
                           </span>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                       {!userData && !dataLoading && (
                         <Button variant="default" onClick={fetchUserData} className="flex-1 sm:flex-none">
                           <BookOpen className="mr-2 h-4 w-4" />
                           Cargar datos
                         </Button>
                       )}
                       {userData && !analysisLoading && (
                         <Button variant="glow" onClick={analyze} className="flex-1 sm:flex-none">
                           <Sparkles className="mr-2 h-4 w-4" />
                           Analizar con IA
                         </Button>
                       )}
                     </div>
                   </div>
                </CardContent>
              </Card>

              {/* Loading state */}
              {dataLoading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Obteniendo datos del usuario desde Moodle...</p>
                    <p className="text-xs text-muted-foreground">Esto puede tardar según la cantidad de cursos</p>
                  </div>
                </div>
              )}

              {/* Quick stats */}
              {userData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{userData.totalCourses}</p>
                      <p className="text-xs text-muted-foreground">Cursos inscriptos</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-success">{userData.courses.filter(c => c.completed).length}</p>
                      <p className="text-xs text-muted-foreground">Completados</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-warning">
                        {Math.round(userData.courses.reduce((s, c) => s + (c.completionPercentage ?? (c.completed ? 100 : 0)), 0) / (userData.courses.length || 1))}%
                      </p>
                      <p className="text-xs text-muted-foreground">Finalización promedio</p>
                    </CardContent>
                  </Card>
                   <Card className="glass-card">
                     <CardContent className="p-4 text-center">
                       <p className="text-2xl font-bold text-info">
                         {userData.courses.reduce((s, c) => s + (c.quizAttempts?.length ?? 0), 0)}
                       </p>
                       <p className="text-xs text-muted-foreground">Quizzes realizados</p>
                     </CardContent>
                   </Card>
                   <Card className="glass-card">
                     <CardContent className="p-4 text-center">
                       <p className="text-2xl font-bold text-warning">
                         {userData.courses.reduce((s, c) => s + (c.certificates?.length ?? 0), 0)}
                       </p>
                       <p className="text-xs text-muted-foreground">Certificados</p>
                     </CardContent>
                   </Card>
                </motion.div>
              )}

              {/* Charts */}
              {userData && <UserCharts data={userData} />}

              {/* Certificates section */}
              {userData && (() => {
                const allCerts: MoodleCertificate[] = userData.courses.flatMap(c => c.certificates || []);
                if (allCerts.length === 0) return null;
                return (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                    <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                      <Award className="h-5 w-5 text-warning" />
                      Certificados ({allCerts.length})
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {allCerts.map((cert, i) => (
                        <Card key={`${cert.courseId}-${cert.id}-${i}`} className="glass-card">
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                              <Award className="h-5 w-5 text-warning" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{cert.name}</p>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs text-muted-foreground truncate">{cert.courseName}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                  {cert.type === "customcert" ? "Custom Cert" : "Nativo"}
                                </span>
                              </div>
                              {cert.issueDate && (
                                <p className="text-[10px] text-muted-foreground">
                                  Emitido: {new Date(cert.issueDate * 1000).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                              )}
                              {cert.code && (
                                <p className="text-[10px] text-muted-foreground font-mono">Código: {cert.code}</p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs shrink-0"
                               onClick={() => handleCertificateDownload(cert)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Descargar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Course detail list */}
              {userData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Detalle por Curso ({userData.courses.length})
                  </h3>
                  <div className="space-y-2">
                    {userData.courses.map((course) => (
                    <CourseDetail key={course.id} course={course} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* AI Analysis */}
              <AIAnalysis analysis={analysis} loading={analysisLoading} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {isConnected && !selectedUser && users.length === 0 && (
          <div className="text-center py-20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Buscá un usuario</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Usá el buscador de arriba para encontrar un estudiante y generar un análisis completo con IA
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
