import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Loader2, X, MessageSquare, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MoodleConfig, ActivityCompletionReport as ACReport } from "@/lib/moodle-api";
import { ScrollArea } from "@/components/ui/scroll-area";

type StudentFilter = "all" | "never_accessed" | "not_completed" | "completed" | `activity_${number}`;

const NAMES_PER_ROW = 6;
const VISIBLE_ROWS = 2;

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
}

export function CourseMessaging({ allStudentsBasic, courseName, config, activityCompletionData }: CourseMessagingProps) {
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showAllNames, setShowAllNames] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [showActivityFilters, setShowActivityFilters] = useState(false);

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

  // Count students per activity level (0 completed, 1 completed, ..., N completed)
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

  const handleSend = async () => {
    if (!message.trim() || !filteredUsers.length) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("moodle-proxy", {
        body: { ...config, action: "send_message", params: { userIds: filteredUsers.map((u) => u.id), text: message } },
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.hasErrors && data.errors?.length) {
        toast.warning(`Enviado con ${data.errors.length} errores: ${data.errors[0]}`);
      } else {
        toast.success(`Mensaje enviado a ${filteredUsers.length} estudiantes.`);
      }
      setMessage("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
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
          placeholder="Escribe tu mensaje aquí..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />

        <Button onClick={handleSend} disabled={sending || !message.trim() || !filteredUsers.length} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar a {filteredUsers.length} estudiantes
        </Button>
      </CardContent>
    </Card>
  );
}
