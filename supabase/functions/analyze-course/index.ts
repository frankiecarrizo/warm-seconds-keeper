import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { courseName, quizData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!quizData || !Array.isArray(quizData) || quizData.length === 0) {
      return new Response(JSON.stringify({ error: "No hay datos de cuestionarios para analizar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build detailed quiz summary with question-level data
    const quizSummaries = quizData.map((quiz: any) => {
      const attempts = quiz.attempts || [];
      const reviews = quiz.reviews || [];

      const attemptSummaries = attempts.map((attempt: any, idx: number) => {
        const review = reviews.find((r: any) => r.attemptId === attempt.id);
        const questions = review?.questions || [];

        const questionDetails = questions.map((q: any) => {
          const isCorrect = q.state === "gradedright" || q.state === "complete";
          const isWrong = q.state === "gradedwrong";
          return `    - Pregunta ${q.slot || "?"}: ${isCorrect ? "✅ Correcta" : isWrong ? "❌ Incorrecta" : "⚠️ Parcial/Otro"} (${q.mark ?? "?"}/${q.maxmark ?? "?"}) | Respuesta: "${q.responsesummary || "N/A"}" | Correcta: "${q.rightanswer || "N/A"}" | Enunciado resumido: "${(q.questionText || "").slice(0, 150)}"`;
        }).join("\n");

        return `  Intento ${idx + 1}: ${attempt.sumgrades ?? "?"}/${quiz.maxGrade ?? "?"} (${attempt.state})
${questionDetails || "    Sin detalle de preguntas"}`;
      }).join("\n\n");

      return `Quiz: "${quiz.quizName}"
${attemptSummaries || "  Sin intentos"}`;
    }).join("\n\n---\n\n");

    const prompt = `Eres un analista educativo experto. Analiza los resultados de los cuestionarios del curso "${courseName}" y genera un diagnóstico de temas a reforzar.

DATOS DE CUESTIONARIOS:
${quizSummaries}

GENERA UN INFORME CONCISO CON LAS SIGUIENTES SECCIONES (usa formato Markdown):

## 🎯 Diagnóstico General
Un párrafo breve sobre el rendimiento general en este curso.

## ❌ Temas a Reforzar
Identifica los temas/conceptos específicos donde el estudiante tiene más errores. Agrupa las preguntas incorrectas por temática y explica qué concepto no domina.
- Para cada tema débil, menciona las preguntas específicas que falló
- Explica por qué la respuesta del estudiante es incorrecta
- Sugiere qué debería estudiar

## ✅ Fortalezas
Temas/conceptos que el estudiante domina bien.

## 💡 Plan de Acción
Recomendaciones específicas y priorizadas para mejorar en este curso:
1. Qué estudiar primero
2. Qué tipo de ejercicios practicar
3. Conceptos clave a repasar

Sé específico con los datos, referencia preguntas concretas y sé constructivo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Eres un analista educativo que diagnostica áreas de mejora basándose en resultados de cuestionarios. Sé conciso y accionable." },
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
    console.error("analyze-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
