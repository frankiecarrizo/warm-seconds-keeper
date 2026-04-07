import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GripVertical, BookOpen } from "lucide-react";

interface Props {
  courses: any[];
  summaryMap: Map<number, any>;
  formatDate: (ts: number) => string;
}

export function AllCoursesWidget({ courses, summaryMap, formatDate }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" data-swapy-handle />
          <BookOpen className="h-4 w-4 text-primary" />
          Todos los Cursos ({courses.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-card z-10">Curso</TableHead>
                <TableHead className="sticky top-0 bg-card z-10 text-center">Estudiantes</TableHead>
                <TableHead className="sticky top-0 bg-card z-10 text-center">Docentes</TableHead>
                <TableHead className="sticky top-0 bg-card z-10 text-center">Finalizaron</TableHead>
                <TableHead className="sticky top-0 bg-card z-10 text-center">% Final.</TableHead>
                <TableHead className="sticky top-0 bg-card z-10 text-center">Sin ingreso</TableHead>
                <TableHead className="sticky top-0 bg-card z-10 text-center">Inicio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course: any) => {
                const s = summaryMap.get(course.id);
                const compPct = s?.avgCompletionPercentage ?? (s && s.checkedStudents > 0 ? Math.round((s.completed / s.checkedStudents) * 100) : null);
                return (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate max-w-[250px]">{course.fullname}</p>
                        <p className="text-xs text-muted-foreground">{course.shortname}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {s ? <Badge variant="secondary">{s.totalStudents}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {s ? <span className="text-sm text-muted-foreground">{s.totalTeachers}</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {s ? <span className="text-sm font-medium text-success">{s.completed}</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {compPct !== null ? (
                        <Badge variant="outline" className={compPct >= 70 ? "border-success text-success" : compPct >= 40 ? "border-warning text-warning" : "border-destructive text-destructive"}>
                          {compPct}%
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {s ? <span className={`text-sm ${s.neverAccessed > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>{s.neverAccessed}</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {formatDate(course.startdate)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
