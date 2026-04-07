import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Loader2, X, MessageSquare, ClipboardList, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MoodleConfig, ActivityCompletionReport as ACReport, CourseTeacher } from "@/lib/moodle-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StudentFilter = "all" | "never_accessed" | "not_completed" | "completed" | `activity_${number}`;

const NAMES_PER_ROW = 6;
const VISIBLE_ROWS = 2;

// Plantillas predefinidas
const MESSAGE_TEMPLATES = [
  {
    label: "Bienvenida",
    text: "Hola {nombre}, te damos la bienvenida al curso {curso}. ¡Esperamos que aproveches al máximo esta experiencia!",
  },
  {
    label: "Recordatorio de actividades",
    text: "Hola {nombre}, te recordamos que tenés {pendientes} actividad(es) pendiente(s) de un total de {total_actividades} en el curso {curso}. ¡No te quedes atrás!",
  },
  {
    label: "Incentivo de avance",
    text: "Hola {nombre}, vas muy bien en {curso}. Ya completaste {completadas} de {total_actividades} actividades. ¡Seguí así!",
  },
  {
    label: "Aviso de inactividad",
    text: "Hola {nombre}, notamos que aún no ingresaste al curso {curso}. Te invitamos a que comiences cuanto antes para no perderte el contenido.",
  },
  {
    label: "Aviso general",
    text: "Hola {nombre}, te informamos que hay novedades importantes en el curso {curso}. Por favor, revisá las últimas actualizaciones.",
  },
];

interface CourseMessagingProps {
  allStudentsBasic: Array<{
    id: number;
    fullname: string;
    lastaccess?: number;
    lastcourseaccess?: number;
    completed: boolean;
  }>;
  courseName: string;
  config: MoodleConfig;
  activityCompletionData?: ACReport | null;
  teachers?: CourseTeacher[];
}

