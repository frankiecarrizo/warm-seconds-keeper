import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { generalData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!generalData) {
      return new Response(JSON.stringify({ error: "Missing generalData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { siteName, siteUrl, moodleVersion, totalCourses, totalUsers, activeUsers, suspendedUsers, deletedUsers,
      totalStudentEnrollments, totalTeachers, totalCompleted, completionRate, neverAccessedRate, totalAccessed,
      topCoursesByEnrollment, topCoursesByCompletion, categorySummary, loginLogsCount } = generalData;

    const topEnrollmentList = (topCoursesByEnrollment || [])
      .map((c: any) => `- ${c.name}: ${c.estudiantes} estudiantes, ${c.docentes} docentes`)
      .join("\n");

    const topCompletionList = (topCoursesByCompletion || [])
      .map((c: any) => `- ${c.name}: ${c.finalizaciones} finalizaciones`)
      .join("\n");

    const categoryList = (categorySummary || [])
      .map((c: any) => `- ${c.name}: ${c.cursos} cursos`)
      .join("\n");

    const prompt = `Eres un analista educativo experto en plataformas Moodle. Analiza los siguientes datos generales del sitio y genera un informe estratégico en español.

INFORMACIÓN DEL SITIO:
- Nombre: ${siteName}
- URL: ${siteUrl}
- Versión: Moodle ${moodleVersion}

MÉTRICAS GENERALES:
- Total de cursos: ${totalCourses}
- Total de usuarios: ${totalUsers}
- Usuarios activos: ${activeUsers}
- Usuarios suspendidos: ${suspendedUsers}
- Usuarios eliminados: ${deletedUsers}
- Total inscripciones (estudiantes): ${totalStudentEnrollments}
- Docentes únicos: ${totalTeachers}
- Finalizaciones totales: ${totalCompleted}
- Tasa de finalización: ${completionRate}%
- Tasa de no ingreso: ${neverAccessedRate}%
- Total que ingresaron: ${totalAccessed}
- Registros de login: ${loginLogsCount}

TOP 5 CURSOS POR INSCRIPCIONES:
${topEnrollmentList || "Sin datos"}

TOP 5 CURSOS POR FINALIZACIONES:
${topCompletionList || "Sin datos"}

DISTRIBUCIÓN POR CATEGORÍAS:
${categoryList || "Sin datos"}

GENERA UN INFORME ESTRATÉGICO CON LAS SIGUIENTES SECCIONES (usa formato Markdown):

## 📊 Resumen Ejecutivo
Panorama general de la plataforma: salud del ecosistema educativo, nivel de adopción, métricas clave.

## 👥 Análisis de Usuarios
Estado de la base de usuarios: activos vs inactivos, proporción de suspendidos/eliminados, ratio estudiante-docente.

## 📈 Rendimiento Académico
Análisis de finalización de cursos, tasas de éxito, comparación entre cursos. Identificar cursos estrella y cursos problemáticos.

## 🚨 Alertas y Problemas Detectados
Indicadores preocupantes: baja finalización, alto porcentaje de no ingreso, cursos con problemas, desequilibrios.

## 📚 Análisis de Oferta Educativa
Distribución de cursos por categoría, balance de la oferta, áreas con mayor/menor actividad.

## 💡 Recomendaciones Estratégicas
- Acciones inmediatas (corto plazo)
- Mejoras estructurales (mediano plazo)  
- Objetivos estratégicos (largo plazo)

## 🎯 KPIs Sugeridos
Indicadores clave que deberían monitorearse regularmente para medir el progreso.

Sé específico con los datos, usa números concretos y porcentajes. Sé directo y accionable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un consultor estratégico especializado en plataformas educativas Moodle. Generas informes ejecutivos claros, directos y accionables para administradores de plataformas educativas." },
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
    console.error("analyze-general error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
