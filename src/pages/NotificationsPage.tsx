import { useState, useCallback } from "react";
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
import { Send, Users, BookOpen, User, Search, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchUsers, searchCourses, MoodleUser, MoodleConfig } from "@/lib/moodle-api";

const getConfig = (): MoodleConfig | null => {
  const saved = localStorage.getItem("moodle-config");
  return saved ? JSON.parse(saved) : null;
};

const callProxy = async (config: MoodleConfig, action: string, params?: Record<string, any>) => {
  const { data, error } = await supabase.functions.invoke("moodle-proxy", {
    body: { ...config, action, params },
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

export default function NotificationsPage() {
  const { isConnected, connect, disconnect, configUrl } = useMoodleConnection();

  if (!isConnected) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20">
        <MoodleConnectForm onConnect={connect} isConnected={isConnected} onDisconnect={disconnect} configUrl={configUrl} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
        <p className="text-muted-foreground text-sm">Envía mensajes vía Moodle a usuarios, cursos o todos.</p>
      </div>

      <Tabs defaultValue="course" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
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

function SendByCourse() {
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const cfg = getConfig();
    if (!cfg) return;
    setSearching(true);
    try {
      const res = await searchCourses(cfg, search);
      setCourses(res.filter((c: any) => c.id !== 1));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const selectCourse = async (course: any) => {
    setSelectedCourse(course);
    setEnrolledUsers([]);
    const cfg = getConfig();
    if (!cfg) return;
    setLoadingUsers(true);
    try {
      const enrolled = await callProxy(cfg, "get_enrolled_users", { courseId: course.id });
      const students = (enrolled || []).filter((u: any) => {
        const roles = (u.roles || []).map((r: any) => r.shortname);
        return !roles.includes("editingteacher") && !roles.includes("teacher") && !roles.includes("manager");
      });
      setEnrolledUsers(students);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !enrolledUsers.length) return;
    const cfg = getConfig();
    if (!cfg) return;
    setSending(true);
    try {
      const userIds = enrolledUsers.map((u: any) => u.id);
      const res = await callProxy(cfg, "send_message", { userIds, text: message });
      if (res?.hasErrors && res.errors?.length) {
        toast.warning(`Enviado con ${res.errors.length} errores: ${res.errors[0]}`);
      } else {
        toast.success(`Mensaje enviado a ${userIds.length} estudiantes del curso.`);
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
        <CardTitle className="text-lg">Enviar mensaje por curso</CardTitle>
        <CardDescription>Busca un curso y envía un mensaje a todos sus estudiantes.</CardDescription>
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
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCourse(null); setEnrolledUsers([]); }}>
                Cambiar
              </Button>
            </div>

            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando estudiantes...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                {enrolledUsers.length} estudiantes encontrados
              </p>
            )}

            <Textarea
              placeholder="Escribe tu mensaje aquí..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />

            <Button onClick={handleSend} disabled={sending || !message.trim() || !enrolledUsers.length} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar a {enrolledUsers.length} estudiantes
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
    const cfg = getConfig();
    if (!cfg) return;
    setSearching(true);
    try {
      const res = await searchUsers(cfg, search);
      setUsers(res);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedUser) return;
    const cfg = getConfig();
    if (!cfg) return;
    setSending(true);
    try {
      const res = await callProxy(cfg, "send_message", { userIds: [selectedUser.id], text: message });
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

            <Textarea
              placeholder="Escribe tu mensaje aquí..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />

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
    const cfg = getConfig();
    if (!cfg) return;
    setLoading(true);
    try {
      const users = await callProxy(cfg, "get_all_users");
      setUserCount(users.length);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || userCount === null) return;
    const cfg = getConfig();
    if (!cfg) return;
    setSending(true);
    try {
      const users = await callProxy(cfg, "get_all_users");
      const userIds = users.map((u: any) => u.id);
      const res = await callProxy(cfg, "send_message", { userIds, text: message });
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

            <Textarea
              placeholder="Escribe tu mensaje aquí..."
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
