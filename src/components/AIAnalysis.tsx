import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, GraduationCap, AlertTriangle, TrendingUp, Lightbulb, Target, ChevronDown, ChevronUp, Users, Clock, BarChart3, Shield, Award, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";

interface AIAnalysisProps {
  analysis: string;
  loading: boolean;
}

const sectionConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  "📊": { icon: <BarChart3 className="h-4 w-4" />, color: "text-primary", bgColor: "bg-primary/10" },
  "📚": { icon: <BookOpen className="h-4 w-4" />, color: "text-info", bgColor: "bg-info/10" },
  "📝": { icon: <GraduationCap className="h-4 w-4" />, color: "text-info", bgColor: "bg-info/10" },
  "❌": { icon: <AlertTriangle className="h-4 w-4" />, color: "text-destructive", bgColor: "bg-destructive/10" },
  "✅": { icon: <Target className="h-4 w-4" />, color: "text-success", bgColor: "bg-success/10" },
  "💡": { icon: <Lightbulb className="h-4 w-4" />, color: "text-warning", bgColor: "bg-warning/10" },
  "🎯": { icon: <Target className="h-4 w-4" />, color: "text-primary", bgColor: "bg-primary/10" },
  "🏆": { icon: <Award className="h-4 w-4" />, color: "text-warning", bgColor: "bg-warning/10" },
  "👥": { icon: <Users className="h-4 w-4" />, color: "text-info", bgColor: "bg-info/10" },
  "📈": { icon: <TrendingUp className="h-4 w-4" />, color: "text-success", bgColor: "bg-success/10" },
  "🚨": { icon: <Shield className="h-4 w-4" />, color: "text-destructive", bgColor: "bg-destructive/10" },
  "⚠️": { icon: <AlertTriangle className="h-4 w-4" />, color: "text-warning", bgColor: "bg-warning/10" },
  "⏱️": { icon: <Clock className="h-4 w-4" />, color: "text-muted-foreground", bgColor: "bg-muted/50" },
};

function getSectionStyle(text: string) {
  for (const [emoji, config] of Object.entries(sectionConfig)) {
    if (text.includes(emoji)) return config;
  }
  return { icon: <Brain className="h-4 w-4" />, color: "text-primary", bgColor: "bg-primary/10" };
}

// Extract numbers and percentages from text
function extractMetrics(text: string): { value: string; label: string }[] {
  const metrics: { value: string; label: string }[] = [];
  // Match patterns like "85%" or "120 estudiantes" or "4.5/5"
  const patterns = [
    /(\d+(?:\.\d+)?%)/g,
    /(\d+(?:\.\d+)?\/\d+)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const idx = match.index;
      // Get surrounding context as label
      const before = text.substring(Math.max(0, idx - 30), idx).split(/[.,:;]/).pop()?.trim() || "";
      const after = text.substring(idx + match[1].length, Math.min(text.length, idx + match[1].length + 20)).split(/[.,:;]/)[0]?.trim() || "";
      const label = (before + " " + after).trim().replace(/^[-*•]\s*/, "").substring(0, 40);
      if (!metrics.find(m => m.value === match![1])) {
        metrics.push({ value: match[1], label });
      }
    }
  }
  return metrics.slice(0, 6);
}

