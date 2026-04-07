import { useState, useCallback } from "react";
import { MoodleCourse, CourseOverviewData, searchCourses, getCourseOverviewData, streamCourseOverviewAnalysis, isTokenError } from "@/lib/moodle-api";
import { flattenCourseDataForAI } from "@/lib/ai-data-flatten";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { toast } from "sonner";

export function useCourseAnalytics() {
  const { isConnected, disconnect } = useMoodleConnection();
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
    setSearchLoading(true);
    setError(null);
    try {
      const results = await searchCourses(term);
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
    try {
      const data = await getCourseOverviewData(selectedCourse.id);
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
      // Send flattened data to reduce tokens and latency
      const flattenedData = flattenCourseDataForAI(selectedCourse.fullname, courseData);
      await streamCourseOverviewAnalysis({
        courseName: selectedCourse.fullname,
        courseData: flattenedData as any,
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
