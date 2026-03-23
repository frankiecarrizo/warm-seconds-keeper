import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, GraduationCap, AlertTriangle, TrendingUp, Lightbulb, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface AIAnalysisProps {
  analysis: string;
  loading: boolean;
}

// Map emoji/section headers to icons
const sectionIcons: Record<string, React.ReactNode> = {
  "📊": <TrendingUp className="h-5 w-5 text-info" />,
  "📚": <BookOpen className="h-5 w-5 text-primary" />,
  "📝": <GraduationCap className="h-5 w-5 text-info" />,
  "❌": <AlertTriangle className="h-5 w-5 text-warning" />,
  "✅": <Target className="h-5 w-5 text-success" />,
  "💡": <Lightbulb className="h-5 w-5 text-warning" />,
  "🎯": <Target className="h-5 w-5 text-primary" />,
  "🏆": <GraduationCap className="h-5 w-5 text-warning" />,
};

function getIconForLine(line: string) {
  for (const [emoji, icon] of Object.entries(sectionIcons)) {
    if (line.includes(emoji)) return icon;
  }
  return null;
}

export function AIAnalysis({ analysis, loading }: AIAnalysisProps) {
  const sections = useMemo(() => {
    if (!analysis) return [];
    
    const lines = analysis.split("\n");
    const result: { type: string; content: string; icon?: React.ReactNode }[] = [];
    
    for (const line of lines) {
      if (line.startsWith("## ") || line.startsWith("### ")) {
        const isH2 = line.startsWith("## ");
        const text = line.replace(/^#{2,3}\s/, "");
        const icon = getIconForLine(text);
        result.push({ type: isH2 ? "h2" : "h3", content: text, icon });
      } else if (line.startsWith("- **") || line.startsWith("* **")) {
        const text = line.replace(/^[-*]\s/, "");
        result.push({ type: "bold-item", content: text });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        result.push({ type: "item", content: line.replace(/^[-*]\s/, "") });
      } else if (line.trim() === "") {
        result.push({ type: "spacer", content: "" });
      } else {
        result.push({ type: "text", content: line });
      }
    }
    return result;
  }, [analysis]);

  if (!analysis && !loading) return null;

  const renderInlineFormatting = (text: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = text.split(boldRegex);
    if (parts.length <= 1) {
      // Handle *italic*
      const italicRegex = /\*(.*?)\*/g;
      const iParts = text.split(italicRegex);
      if (iParts.length <= 1) return <>{text}</>;
      return (
        <>
          {iParts.map((part, j) =>
            j % 2 === 1 ? <em key={j} className="text-foreground font-medium">{part}</em> : <span key={j}>{part}</span>
          )}
        </>
      );
    }
    return (
      <>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="text-foreground">{part}</strong> : <span key={j}>{part}</span>
        )}
      </>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-info/5">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              🤖
            </span>
            Análisis con IA
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!analysis && loading ? (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Generando análisis con IA...</span>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {(() => {
                // Group content by h2 sections
                const groups: { heading?: typeof sections[0]; items: typeof sections }[] = [];
                let current: typeof sections = [];

                for (const s of sections) {
                  if (s.type === "h2") {
                    if (current.length > 0 || groups.length === 0) {
                      groups.push({ items: current });
                    }
                    current = [];
                    groups.push({ heading: s, items: [] });
                  } else {
                    if (groups.length > 0 && groups[groups.length - 1].heading) {
                      groups[groups.length - 1].items.push(s);
                    } else {
                      current.push(s);
                    }
                  }
                }
                if (current.length > 0) groups.push({ items: current });

                return groups.map((group, gi) => {
                  if (!group.heading && group.items.length === 0) return null;
                  
                  return (
                    <div key={gi} className="px-6 py-4">
                      {group.heading && (
                        <div className="flex items-center gap-2.5 mb-3">
                          {group.heading.icon && (
                            <span className="flex-shrink-0">{group.heading.icon}</span>
                          )}
                          <h2 className="text-base font-semibold text-foreground">
                            {renderInlineFormatting(group.heading.content.replace(/^[^\w\s]*\s*/, ""))}
                          </h2>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {group.items.map((item, ii) => {
                          if (item.type === "spacer") return <div key={ii} className="h-1" />;
                          if (item.type === "h3") {
                            return (
                              <h3 key={ii} className="text-sm font-semibold text-foreground mt-3 mb-1">
                                {renderInlineFormatting(item.content)}
                              </h3>
                            );
                          }
                          if (item.type === "bold-item") {
                            return (
                              <div key={ii} className="flex gap-2 text-sm text-muted-foreground leading-relaxed pl-1">
                                <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                                <span>{renderInlineFormatting(item.content)}</span>
                              </div>
                            );
                          }
                          if (item.type === "item") {
                            return (
                              <div key={ii} className="flex gap-2 text-sm text-muted-foreground leading-relaxed pl-1">
                                <span className="text-primary/60 mt-1.5 flex-shrink-0">•</span>
                                <span>{renderInlineFormatting(item.content)}</span>
                              </div>
                            );
                          }
                          return (
                            <p key={ii} className="text-sm text-muted-foreground leading-relaxed">
                              {renderInlineFormatting(item.content)}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
              {loading && analysis && (
                <div className="px-6 pb-4">
                  <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}