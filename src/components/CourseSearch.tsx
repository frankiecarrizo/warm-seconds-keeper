import { useState } from "react";
import { Search, BookOpen, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoodleCourse } from "@/lib/moodle-api";
import { motion } from "framer-motion";

interface CourseSearchProps {
  courses: MoodleCourse[];
  loading: boolean;
  onSearch: (term: string) => void;
  onSelectCourse: (course: MoodleCourse) => void;
  selectedCourse: MoodleCourse | null;
}

export function CourseSearch({ courses, loading, onSearch, onSelectCourse, selectedCourse }: CourseSearchProps) {
  const [term, setTerm] = useState("");

  const handleSearch = () => {
    if (term.trim()) onSearch(term.trim());
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar curso por nombre..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !term.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>

        {courses.length > 0 && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {courses.map((course) => (
              <motion.button
                key={course.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => onSelectCourse(course)}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
                  selectedCourse?.id === course.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{course.fullname}</p>
                  <p className="text-xs text-muted-foreground truncate">{course.shortname}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}