export function CourseMessaging({ allStudentsBasic, courseName, config, activityCompletionData, teachers = [] }: CourseMessagingProps) {
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showAllNames, setShowAllNames] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [showActivityFilters, setShowActivityFilters] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  // Build a map: studentId -> number of completed activities
  const completionCountMap = useMemo(() => {
    if (!activityCompletionData) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const s of activityCompletionData.students) {
      const count = activityCompletionData.activities.reduce((sum, a) => {
        const state = s.completions[a.cmid];
        return sum + (state === 1 || state === 2 ? 1 : 0);
      }, 0);
      map.set(s.id, count);
    }
    return map;
  }, [activityCompletionData]);

  const totalActivities = activityCompletionData?.activities.length ?? 0;

  const filteredUsers = useMemo(() => {
    return allStudentsBasic.filter((u) => {
      if (excludedIds.has(u.id)) return false;
      const access = u.lastcourseaccess ?? u.lastaccess ?? 0;
      if (filter === "never_accessed") return access === 0;
      if (filter === "not_completed") return access > 0 && !u.completed;
      if (filter === "completed") return u.completed;
      if (filter.startsWith("activity_")) {
        const targetCount = parseInt(filter.split("_")[1], 10);
        const completed = completionCountMap.get(u.id) ?? 0;
        return completed === targetCount;
      }
      return true;
    });
  }, [allStudentsBasic, filter, excludedIds, completionCountMap]);

  const counts = useMemo(() => ({
    all: allStudentsBasic.length,
    never_accessed: allStudentsBasic.filter((u) => (u.lastcourseaccess ?? u.lastaccess ?? 0) === 0).length,
    not_completed: allStudentsBasic.filter((u) => (u.lastcourseaccess ?? u.lastaccess ?? 0) > 0 && !u.completed).length,
    completed: allStudentsBasic.filter((u) => u.completed).length,
  }), [allStudentsBasic]);

  // Count students per activity level
  const activityCounts = useMemo(() => {
    if (!activityCompletionData || totalActivities === 0) return [];
    const result: { level: number; label: string; count: number }[] = [];
    for (let i = 0; i <= totalActivities; i++) {
      const count = allStudentsBasic.filter((u) => (completionCountMap.get(u.id) ?? 0) === i).length;
      const label = i === 0
        ? "Ninguna actividad"
        : i === totalActivities
          ? `Todas (${i})`
          : `Hasta ${i} actividad${i > 1 ? "es" : ""}`;
      result.push({ level: i, label, count });
    }
    return result;
  }, [activityCompletionData, totalActivities, allStudentsBasic, completionCountMap]);

  const filterLabels: Record<StudentFilter, string> = {
    all: "Todos",
    never_accessed: "Sin ingresar",
    not_completed: "No finalizados",
    completed: "Finalizados",
  };

  const selectedTeacher = selectedTeacherId && selectedTeacherId !== "none" ? teachers.find((t) => String(t.id) === selectedTeacherId) : undefined;

  // Replace template variables per-user
  const resolveTemplate = (template: string, user: { id: number; fullname: string }) => {
    const completed = completionCountMap.get(user.id) ?? 0;
    const pendientes = totalActivities - completed;
    return template
      .replace(/\{nombre\}/g, user.fullname)
      .replace(/\{curso\}/g, courseName)
      .replace(/\{completadas\}/g, String(completed))
      .replace(/\{pendientes\}/g, String(pendientes))
      .replace(/\{total_actividades\}/g, String(totalActivities));
  };

  const handleSend = async () => {
    if (!message.trim() || !filteredUsers.length) return;
    setSending(true);

    const hasVariables = /\{(nombre|completadas|pendientes)\}/.test(message);
    const signature = selectedTeacher ? `\n\n— ${selectedTeacher.fullname}` : "";

    try {
      if (hasVariables) {
        // Send individually with personalized text
        const batchSize = 20;
        let sentCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < filteredUsers.length; i += batchSize) {
          const batch = filteredUsers.slice(i, i + batchSize);
          for (const user of batch) {
            const personalizedText = resolveTemplate(message, user) + signature;
            const { data, error } = await supabase.functions.invoke("moodle-proxy", {
              body: { action: "send_message", params: { userIds: [user.id], text: personalizedText } },
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                "x-moodle-session": localStorage.getItem("moodle-session") || "",
              },
            });
            if (error) errors.push(`${user.fullname}: ${error.message}`);
            else if (data?.hasErrors) errors.push(`${user.fullname}: ${data.errors?.[0]}`);
            else sentCount++;
          }
        }

        if (errors.length) {
          toast.warning(`Enviado a ${sentCount}, ${errors.length} errores.`);
        } else {
          toast.success(`Mensaje personalizado enviado a ${sentCount} estudiantes.`);
        }
      } else {
        // Bulk send with same text
        const finalText = message + signature;
        const { data, error } = await supabase.functions.invoke("moodle-proxy", {
          body: { ...config, action: "send_message", params: { userIds: filteredUsers.map((u) => u.id), text: finalText } },
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (data?.hasErrors && data.errors?.length) {
          toast.warning(`Enviado con ${data.errors.length} errores: ${data.errors[0]}`);
        } else {
          toast.success(`Mensaje enviado a ${filteredUsers.length} estudiantes.`);
        }
      }
      setMessage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: string) => {
    setMessage(template);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="gap-2 w-full sm:w-auto"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Enviar mensaje a estudiantes
      </Button>
    );
  }

  return (
    <Card className="glass-card border-info/20">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-info" />
            Enviar mensaje — {courseName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Teacher selector (signature) */}
        {teachers.length > 0 && (
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Firmar como... (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin firma</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.fullname} ({t.roles.join(", ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Message templates */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Plantillas predefinidas:</p>
          <div className="flex gap-1.5 flex-wrap">
            {MESSAGE_TEMPLATES.map((t, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => applyTemplate(t.text)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Variables: <code className="bg-muted px-1 rounded">{"{nombre}"}</code> <code className="bg-muted px-1 rounded">{"{curso}"}</code> <code className="bg-muted px-1 rounded">{"{completadas}"}</code> <code className="bg-muted px-1 rounded">{"{pendientes}"}</code> <code className="bg-muted px-1 rounded">{"{total_actividades}"}</code>
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {(Object.keys(filterLabels) as StudentFilter[]).map((key) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => { setFilter(key); setShowAllNames(false); setExcludedIds(new Set()); }}
              className="gap-1.5 text-xs"
            >
              {filterLabels[key]}
              <Badge variant={filter === key ? "secondary" : "outline"} className="ml-1 text-[10px] px-1.5 py-0">
                {counts[key]}
              </Badge>
            </Button>
          ))}
          {activityCounts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActivityFilters(!showActivityFilters)}
              className="gap-1 text-xs text-muted-foreground"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Por actividades
              {showActivityFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>

        {/* Activity-level filters */}
        {showActivityFilters && activityCounts.length > 0 && (
          <ScrollArea className="max-h-[120px]">
            <div className="flex gap-1.5 flex-wrap p-1">
              {activityCounts.map(({ level, label, count }) => (
                <Button
                  key={level}
                  variant={filter === `activity_${level}` ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setFilter(`activity_${level}`); setShowAllNames(false); setExcludedIds(new Set()); }}
                  className="gap-1 text-xs"
                >
                  {label}
                  <Badge variant={filter === `activity_${level}` ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                    {count}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Selected count */}
        <p className="text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 inline mr-1" />
          {filteredUsers.length} estudiantes seleccionados
        </p>

        {/* Names */}
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

        {/* Message */}
        <Textarea
          placeholder="Escribe tu mensaje aquí o seleccioná una plantilla..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />

        {/* Preview */}
        {message && filteredUsers.length > 0 && (
          <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Vista previa (primer destinatario):</p>
            <p className="whitespace-pre-wrap text-foreground">
              {resolveTemplate(message, filteredUsers[0])}
              {selectedTeacher ? `\n\n— ${selectedTeacher.fullname}` : ""}
            </p>
          </div>
        )}

        <Button onClick={handleSend} disabled={sending || !message.trim() || !filteredUsers.length} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar a {filteredUsers.length} estudiantes
        </Button>
      </CardContent>
    </Card>
  );
}
