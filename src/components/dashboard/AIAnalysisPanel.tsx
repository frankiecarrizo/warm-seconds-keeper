import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeUser, analyzeCourse, analyzeCourseOverview } from "@/lib/moodle-api";
import { Loader2, Sparkles, User, BookOpen, BarChart3 } from "lucide-react";

const AIAnalysisPanel = () => {
  const [activeTab, setActiveTab] = useState("user");
  const [jsonInput, setJsonInput] = useState("");
  const [courseName, setCourseName] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    setResult("");

    let parsed: any;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setResult("❌ JSON inválido. Verifica el formato.");
      setLoading(false);
      return;
    }

    const callbacks = {
      onChunk: (text: string) => {
        setResult((prev) => prev + text);
        resultRef.current?.scrollTo({ top: resultRef.current.scrollHeight });
      },
      onDone: () => setLoading(false),
      onError: (err: Error) => {
        setResult(`❌ Error: ${err.message}`);
        setLoading(false);
      },
    };

    try {
      if (activeTab === "user") {
        await analyzeUser(parsed, callbacks);
      } else if (activeTab === "course") {
        await analyzeCourse(courseName || "Curso", parsed, callbacks);
      } else {
        await analyzeCourseOverview(courseName || "Curso", parsed, callbacks);
      }
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`);
      setLoading(false);
    }
  };

  const placeholders: Record<string, string> = {
    user: '{\n  "user": { "fullname": "Juan Pérez", "email": "juan@mail.com" },\n  "courses": [],\n  "totalCourses": 0\n}',
    course:
      '[\n  {\n    "quizName": "Quiz 1",\n    "maxGrade": 10,\n    "attempts": [],\n    "reviews": []\n  }\n]',
    overview:
      '{\n  "students": [],\n  "allStudentsBasic": [],\n  "totalEnrolled": 0,\n  "totalStudents": 0\n}',
  };

  const labels: Record<string, { title: string; icon: typeof User; desc: string }> = {
    user: {
      title: "Análisis de Usuario",
      icon: User,
      desc: "Analiza el rendimiento completo de un usuario en Moodle",
    },
    course: {
      title: "Análisis de Curso",
      icon: BookOpen,
      desc: "Diagnóstico de quizzes y temas a reforzar",
    },
    overview: {
      title: "Panorama del Curso",
      icon: BarChart3,
      desc: "Informe general del curso con ranking y alertas",
    },
  };

  const current = labels[activeTab];

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-primary" />
          Análisis con IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="user" className="gap-1.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" />
              Usuario
            </TabsTrigger>
            <TabsTrigger value="course" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5" />
              Curso
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              Panorama
            </TabsTrigger>
          </TabsList>

          {["user", "course", "overview"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              <div>
                <p className="text-sm font-medium">{labels[tab].desc}</p>
              </div>
              {(tab === "course" || tab === "overview") && (
                <input
                  type="text"
                  placeholder="Nombre del curso"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
              <Textarea
                placeholder={placeholders[tab]}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="min-h-[160px] font-mono text-xs"
              />
            </TabsContent>
          ))}
        </Tabs>

        <Button
          onClick={handleAnalyze}
          disabled={loading || !jsonInput.trim()}
          className="w-full h-10"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <current.icon className="mr-2 h-4 w-4" />
              {current.title}
            </>
          )}
        </Button>

        {result && (
          <div
            ref={resultRef}
            className="prose-analysis max-h-[500px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap"
          >
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysisPanel;
