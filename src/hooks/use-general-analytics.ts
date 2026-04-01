import { useState, useCallback, useRef } from "react";
import {
  SiteInfo,
  BasicCourse,
  MoodleCategory,
  CourseEnrollmentSummary,
  UsersSummary,
  getSiteInfo,
  getAllCourses,
  getCategories,
  getCoursesEnrollmentSummary,
  getUsersSummary,
  getLoginLogs,
  isTokenError,
} from "@/lib/moodle-api";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { toast } from "sonner";

export interface LoginLogEntry {
  timecreated: number;
  userid: number;
}

export interface GeneralData {
  siteInfo: SiteInfo;
  courses: BasicCourse[];
  categories: MoodleCategory[];
  enrollmentSummaries: CourseEnrollmentSummary[];
  usersSummary: UsersSummary | null;
  loginLogs: LoginLogEntry[];
}

// Module-level cache so data survives tab switches
let cachedData: GeneralData | null = null;
let cachedForUrl: string | null = null;

export function useGeneralAnalytics() {
  const { isConnected, disconnect } = useMoodleConnection();

  // Initialize from cache if available and same Moodle URL
  const savedCfg = localStorage.getItem("moodle-config");
  const currentUrl = savedCfg ? JSON.parse(savedCfg).moodleUrl : null;
  const initialData = (cachedData && cachedForUrl === currentUrl) ? cachedData : null;

  const [data, setData] = useState<GeneralData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleTokenError = useCallback((e: any): boolean => {
    if (e.message?.startsWith("TOKEN_INVALID")) {
      toast.error("Token inválido o expirado. Reconectá con un nuevo token.");
      disconnect();
      return true;
    }
    if (e.message?.startsWith("ACCESS_DENIED")) {
      const message = "El token no tiene permisos suficientes para consultar cursos, categorías o datos generales en Moodle.";
      toast.error(message);
      setError(message);
      return true;
    }
    return false;
  }, [disconnect]);

  const fetchGeneralData = useCallback(async () => {
    const saved = localStorage.getItem("moodle-config");
    if (!saved) return;
    const cfg = JSON.parse(saved);

    setLoading(true);
    setError(null);
    try {
      const [siteInfo, courses, categories, usersSummary] = await Promise.all([
        getSiteInfo(cfg).catch((e: any) => {
          console.warn("getSiteInfo failed:", e.message);
          return null;
        }),
        getAllCourses(cfg).catch((e: any) => {
          console.warn("getAllCourses failed:", e.message);
          return [] as BasicCourse[];
        }),
        getCategories(cfg).catch((e: any) => {
          console.warn("getCategories failed:", e.message);
          return [] as MoodleCategory[];
        }),
        getUsersSummary(cfg).catch(() => null),
      ]);

      if (!siteInfo && courses.length === 0) {
        throw new Error("ACCESS_DENIED: El token no tiene permisos suficientes. Verificá que el usuario del token tenga rol de administrador o los permisos necesarios en Moodle.");
      }

      const fallbackSiteInfo: SiteInfo = siteInfo || {
        sitename: cfg.moodleUrl, siteurl: cfg.moodleUrl,
        username: "", fullname: "", userid: 0, release: "", version: "",
      };

      // Filter out site-level course (id=1)
      const filteredCourses = courses.filter((c: any) => c.id !== 1);

      setData({ siteInfo: fallbackSiteInfo, courses: filteredCourses, categories, enrollmentSummaries: [], usersSummary, loginLogs: [] });

      // Fetch login logs in parallel with enrollment
      getLoginLogs(cfg).then((logs: LoginLogEntry[]) => {
        setData((prev) => prev ? { ...prev, loginLogs: logs || [] } : prev);
      }).catch((e: any) => {
        console.warn("Login logs fetch failed:", e.message);
      });

      setEnrollmentLoading(true);
      const courseIds = filteredCourses.map((c: any) => c.id);
      const batchSize = 20;
      const allSummaries: CourseEnrollmentSummary[] = [];
      let completedBatches = 0;
      const totalBatches = Math.ceil(courseIds.length / batchSize);

      for (let i = 0; i < courseIds.length; i += batchSize) {
        const batch = courseIds.slice(i, i + batchSize);
        try {
          const summaries = await getCoursesEnrollmentSummary(cfg, batch);
          allSummaries.push(...summaries);
          completedBatches++;
          // Only update progress counter, not summaries — avoid chart re-renders
          setEnrollmentProgress({ completed: completedBatches, total: totalBatches });
        } catch (e: any) {
          if (handleTokenError(e)) return;
          console.error("Batch enrollment error:", e);
          completedBatches++;
        }
      }

      // Single state update with all summaries at once
      setData((prev) =>
        prev ? { ...prev, enrollmentSummaries: allSummaries } : prev
      );
      setEnrollmentLoading(false);
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [disconnect, setError]);

  return {
    isConnected,
    data,
    loading,
    enrollmentLoading,
    enrollmentProgress,
    error,
    setError,
    fetchGeneralData,
  };
}
