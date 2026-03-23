import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseName, courseData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!courseData || !courseData.students) {
      return new Response(JSON.stringify({ error: "Missing courseData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use allStudentsBasic (ALL students) for completion analysis
    const allStudentsBasic = courseData.allStudentsBasic || [];
    const students = courseData.students || [];

    // Build completion summary from ALL students
    const completedCount = allStudentsBasic.filter((s: any) => s.completed).length;
    const neverAccessedCount = allStudentsBasic.filter((s: any) => !s.lastaccess).length;
    const notCompletedCount = allStudentsBasic.length - completedCount - neverAccessedCount;

    const completionList = allStudentsBasic.map((s: any) => {
      const status = !s.lastaccess ? "NUNCA INGRESÓ" : s.completed ? "FINALIZADO" : "NO FINALIZADO";
      const lastAccess = s.lastaccess ? new Date(s.lastaccess * 1000).toLocaleDateString('es') : 'Nunca';
      return `- ${s.fullname} | Estado: ${status} | Último acceso: ${lastAccess}`;
    }).join("\n");

    // Build detailed info from the processed students (with grades/quizzes)
    const studentSummaries = students.map((s: any) => {
      const gradePct = s.gradeRaw !== null && s.gradeMax > 0
        ? Math.round((s.gradeRaw / s.gradeMax) * 100)
        : null;

      const quizSummary = (s.quizAttempts || []).map((q: any) => {
        const best = q.attempts.length > 0
          ? Math.max(...q.attempts.map((a: any) => a.sumgrades || 0))
          : null;
        return `  - ${q.quizName}: ${q.attempts.length} intento(s), mejor nota: ${best ?? 'N/A'}`;
      }).join("\n");

      return `- ${s.fullname} (${s.email})
  Calificación: ${gradePct !== null ? gradePct + '%' : 'N/A'} (${s.gradeFormatted})
  Último acceso: ${s.lastaccess ? new Date(s.lastaccess * 1000).toLocaleDateString('es') : 'Nunca'}
${quizSummary ? `  Quizzes:\n${quizSummary}` : '  Sin quizzes'}`;
    }).join("\n\n");

    const gradesWithValues = students.filter((s: any) => s.gradeRaw !== null && s.gradeMax > 0);
    const avgGrade = gradesWithValues.length > 0
      ? Math.round(gradesWithValues.reduce((sum: number, s: any) => sum + (s.gradeRaw / s.gradeMax) * 100, 0) / gradesWithValues.length)
      : null;

    const prompt = `Eres un analista educativo experto. Analiza los datos del curso "${courseName}" y genera un informe completo en español.

RESUMEN DEL CURSO:
- Total inscriptos: ${courseData.totalEnrolled}
- Estudiantes: ${courseData.totalStudents}
- Finalizados: ${completedCount} de ${allStudentsBasic.length}
- No finalizados: ${notCompletedCount}
- Nunca ingresaron: ${neverAccessedCount}
- Promedio general de calificación: ${avgGrade !== null ? avgGrade + '%' : 'Sin datos'}
- Quizzes del curso: ${courseData.quizzes?.map((q: any) => q.name).join(', ') || 'Ninguno'}

ESTADO DE FINALIZACIÓN DE TODOS LOS ESTUDIANTES (${allStudentsBasic.length}):
${completionList}

DETALLE ACADÉMICO (muestra de ${students.length} estudiantes con calificaciones y quizzes):
${studentSummaries || 'Sin estudiantes'}

GENERA UN INFORME CON LAS SIGUIENTES SECCIONES (usa formato Markdown):

## 📊 Resumen del Curso
Panorama general del curso: participación, rendimiento promedio, tasa de finalización, estado general.

## 📈 Estado de Finalización
Análisis detallado de la finalización. Cuántos finalizaron, cuántos no, cuántos nunca ingresaron. Porcentajes y observaciones.

## 📈 Distribución de Rendimiento
Análisis de cómo se distribuyen las calificaciones. Identifica grupos (alto rendimiento, promedio, bajo rendimiento, en riesgo).

## 🏆 Ranking y Destacados
- Top 5 mejores estudiantes
- Estudiantes que necesitan atención urgente
- Patrones de rendimiento

## 📝 Análisis de Quizzes
Rendimiento general en los quizzes del curso. Quizzes más difíciles, más fáciles.

## ⚠️ Alertas Tempranas
Estudiantes en riesgo de abandono o reprobación. Señales de alerta. Lista de estudiantes que nunca ingresaron.

## 💡 Recomendaciones para el Docente
- Estrategias pedagógicas sugeridas
- Temas a reforzar
- Acciones específicas por grupo de estudiantes

Sé específico con los datos, usa nombres y números concretos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un analista educativo que genera informes detallados sobre el rendimiento de un curso completo en Moodle, orientado a docentes." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Intenta de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error en el servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-course-overview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
