import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSiteInfo,
  getAllCourses,
  getCategories,
  getUsersSummary,
  getCoursesEnrollmentSummary,
  getLoginLogs,
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

// ─── Base data: siteInfo + courses + categories + usersSummary ───
export function useGeneralBaseData(enabled: boolean) {
  const { disconnect } = useMoodleConnection();

  const query = useQuery({
    queryKey: ["moodle", "general-base"],
    queryFn: async () => {
      const [siteInfo, courses, categories, usersSummary] = await Promise.all([
        getSiteInfo().catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.warn("getSiteInfo failed:", e.message);
          return null;
        }),
        getAllCourses().catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.warn("getAllCourses failed:", e.message);
          return [] as BasicCourse[];
        }),
        getCategories().catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          console.warn("getCategories failed:", e.message);
          return [] as MoodleCategory[];
        }),
        getUsersSummary().catch((e: any) => {
          if (e.message?.startsWith("TOKEN_INVALID")) throw e;
          return null;
        }),
      ]);

      if (!siteInfo && courses.length === 0) {
        throw new Error("ACCESS_DENIED: El token no tiene permisos suficientes.");
      }

      const fallbackSiteInfo: SiteInfo = siteInfo || {
        sitename: "", siteurl: "",
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

  // Auto-disconnect on token errors
  useEffect(() => {
    if (query.error?.message?.startsWith("TOKEN_INVALID")) {
      toast.error("El token de Moodle es inválido o expiró. Por favor, reconectá.");
      disconnect();
    }
  }, [query.error, disconnect]);

  return query;
}


// ─── Enrollment summaries (batched, with progress) ───
export function useEnrollmentData(courseIds: number[], enabled: boolean) {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const query = useQuery({
    queryKey: ["moodle", "enrollment", courseIds.length],
    queryFn: async () => {
      const batchSize = 20;
      const allSummaries: CourseEnrollmentSummary[] = [];
      const totalBatches = Math.ceil(courseIds.length / batchSize);
      let completedBatches = 0;
      setProgress({ completed: 0, total: totalBatches });

      for (let i = 0; i < courseIds.length; i += batchSize) {
        const batch = courseIds.slice(i, i + batchSize);
        try {
          const summaries = await getCoursesEnrollmentSummary(batch);
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
      const logs = await getLoginLogs();
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
