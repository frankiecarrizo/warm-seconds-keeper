import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface QuizReviewDetailProps {
  review: any;
}

/**
 * Parse Moodle question HTML to extract:
 * - questionText: the actual question/enunciado
 * - selectedAnswer: what the student picked
 * - isSelectedCorrect: whether their pick was right
 */
function parseQuestionHtml(html: string) {
  if (!html) return { questionText: "", studentAnswer: "", correctAnswer: "" };

  const div = document.createElement("div");
  div.innerHTML = html;

  // 1. Question text from .qtext
  let questionText = "";
  const qtextEl = div.querySelector(".qtext");
  if (qtextEl) {
    questionText = qtextEl.textContent?.trim() || "";
  }
  if (!questionText) {
    const fullText = div.textContent || "";
    const match = fullText.match(/Enunciado de la pregunta\s*(.+?)(?:Seleccione una|Respuesta|$)/s);
    questionText = match ? match[1].trim() : "";
  }

  // 2. Student answer - try multiple Moodle patterns
  let studentAnswer = "";
  // Pattern: selected radio/checkbox
  const selectedInput = div.querySelector("input:checked, input[checked]");
  if (selectedInput) {
    const label = selectedInput.closest("label") || selectedInput.parentElement;
    studentAnswer = label?.textContent?.trim().replace(/^[a-d]\.\s*/i, "") || "";
  }
  // Pattern: .selectedChoice or .response
  if (!studentAnswer) {
    const selectedEl = div.querySelector(".selectedChoice, .response, .answer .correct, .answer .incorrect");
    if (selectedEl) {
      studentAnswer = selectedEl.textContent?.trim() || "";
    }
  }
  // Pattern: "Respuesta guardada" or text after "Respuesta"
  if (!studentAnswer) {
    const fullText = div.textContent || "";
    const respMatch = fullText.match(/(?:Guardada?|Respuesta)\s*:?\s*(Verdadero|Falso|True|False)/i);
    if (respMatch) {
      studentAnswer = respMatch[1];
    }
  }
  // Pattern: look for "La respuesta correcta es" to infer format
  if (!studentAnswer) {
    const fullText = div.textContent || "";
    // Try to find selected answer between known markers
    const selMatch = fullText.match(/Seleccione una:\s*(Verdadero|Falso)/i);
    if (selMatch) {
      // Check if there's a "Guardada" or checked state
      const guardMatch = fullText.match(/Guardada:\s*(Verdadero|Falso)/i);
      studentAnswer = guardMatch ? guardMatch[1] : selMatch[1];
    }
  }

  // 3. Correct answer
  let correctAnswer = "";
  const correctEl = div.querySelector(".rightanswer, .correct");
  if (correctEl) {
    correctAnswer = correctEl.textContent?.trim().replace(/^La respuesta correcta es:?\s*/i, "") || "";
  }
  if (!correctAnswer) {
    const fullText = div.textContent || "";
    const caMatch = fullText.match(/La respuesta correcta es:?\s*'?([^'.\n]+)/i);
    if (caMatch) {
      correctAnswer = caMatch[1].trim().replace(/'/g, "");
    }
  }

  return { questionText, studentAnswer, correctAnswer };
}

export function QuizReviewDetail({ review }: QuizReviewDetailProps) {
  const questions = review?.questions || [];

  if (questions.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No se pudo obtener el detalle de las preguntas.
      </div>
    );
  }

  return (
    <div className="ml-4 mt-2 space-y-2 border-l border-border/50 pl-3">
      {questions.map((q: any, idx: number) => {
        const isCorrect = q.state === "gradedright" || q.state === "complete";
        const isWrong = q.state === "gradedwrong";
        const isPartial = q.state === "gradedpartial" || q.state === "mangrright";

        const { questionText, studentAnswer, correctAnswer: parsedCorrect } = parseQuestionHtml(q.html);
        const responseSummary = q.responsesummary || studentAnswer || "";
        const rightAnswer = q.rightanswer || parsedCorrect || "";

        return (
          <div
            key={q.slot || idx}
            className={`rounded-lg p-3 text-xs border transition-colors ${
              isCorrect
                ? "bg-success/5 border-success/20"
                : isWrong
                ? "bg-destructive/5 border-destructive/20"
                : isPartial
                ? "bg-warning/5 border-warning/20"
                : "bg-muted/30 border-border/30"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="shrink-0 mt-0.5">
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : isWrong ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <HelpCircle className="h-4 w-4 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground shrink-0">
                    Pregunta {q.slot || idx + 1}
                  </span>
                  <span className="text-muted-foreground font-mono shrink-0">
                    {q.mark != null ? `${q.mark}/${q.maxmark}` : ""}
                  </span>
                </div>

                {/* Enunciado */}
                {questionText && (
                  <div className="bg-muted/40 rounded-md px-2.5 py-2 border border-border/20">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide block mb-1">Enunciado</span>
                    <p className="text-foreground/80 leading-relaxed break-words">
                      {questionText}
                    </p>
                  </div>
                )}

                {/* Respuesta del estudiante - always show */}
                <div className="flex items-start gap-1.5 min-w-0 px-1">
                  <span className="text-muted-foreground shrink-0 mt-px">📝</span>
                  <div className="min-w-0">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide block mb-0.5">Respuesta del alumno</span>
                    <span className={`font-medium break-words leading-relaxed ${isCorrect ? "text-success" : isWrong ? "text-destructive" : "text-foreground"}`}>
                      {responseSummary || "No disponible"}
                    </span>
                  </div>
                </div>

                {/* Respuesta correcta - show when wrong or partial */}
                {(isWrong || isPartial) && rightAnswer && (
                  <div className="flex items-start gap-1.5 min-w-0 px-1">
                    <span className="shrink-0 mt-px">✅</span>
                    <div className="min-w-0">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wide block mb-0.5">Respuesta correcta</span>
                      <span className="text-success font-medium break-words">{rightAnswer}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary */}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border/30">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" />
          {questions.filter((q: any) => q.state === "gradedright" || q.state === "complete").length} correctas
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-destructive" />
          {questions.filter((q: any) => q.state === "gradedwrong").length} incorrectas
        </span>
        <span className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3 text-warning" />
          {questions.filter((q: any) => q.state !== "gradedright" && q.state !== "complete" && q.state !== "gradedwrong").length} parcial/otro
        </span>
      </div>
    </div>
  );
}
