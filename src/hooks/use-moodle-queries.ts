import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSiteInfo,
  getAllCourses,
  getCategories,
  getUsersSummary,
  getCoursesEnrollmentSummary,
  getLoginLogs,
  MoodleConfig,
  SiteInfo,
  BasicCourse,
  MoodleCategory,
  CourseEnrollmentSummary,
} from "@/lib/moodle-api";
import { cacheSiteInfo } from "@/lib/export-utils";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { toast } from "sonner";
import { useState, useCallback, useEffect } from "react";

export interface LoginLogEntry {
  timecreated: number;
  userid: number;
}

function getMoodleConfig(): MoodleConfig | null {
  const saved = localStorage.getItem("moodle-config");
  if (!saved) return null;
  return JSON.parse(saved);
}

// ─── Base data: siteInfo + courses + categories + usersSummary ───
export function useGeneralBaseData(enabled: boolean) {
  const { disconnect } = useMoodleConnection();

  return useQuery({
    queryKey: ["moodle", "general-base"],
    queryFn: async () => {
      const cfg = getMoodleConfig();
      if (!cfg) throw new Error("No config");

      const [siteInfo, courses, categories, usersSummary] = await Promise.all([
        getSiteInfo(cfg).catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.warn("getSiteInfo failed:", e.message);
          return null;
        }),
        getAllCourses(cfg).catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.warn("getAllCourses failed:", e.message);
          return [] as BasicCourse[];
        }),
        getCategories(cfg).catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.warn("getCategories failed:", e.message);
          return [] as MoodleCategory[];
        }),
        getUsersSummary(cfg).catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          return null;
        }),
      ]);

      if (!siteInfo && courses.length === 0) {
        throw new Error("ACCESS_DENIED: El token no tiene permisos suficientes.");
      }

      const fallbackSiteInfo: SiteInfo = siteInfo || {
        sitename: cfg.moodleUrl, siteurl: cfg.moodleUrl,
        username: "", fullname: "", userid: 0, release: "", version: "",
      };

      const filteredCourses = courses.filter((c: any) => c.id !== 1);
      cacheSiteInfo(fallbackSiteInfo);

      return {
        siteInfo: fallbackSiteInfo,
        courses: filteredCourses,
        categories,
        usersSummary,
      };
    },
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error?.message?.startsWith("TOKEN_INVALID")) return false;
      return failureCount < 1;
    },
    throwOnError: false,
    meta: { disconnect },
  });
}


// ─── Enrollment summaries (batched, with progress) ───
export function useEnrollmentData(courseIds: number[], enabled: boolean) {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const query = useQuery({
    queryKey: ["moodle", "enrollment", courseIds.length],
    queryFn: async () => {
      const cfg = getMoodleConfig();
      if (!cfg) throw new Error("No config");

      const batchSize = 20;
      const allSummaries: CourseEnrollmentSummary[] = [];
      const totalBatches = Math.ceil(courseIds.length / batchSize);
      let completedBatches = 0;
      setProgress({ completed: 0, total: totalBatches });

      for (let i = 0; i < courseIds.length; i += batchSize) {
        const batch = courseIds.slice(i, i + batchSize);
        try {
          const summaries = await getCoursesEnrollmentSummary(cfg, batch);
          allSummaries.push(...summaries);
        } catch (e: any) {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.error("Batch enrollment error:", e);
        }
        completedBatches++;
        setProgress({ completed: completedBatches, total: totalBatches });
      }

      return allSummaries;
    },
    enabled: enabled && courseIds.length > 0,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    throwOnError: false,
  });

  return { ...query, progress };
}

// ─── Login logs ───
export function useLoginLogs(enabled: boolean) {
  return useQuery({
    queryKey: ["moodle", "login-logs"],
    queryFn: async () => {
      const cfg = getMoodleConfig();
      if (!cfg) throw new Error("No config");
      const logs = await getLoginLogs(cfg);
      return (logs || []) as LoginLogEntry[];
    },
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    throwOnError: false,
  });
}

// ─── Invalidation hook ───
export function useInvalidateGeneral() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["moodle", "general-base"] });
    queryClient.invalidateQueries({ queryKey: ["moodle", "enrollment"] });
    queryClient.invalidateQueries({ queryKey: ["moodle", "login-logs"] });
  }, [queryClient]);
}
