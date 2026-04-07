import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, GraduationCap, AlertTriangle, TrendingUp, Lightbulb, Target, Users, Clock, BarChart3, Shield, Award, Brain, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, useCallback, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";
import useEmblaCarousel from "embla-carousel-react";

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

function extractMetrics(text: string): { value: string; label: string }[] {
  const metrics: { value: string; label: string }[] = [];
  const patterns = [/(\d+(?:\.\d+)?%)/g, /(\d+(?:\.\d+)?\/\d+)/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const idx = match.index;
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

function extractChartData(items: string[]): { name: string; value: number }[] | null {
  const data: { name: string; value: number }[] = [];
  for (const item of items) {
    const numMatch = item.match(/(\d+(?:\.\d+)?)\s*%/) || item.match(/:\s*(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const label = item.replace(/\*\*/g, "").replace(/^[-*•]\s*/, "").split(/[:–—]/)[0].trim().substring(0, 20);
      data.push({ name: label, value: parseFloat(numMatch[1]) });
    }
  }
  return data.length >= 3 ? data.slice(0, 8) : null;
}

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(172, 60%, 50%)",
  "hsl(220, 60%, 55%)", "hsl(280, 50%, 55%)",
];

function MiniBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-36 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval={0} angle={-20} textAnchor="end" height={35} />
          <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" width={30} />
          <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
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
            {data.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
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

function FullSectionCard({ section }: { section: ParsedSection }) {
  const listItems = section.lines.filter(l => l.startsWith("- ") || l.startsWith("* "));
  const textLines = section.lines.filter(l => !l.startsWith("- ") && !l.startsWith("* ") && l.trim() !== "" && !l.startsWith("### "));
  const subHeadings = section.lines.filter(l => l.startsWith("### "));

  return (
    <Card className="overflow-hidden border-border/50 h-full flex flex-col">
      <CardHeader className="py-2 px-4 border-b border-border/30">
        <div className="flex items-center justify-center gap-2">
          <span className={`flex items-center justify-center h-6 w-6 rounded-md ${section.style.bgColor} ${section.style.color}`}>
            {section.style.icon}
          </span>
          <CardTitle className="text-xs font-semibold text-foreground text-center">
            {section.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 pt-2 pb-3 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {textLines.map((line, i) => (
            <p key={`t-${i}`} className="text-xs text-muted-foreground leading-relaxed">
              {renderInlineFormatting(line)}
            </p>
          ))}
          {subHeadings.map((h, i) => (
            <h4 key={`h-${i}`} className="text-[11px] font-semibold text-foreground mt-1.5 mb-0.5">
              {renderInlineFormatting(h.replace(/^###\s*/, ""))}
            </h4>
          ))}
          {listItems.map((item, i) => (
            <div key={`l-${i}`} className="flex gap-1.5 text-xs text-muted-foreground leading-relaxed">
              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
              <span>{renderInlineFormatting(item.replace(/^[-*]\s*/, ""))}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AIAnalysis({ analysis, loading }: AIAnalysisProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false, slidesToScroll: 1 });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

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

  const totalPages = Math.ceil(sections.length / 4);

  if (!analysis && !loading) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-info/5 py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
                🤖
              </span>
              Análisis con IA
              {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </CardTitle>
            {sections.length > 4 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {currentSlide + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canScrollPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canScrollNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {!analysis && loading ? (
            <div className="flex items-center gap-3 text-muted-foreground py-10 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Generando análisis con IA...</span>
            </div>
          ) : (
            <>
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex -ml-3">
                  {/* Group sections in pairs */}
                  {Array.from({ length: totalPages }).map((_, pageIdx) => {
                    const group = sections.slice(pageIdx * 4, pageIdx * 4 + 4);
                    return (
                      <div
                        key={pageIdx}
                        className="flex-[0_0_100%] min-w-0 pl-3"
                      >
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 h-full items-stretch">
                          {group.map((section, i) => (
                            <div key={i} className="min-h-[120px]">
                              <FullSectionCard section={section} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Dot indicators */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentSlide
                          ? "w-6 bg-primary"
                          : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                    />
                  ))}
                </div>
              )}
              {loading && analysis && (
                <div className="flex justify-center py-2 mt-2">
                  <span className="inline-block w-2 h-5 bg-primary animate-pulse rounded-sm" />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
