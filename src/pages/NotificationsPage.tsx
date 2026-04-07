import { useState, useCallback, useMemo } from "react";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { MoodleConnectForm } from "@/components/MoodleConnectForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Users, BookOpen, User, Search, Loader2, CheckCircle2, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchUsers, searchCourses, MoodleUser, callProxy } from "@/lib/moodle-api";

// ── Plantillas por contexto ──────────────────────────────────
const COURSE_TEMPLATES = [
  { label: "Bienvenida", text: "Hola {nombre}, te damos la bienvenida al curso {curso}. ¡Esperamos que aproveches al máximo esta experiencia!" },
  { label: "Recordatorio", text: "Hola {nombre}, te recordamos que tenés actividades pendientes en el curso {curso}. ¡No te quedes atrás!" },
  { label: "Inactividad", text: "Hola {nombre}, notamos que aún no ingresaste al curso {curso}. Te invitamos a que comiences cuanto antes." },
  { label: "Felicitaciones", text: "Hola {nombre}, ¡felicitaciones por tu avance en {curso}! Seguí así." },
  { label: "Aviso general", text: "Hola {nombre}, hay novedades importantes en el curso {curso}. Por favor, revisá las últimas actualizaciones." },
];

const USER_TEMPLATES = [
  { label: "Consulta académica", text: "Hola {nombre}, nos comunicamos para hacerte una consulta sobre tu desempeño académico. ¿Podrías ponerte en contacto?" },
  { label: "Seguimiento", text: "Hola {nombre}, queremos saber cómo estás avanzando en tus cursos. Si necesitás ayuda, no dudes en escribirnos." },
  { label: "Documentación", text: "Hola {nombre}, te recordamos que tenés documentación pendiente de presentar. Por favor, regularizala a la brevedad." },
  { label: "Felicitaciones", text: "Hola {nombre}, queremos felicitarte por tu excelente desempeño. ¡Seguí así!" },
];

const ALL_TEMPLATES = [
  { label: "Aviso institucional", text: "Estimados usuarios, les informamos que hay una novedad institucional importante. Por favor, revisen las novedades en la plataforma." },
  { label: "Mantenimiento", text: "Estimados usuarios, les informamos que la plataforma estará en mantenimiento el día [FECHA]. Disculpen las molestias." },
  { label: "Nuevo curso", text: "Estimados usuarios, les informamos que se ha habilitado un nuevo curso en la plataforma. ¡Los invitamos a inscribirse!" },
  { label: "Recordatorio general", text: "Estimados usuarios, les recordamos completar las actividades pendientes en sus cursos. ¡No se queden atrás!" },
];

