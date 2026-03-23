import { useState, useCallback } from "react";
import { MoodleCourse, CourseOverviewData, searchCourses, getCourseOverviewData, streamCourseOverviewAnalysis, isTokenError } from "@/lib/moodle-api";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { toast } from "sonner";

export function useCourseAnalytics() {
  const { isConnected, config, disconnect } = useMoodleConnection();
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<MoodleCourse | null>(null);
  const [courseData, setCourseData] = useState<CourseOverviewData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTokenError = useCallback((e: any) => {
    if (e.message?.startsWith("TOKEN_INVALID")) {
      toast.error("Token inválido o expirado. Reconectá con un nuevo token.");
      disconnect();
      return true;
    }
    return false;
  }, [disconnect]);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) return;
    const saved = localStorage.getItem("moodle-config");
    if (!saved) return;
    const cfg = JSON.parse(saved);
    setSearchLoading(true);
    setError(null);
    try {
      const results = await searchCourses(cfg, term);
      setCourses(results);
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
      setCourses([]);
    } finally {
      setSearchLoading(false);
    }
  }, [handleTokenError]);

  const selectCourse = useCallback((course: MoodleCourse) => {
    setSelectedCourse(course);
    setCourseData(null);
    setAnalysis("");
    setError(null);
  }, []);

  const fetchCourseData = useCallback(async () => {
    if (!selectedCourse) return;
    setDataLoading(true);
    setError(null);
    setAnalysis("");
    setCourseData(null);

    const saved = localStorage.getItem("moodle-config");
    if (!saved) return;
    const cfg = JSON.parse(saved);

    try {
      const data = await getCourseOverviewData(cfg, selectedCourse.id);
      setCourseData(data);
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
    } finally {
      setDataLoading(false);
    }
  }, [selectedCourse, handleTokenError]);

  const analyze = useCallback(async () => {
    if (!courseData || !selectedCourse) return;
    setAnalysisLoading(true);
    setAnalysis("");
    setError(null);

    try {
      await streamCourseOverviewAnalysis({
        courseName: selectedCourse.fullname,
        courseData,
        onDelta: (text) => setAnalysis((prev) => prev + text),
        onDone: () => setAnalysisLoading(false),
        onError: (err) => {
          setError(err);
          setAnalysisLoading(false);
        },
      });
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
      setAnalysisLoading(false);
    }
  }, [courseData, selectedCourse, handleTokenError]);

  return {
    config,
    isConnected,
    courses,
    searchLoading,
    search,
    selectedCourse,
    selectCourse,
    fetchCourseData,
    courseData,
    dataLoading,
    analysis,
    analysisLoading,
    analyze,
    error,
    setError,
  };
}
