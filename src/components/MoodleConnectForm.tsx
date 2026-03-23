import { useState } from "react";
import { Globe, Key, Plug, Loader2, LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface MoodleConnectFormProps {
  onConnect: (url: string, token: string) => void;
  isConnected: boolean;
  onDisconnect: () => void;
  configUrl?: string;
}

export function MoodleConnectForm({ onConnect, isConnected, onDisconnect, configUrl }: MoodleConnectFormProps) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) return;
    setTesting(true);
    // Small delay for UX
    await new Promise((r) => setTimeout(r, 500));
    onConnect(url, token);
    setTesting(false);
  };

  if (isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card glow-primary">
          <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm sm:text-base">Conectado a Moodle</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">{configUrl}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground hover:text-destructive shrink-0">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Desconectar</span>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="glass-card max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Conectar a Moodle</CardTitle>
          <CardDescription>
            Ingresá la URL y token de tu campus para comenzar el análisis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moodle-url">URL del Campus</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="moodle-url"
                  type="url"
                  placeholder="https://tucampus.edu/moodle"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="moodle-token">Token de Web Service</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="moodle-token"
                  type="password"
                  placeholder="Tu token de API"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Administración del sitio → Plugins → Web services → Administrar tokens
              </p>
            </div>
            <Button type="submit" variant="gradient" className="w-full" disabled={testing || !url || !token}>
              {testing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plug className="h-4 w-4" />
                  Conectar
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Funciones de Web Service requeridas:</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-foreground/80 mb-1">📋 General y Sitio</p>
                <ul className="text-xs text-muted-foreground space-y-1 pl-3">
                  <li><span className="font-mono text-foreground/70">core_webservice_get_site_info</span> — Información del sitio</li>
                  <li><span className="font-mono text-foreground/70">core_course_get_courses</span> — Listar todos los cursos</li>
                  <li><span className="font-mono text-foreground/70">core_course_get_categories</span> — Categorías de cursos</li>
                  <li><span className="font-mono text-foreground/70">core_course_search_courses</span> — Buscar cursos</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/80 mb-1">👤 Usuarios</p>
                <ul className="text-xs text-muted-foreground space-y-1 pl-3">
                  <li><span className="font-mono text-foreground/70">core_user_get_users</span> — Buscar usuarios</li>
                  <li><span className="font-mono text-foreground/70">core_user_get_users_by_field</span> — Obtener info del usuario</li>
                  <li><span className="font-mono text-foreground/70">core_enrol_get_users_courses</span> — Cursos del usuario</li>
                  <li><span className="font-mono text-foreground/70">core_enrol_get_enrolled_users</span> — Usuarios inscriptos y roles</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/80 mb-1">📊 Calificaciones y Progreso</p>
                <ul className="text-xs text-muted-foreground space-y-1 pl-3">
                  <li><span className="font-mono text-foreground/70">gradereport_user_get_grade_items</span> — Calificaciones por curso</li>
                  <li><span className="font-mono text-foreground/70">core_completion_get_course_completion_status</span> — Estado de completitud</li>
                  <li><span className="font-mono text-foreground/70">core_course_get_contents</span> — Contenidos y actividades</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/80 mb-1">📝 Quizzes</p>
                <ul className="text-xs text-muted-foreground space-y-1 pl-3">
                  <li><span className="font-mono text-foreground/70">mod_quiz_get_user_attempts</span> — Intentos de quizzes <span className="text-primary/70">(Moodle 4.x)</span></li>
                  <li><span className="font-mono text-foreground/70">mod_quiz_get_user_quiz_attempts</span> — Intentos de quizzes <span className="text-primary/70">(Moodle 5.x)</span></li>
                  <li><span className="font-mono text-foreground/70">mod_quiz_get_attempt_review</span> — Revisión detallada de intentos</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Administración del sitio → Plugins → Web services → Funciones externas
            </p>
            <p className="text-xs text-muted-foreground mt-1 italic">
              Compatible con Moodle 4.x y 5.x — Se detecta automáticamente la versión.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