function TemplateBank({ templates, onSelect }: { templates: { label: string; text: string }[]; onSelect: (text: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
        <FileText className="h-3 w-3" /> Plantillas predefinidas:
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {templates.map((t, i) => (
          <Button key={i} variant="outline" size="sm" className="text-xs h-7" onClick={() => onSelect(t.text)}>
            {t.label}
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Variables disponibles: <code className="bg-muted px-1 rounded">{"{nombre}"}</code> <code className="bg-muted px-1 rounded">{"{curso}"}</code>
      </p>
    </div>
  );
}

export default function NotificationsPage() {
  const { isConnected, connect, disconnect, configUrl } = useMoodleConnection();

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto mt-10 sm:mt-20">
        <MoodleConnectForm onConnect={connect} isConnected={isConnected} onDisconnect={disconnect} configUrl={configUrl} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notificaciones</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Envía mensajes vía Moodle a usuarios, cursos o todos.</p>
      </div>

      <Tabs defaultValue="course" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-full sm:max-w-lg">
          <TabsTrigger value="course" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Por curso
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Por usuario
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Todos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="course">
          <SendByCourse />
        </TabsContent>
        <TabsContent value="user">
          <SendByUser />
        </TabsContent>
        <TabsContent value="all">
          <SendToAll />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type EnrichedUser = {
  id: number;
  fullname: string;
  email: string;
  lastcourseaccess: number;
  completed: boolean;
  completionPercentage: number;
};

type CourseFilter = "all" | "never_accessed" | "not_completed" | "completed";

const NAMES_PER_ROW = 6;
const VISIBLE_ROWS = 2;

function resolveVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function SendByCourse() {
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<EnrichedUser[]>([]);
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAllNames, setShowAllNames] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  const filteredUsers = allUsers.filter((u) => {
    if (excludedIds.has(u.id)) return false;
    if (filter === "never_accessed") return u.lastcourseaccess === 0;
    if (filter === "not_completed") return u.lastcourseaccess > 0 && !u.completed;
    if (filter === "completed") return u.completed;
    return true;
  });

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await searchCourses(search);
      setCourses(res.filter((c: any) => c.id !== 1));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const selectCourse = async (course: any) => {
    setSelectedCourse(course);
    setAllUsers([]);
    setFilter("all");
    setLoadingUsers(true);
    try {
      const enriched = await callProxy("get_enrolled_users_with_completion", { courseId: course.id });
      setAllUsers(enriched || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const hasVariables = /\{nombre\}/.test(message);

  const handleSend = async () => {
    if (!message.trim() || !filteredUsers.length) return;
    setSending(true);
    try {
      if (hasVariables) {
        const errors: string[] = [];
        let sent = 0;
        for (const user of filteredUsers) {
          const text = resolveVars(message, { nombre: user.fullname, curso: selectedCourse?.fullname || "" });
          try {
            const res = await callProxy("send_message", { userIds: [user.id], text });
            if (res?.hasErrors) errors.push(`${user.fullname}: ${res.errors?.[0]}`);
            else sent++;
          } catch (e: any) {
            errors.push(`${user.fullname}: ${e.message}`);
          }
        }
        if (errors.length) toast.warning(`Enviado a ${sent}, ${errors.length} errores.`);
        else toast.success(`Mensaje personalizado enviado a ${sent} estudiantes.`);
      } else {
        const userIds = filteredUsers.map((u) => u.id);
        const res = await callProxy("send_message", { userIds, text: message });
        if (res?.hasErrors && res.errors?.length) {
          toast.warning(`Enviado con ${res.errors.length} errores: ${res.errors[0]}`);
        } else {
          toast.success(`Mensaje enviado a ${userIds.length} estudiantes.`);
        }
      }
      setMessage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const filterLabels: Record<CourseFilter, string> = {
    all: "Todos",
    never_accessed: "Sin ingresar",
    not_completed: "No finalizados",
    completed: "Finalizados",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Enviar mensaje por curso</CardTitle>
        <CardDescription>Busca un curso y envía un mensaje a sus estudiantes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="sm">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {courses.length > 0 && !selectedCourse && (
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-1">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCourse(c)}
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors"
                >
                  <span className="font-medium">{c.fullname}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({c.shortname})</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedCourse && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCourse.fullname}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCourse(null); setAllUsers([]); setFilter("all"); setExcludedIds(new Set()); }}>
                Cambiar
              </Button>
            </div>

            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando estudiantes y finalización...
              </div>
            ) : (
              <>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(filterLabels) as CourseFilter[]).map((key) => {
                    const count = key === "all"
                      ? allUsers.length
                      : key === "never_accessed"
                        ? allUsers.filter((u) => u.lastcourseaccess === 0).length
                        : key === "not_completed"
                          ? allUsers.filter((u) => u.lastcourseaccess > 0 && !u.completed).length
                          : allUsers.filter((u) => u.completed).length;
                    return (
                      <Button
                        key={key}
                        variant={filter === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setFilter(key); setShowAllNames(false); setExcludedIds(new Set()); }}
                        className="gap-1.5 text-xs"
                      >
                        {filterLabels[key]}
                        <Badge variant={filter === key ? "secondary" : "outline"} className="ml-1 text-[10px] px-1.5 py-0">
                          {count}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>

                <p className="text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5 inline mr-1" />
                  {filteredUsers.length} estudiantes seleccionados
                </p>

                {filteredUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(showAllNames ? filteredUsers : filteredUsers.slice(0, NAMES_PER_ROW * VISIBLE_ROWS)).map((u) => (
                        <Badge key={u.id} variant="outline" className="text-xs font-normal pr-1 flex items-center gap-1">
                          {u.fullname}
                          <button
                            onClick={() => setExcludedIds((prev) => new Set([...prev, u.id]))}
                            className="rounded-full hover:bg-muted p-0.5 transition-colors"
                            aria-label={`Quitar ${u.fullname}`}
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {filteredUsers.length > NAMES_PER_ROW * VISIBLE_ROWS && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => setShowAllNames(!showAllNames)}
                      >
                        {showAllNames ? "Ver menos" : `Ver todos (${filteredUsers.length})`}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}

            <TemplateBank templates={COURSE_TEMPLATES} onSelect={setMessage} />

            <Textarea
              placeholder="Escribe tu mensaje o seleccioná una plantilla..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />

            {message && filteredUsers.length > 0 && hasVariables && (
              <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Vista previa:</p>
                <p className="whitespace-pre-wrap text-foreground">
                  {resolveVars(message, { nombre: filteredUsers[0].fullname, curso: selectedCourse?.fullname || "" })}
                </p>
              </div>
            )}

            <Button onClick={handleSend} disabled={sending || !message.trim() || !filteredUsers.length} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar a {filteredUsers.length} estudiantes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SendByUser() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<MoodleUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<MoodleUser | null>(null);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await searchUsers(search);
      setUsers(res);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const hasVariables = /\{nombre\}/.test(message);

  const handleSend = async () => {
    if (!message.trim() || !selectedUser) return;
    setSending(true);
    try {
      const text = hasVariables ? resolveVars(message, { nombre: selectedUser.fullname }) : message;
      const res = await callProxy("send_message", { userIds: [selectedUser.id], text });
      if (res?.hasErrors && res.errors?.length) {
        toast.warning(`Error: ${res.errors[0]}`);
      } else {
        toast.success(`Mensaje enviado a ${selectedUser.fullname}.`);
      }
      setMessage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Enviar mensaje a un usuario</CardTitle>
        <CardDescription>Busca un usuario y envíale un mensaje directo por Moodle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="sm">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {users.length > 0 && !selectedUser && (
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors"
                >
                  <span className="font-medium">{u.fullname}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedUser.fullname}</Badge>
              <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                Cambiar
              </Button>
            </div>

            <TemplateBank templates={USER_TEMPLATES} onSelect={setMessage} />

            <Textarea
              placeholder="Escribe tu mensaje o seleccioná una plantilla..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />

            {message && selectedUser && hasVariables && (
              <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium text-muted-foreground">Vista previa:</p>
                <p className="whitespace-pre-wrap text-foreground">
                  {resolveVars(message, { nombre: selectedUser.fullname })}
                </p>
              </div>
            )}

            <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar mensaje
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SendToAll() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const users = await callProxy("get_all_users");
      setUserCount(users.length);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || userCount === null) return;
    setSending(true);
    try {
      const users = await callProxy("get_all_users");
      const userIds = users.map((u: any) => u.id);
      const res = await callProxy("send_message", { userIds, text: message });
      if (res?.hasErrors && res.errors?.length) {
        toast.warning(`Enviado con ${res.errors.length} errores. Primero: ${res.errors[0]}`);
      } else {
        toast.success(`Mensaje enviado a ${userIds.length} usuarios.`);
      }
      setMessage("");
      setConfirmed(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Enviar mensaje a todos</CardTitle>
        <CardDescription>Envía un mensaje a todos los usuarios activos de la plataforma.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {userCount === null ? (
          <Button onClick={loadUsers} disabled={loading} variant="outline" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Cargar lista de usuarios
          </Button>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5 inline mr-1" />
              {userCount} usuarios activos serán notificados.
            </p>

            <TemplateBank templates={ALL_TEMPLATES} onSelect={setMessage} />

            <Textarea
              placeholder="Escribe tu mensaje o seleccioná una plantilla..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />

            {!confirmed ? (
              <Button
                onClick={() => setConfirmed(true)}
                disabled={!message.trim()}
                variant="outline"
                className="gap-2"
              >
                Confirmar envío masivo
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2" variant="destructive">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Sí, enviar a {userCount} usuarios
                </Button>
                <Button variant="ghost" onClick={() => setConfirmed(false)}>Cancelar</Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