// Try to extract chart data from list items with numbers
function extractChartData(items: string[]): { name: string; value: number }[] | null {
  const data: { name: string; value: number }[] = [];
  for (const item of items) {
    const numMatch = item.match(/(\d+(?:\.\d+)?)\s*%/) || item.match(/:\s*(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const label = item
        .replace(/\*\*/g, "")
        .replace(/^[-*•]\s*/, "")
        .split(/[:–—]/)[0]
        .trim()
        .substring(0, 20);
      data.push({ name: label, value: parseFloat(numMatch[1]) });
    }
  }
  return data.length >= 3 ? data.slice(0, 8) : null;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(172, 60%, 50%)",
  "hsl(220, 60%, 55%)",
  "hsl(280, 50%, 55%)",
];

function MiniBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-36 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval={0} angle={-20} textAnchor="end" height={35} />
          <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" width={30} />
          <Tooltip
            contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniPieChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-36 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 min-w-[70px]">
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

interface ParsedSection {
  title: string;
  rawTitle: string;
  style: { icon: React.ReactNode; color: string; bgColor: string };
  lines: string[];
  metrics: { value: string; label: string }[];
  chartData: { name: string; value: number }[] | null;
}

function renderInlineFormatting(text: string) {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = text.split(boldRegex);
  if (parts.length <= 1) {
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
}

function SectionCard({ section, index, defaultExpanded }: { section: ParsedSection; index: number; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const listItems = section.lines.filter(l => l.startsWith("- ") || l.startsWith("* "));
  const textLines = section.lines.filter(l => !l.startsWith("- ") && !l.startsWith("* ") && l.trim() !== "" && !l.startsWith("### "));
  const subHeadings = section.lines.filter(l => l.startsWith("### "));

  // Decide chart type: pie for 3-5 items, bar for more
  const showPie = section.chartData && section.chartData.length <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden border-border/50 hover:border-border transition-colors">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`flex items-center justify-center h-7 w-7 rounded-md ${section.style.bgColor} ${section.style.color}`}>
                  {section.style.icon}
                </span>
                <CardTitle className="text-sm font-semibold text-foreground">
                  {section.title}
                </CardTitle>
              </div>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {/* Show metric badges in header when collapsed */}
            {!expanded && section.metrics.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {section.metrics.slice(0, 4).map((m, i) => (
                  <MetricBadge key={i} value={m.value} label={m.label} />
                ))}
              </div>
            )}
          </CardHeader>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="px-4 pt-0 pb-4">
                {/* Metrics row */}
                {section.metrics.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {section.metrics.map((m, i) => (
                      <MetricBadge key={i} value={m.value} label={m.label} />
                    ))}
                  </div>
                )}

                {/* Chart */}
                {section.chartData && (
                  <div className="mb-3 rounded-lg bg-muted/30 p-2">
                    {showPie ? (
                      <MiniPieChart data={section.chartData} />
                    ) : (
                      <MiniBarChart data={section.chartData} />
                    )}
                  </div>
                )}

                {/* Text content */}
                <div className="space-y-1.5">
                  {textLines.map((line, i) => (
                    <p key={`t-${i}`} className="text-sm text-muted-foreground leading-relaxed">
                      {renderInlineFormatting(line)}
                    </p>
                  ))}

                  {subHeadings.map((h, i) => (
                    <h4 key={`h-${i}`} className="text-xs font-semibold text-foreground mt-2 mb-1">
                      {renderInlineFormatting(h.replace(/^###\s*/, ""))}
                    </h4>
                  ))}

                  {listItems.map((item, i) => (
                    <div key={`l-${i}`} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                      <span className="text-primary mt-1 flex-shrink-0 text-xs">•</span>
                      <span>{renderInlineFormatting(item.replace(/^[-*]\s*/, ""))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export function AIAnalysis({ analysis, loading }: AIAnalysisProps) {
  const sections = useMemo<ParsedSection[]>(() => {
    if (!analysis) return [];

    const lines = analysis.split("\n");
    const result: ParsedSection[] = [];
    let currentTitle = "";
    let currentRawTitle = "";
    let currentLines: string[] = [];

    const pushSection = () => {
      if (currentTitle || currentLines.length > 0) {
        const allText = currentLines.join(" ");
        const listItems = currentLines.filter(l => l.startsWith("- ") || l.startsWith("* "));
        result.push({
          title: currentTitle.replace(/^[^\w\sáéíóúñ]*\s*/i, "").trim(),
          rawTitle: currentRawTitle,
          style: getSectionStyle(currentRawTitle),
          lines: currentLines.filter(l => l.trim() !== ""),
          metrics: extractMetrics(allText),
          chartData: extractChartData(listItems.map(l => l.replace(/^[-*]\s*/, ""))),
        });
      }
    };

    for (const line of lines) {
      if (line.startsWith("## ")) {
        pushSection();
        currentRawTitle = line.replace(/^##\s*/, "");
        currentTitle = currentRawTitle;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    pushSection();

    return result;
  }, [analysis]);

  if (!analysis && !loading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-info/5 py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              🤖
            </span>
            Análisis con IA
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {!analysis && loading ? (
            <div className="flex items-center gap-3 text-muted-foreground py-10 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Generando análisis con IA...</span>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sections.map((section, i) => (
                <SectionCard
                  key={i}
                  section={section}
                  index={i}
                  defaultExpanded={i < 2}
                />
              ))}
              {loading && analysis && (
                <div className="col-span-full flex justify-center py-2">
                  <span className="inline-block w-2 h-5 bg-primary animate-pulse rounded-sm" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
