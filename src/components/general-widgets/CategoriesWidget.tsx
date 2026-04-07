import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, FolderTree } from "lucide-react";

const COLORS = [
  "hsl(172, 66%, 50%)", "hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)", "hsl(152, 60%, 42%)",
];

interface Props {
  data: { name: string; cursos: number; subcategories: { name: string; cursos: number }[] }[];
}

export function CategoriesWidget({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <FolderTree className="h-4 w-4 text-accent-foreground" />
          Cursos por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((cat, idx) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                <Badge variant="secondary" className="text-xs">{cat.cursos} cursos</Badge>
              </div>
              <div className="flex gap-1 flex-wrap">
                {cat.subcategories.map((sub) => {
                  const pct = Math.max((sub.cursos / cat.cursos) * 100, 4);
                  const colorIdx = idx % COLORS.length;
                  return (
                    <div key={sub.name} className="relative group rounded-md overflow-hidden"
                      style={{ width: `${pct}%`, minWidth: 40, height: 32, backgroundColor: COLORS[colorIdx], opacity: sub.name === cat.name ? 1 : 0.7 }}>
                      <div className="absolute inset-0 flex items-center justify-center px-1">
                        <span className="text-[10px] font-medium text-white truncate">{sub.cursos}</span>
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 whitespace-nowrap">
                        <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border">
                          {sub.name}: {sub.cursos} cursos
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {cat.subcategories.length > 1 && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-1">
                  {cat.subcategories.map((sub) => (
                    <span key={sub.name} className="text-[10px] text-muted-foreground">{sub.name} ({sub.cursos})</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
