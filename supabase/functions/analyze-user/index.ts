import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!userData) {
      return new Response(JSON.stringify({ error: "Missing userData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const courses = userData.courses || [];

    // Build a comprehensive summary for the AI
    const courseSummaries = courses.map((c: any) => {
      const roles = (c.roles || []).join(", ") || "sin rol definido";
      const gradeItems = c.grades || [];
      const finalGrade = gradeItems.find((g: any) => g.itemtype === "course");
      const quizSummary = (c.quizAttempts || []).map((q: any) => {
        const attempts = q.attempts || [];
        const bestGrade = attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.sumgrades || 0)) : null;
        const totalAttempts = attempts.length;
        return `    - Quiz "${q.quizName}": ${totalAttempts} intento(s), mejor nota: ${bestGrade ?? 'N/A'}`;
      }).join("\n");

      return `Curso: ${c.fullname} (${c.shortname})
  - **Rol del usuario en este curso: ${roles}**
  - Progreso: ${c.progress ?? 'N/A'}%
  - Completado: ${c.completed ? 'Sí' : 'No'}
  - Último acceso: ${c.lastaccess ? new Date(c.lastaccess * 1000).toLocaleDateString('es') : 'Nunca'}
  - Calificación final: ${finalGrade?.gradeformatted ?? 'N/A'}
  - Actividades calificadas: ${gradeItems.filter((g: any) => g.itemtype !== 'course').length}
${quizSummary ? `  - Quizzes:\n${quizSummary}` : '  - Sin quizzes'}`;
    }).join("\n\n");

    const firstAccess = user?.firstaccess ? new Date(user.firstaccess * 1000).toLocaleDateString('es') : 'Desconocido';
    const lastAccess = user?.lastaccess ? new Date(user.lastaccess * 1000).toLocaleDateString('es') : 'Nunca';
    const daysSinceCreation = user?.firstaccess
      ? Math.floor((Date.now() - user.firstaccess * 1000) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `Eres un analista educativo experto. Analiza los siguientes datos de un USUARIO en la plataforma Moodle y genera un informe detallado en español.

IMPORTANTE: Presta especial atención al ROL del usuario en cada curso. Si el usuario tiene rol de "editingteacher", "teacher", "manager" o "coursecreator", es un DOCENTE en ese curso, NO un estudiante. Adapta el análisis según el rol:
- Para cursos donde es DOCENTE: analiza su actividad como formador (cursos que dicta, actividad de gestión, etc.)
- Para cursos donde es ESTUDIANTE ("student"): analiza su rendimiento académico.
- No confundas docentes con "estudiantes fantasmas" por tener pocas calificaciones propias.

DATOS DEL ESTUDIANTE:
- Nombre: ${user?.fullname || 'Desconocido'}
- Email: ${user?.email || 'N/A'}
- Usuario: ${user?.username || 'N/A'}
- Primer acceso: ${firstAccess}
- Último acceso: ${lastAccess}
- Días en la plataforma: ${daysSinceCreation ?? 'N/A'}
- Estado: ${user?.suspended ? 'Suspendido' : 'Activo'}
- Total de cursos inscriptos: ${userData.totalCourses}
- Cursos analizados: ${courses.length}

DETALLE DE CURSOS:
${courseSummaries || 'Sin cursos inscriptos'}

GENERA UN INFORME CON LAS SIGUIENTES SECCIONES (usa formato Markdown):

## 📊 Resumen General
Un párrafo con el resumen del perfil del estudiante.

## ⏱️ Tiempo y Actividad
- Tiempo en la plataforma desde la creación
- Frecuencia estimada de acceso
- Patrones de uso

## 📚 Avance en Cursos
- Cursos completados vs no completados
- Porcentaje promedio de progreso
- Cursos con mejor y peor desempeño

## 📝 Calificaciones
- Promedio general (si hay datos)
- Mejores y peores calificaciones
- Tendencia de rendimiento

## ❌ Errores y Áreas de Mejora
- Quizzes con peor rendimiento
- Cursos abandonados o con bajo progreso
- Patrones de error

## 💡 Recomendaciones
- Sugerencias personalizadas para mejorar
- Cursos que debería priorizar
- Estrategias de estudio recomendadas

## 📈 Predicción
- Probabilidad de completar cursos pendientes
- Riesgo de abandono

Sé específico con los datos, usa números concretos y sé constructivo en las recomendaciones.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un analista educativo experto que genera informes detallados y útiles sobre el rendimiento de estudiantes en plataformas LMS como Moodle." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos en Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error en el servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-user error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
