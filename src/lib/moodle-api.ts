import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface MoodleUser {
  id: number;
  username: string;
  fullname: string;
  email: string;
  firstaccess: number;
  lastaccess: number;
  profileimageurl?: string;
  suspended: boolean;
}

export interface MoodleCertificate {
  id: number;
  cmid: number;
  name: string;
  type: "customcert" | "certificate";
  courseId: number;
  courseName: string;
  issued: boolean | null;
  issueDate?: number;
  code?: string | null;
  downloadUrl: string;
}

export interface MoodleCourseData {
  id: number;
  shortname: string;
  fullname: string;
  progress: number | null;
  completed: boolean;
  completionPercentage: number;
  completionMethod: "criteria" | "activities" | "none";
  startdate: number;
  enddate: number;
  lastaccess: number | null;
  grades: any[] | null;
  completion: any | null;
  quizAttempts: {
    quizName: string;
    quizId: number;
    attempts: any[];
  }[];
  roles: string[];
  certificates?: MoodleCertificate[];
}

export interface UserFullData {
  user: MoodleUser;
  courses: MoodleCourseData[];
  totalCourses: number;
}

export interface MoodleConfig {
  moodleUrl: string;
  moodleToken: string;
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  categoryid: number;
  summary: string;
  enrolledusercount: number;
}

export interface CourseStudentData {
  id: number;
  fullname: string;
  email: string;
  lastaccess: number;
  completed: boolean;
  completionPercentage: number;
  completionMethod: "criteria" | "activities" | "none";
  gradeRaw: number | null;
  gradeMax: number;
  gradeFormatted: string;
  gradeItems: any[];
  quizAttempts: { quizName: string; quizId: number; attempts: any[] }[];
}

export interface StudentBasicData {
  id: number;
  fullname: string;
  email: string;
  lastaccess: number;
  completed: boolean;
}

export interface CourseOverviewData {
  totalEnrolled: number;
  totalStudents: number;
  totalTeachers: number;
  neverAccessed: number;
  students: CourseStudentData[];
  allStudentsBasic: StudentBasicData[];
  quizzes: { id: number; name: string }[];
}

const TOKEN_ERROR_PATTERNS = [
  "ficha (token) no válida",
  "invalid token",
  "token no encontrada",
  "token not found",
];

const ACCESS_ERROR_PATTERNS = [
  "accessexception",
  "control de acceso",
  "access exception",
];

export const isTokenError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return TOKEN_ERROR_PATTERNS.some((p) => lower.includes(p));
};

export const isAccessError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return ACCESS_ERROR_PATTERNS.some((p) => lower.includes(p));
};

const callProxy = async (
  config: MoodleConfig,
  action: string,
  params?: Record<string, any>
) => {
  const { data, error } = await supabase.functions.invoke("moodle-proxy", {
    body: { ...config, action, params },
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  let resolvedError: string | undefined;

  if (data?.error) {
    resolvedError = data.error;
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const errorBody = await error.context.json();
      resolvedError = errorBody?.error || error.message;
    } catch {
      resolvedError = error.message;
    }
  } else if (error) {
    resolvedError = error.message;
  }

  if (resolvedError) {
    if (isTokenError(resolvedError)) {
      throw new Error("TOKEN_INVALID: El token de Moodle es inválido o expiró.");
    }
    if (isAccessError(resolvedError)) {
      throw new Error("ACCESS_DENIED: El token no tiene permisos.");
    }
    throw new Error(resolvedError);
  }

  return data;
};

export const searchUsers = async (config: MoodleConfig, search: string) => {
  return callProxy(config, "search_users", { search });
};

export const searchCourses = async (config: MoodleConfig, search: string) => {
  const data = await callProxy(config, "search_courses", { search });
  return (data.courses || []).map((c: any) => ({
    id: c.id,
    shortname: c.shortname,
    fullname: c.fullname,
    categoryid: c.categoryid,
    summary: c.summary || "",
    enrolledusercount: c.enrolledusercount || 0,
  }));
};

export const getCourseOverviewData = async (config: MoodleConfig, courseId: number) => {
  return callProxy(config, "get_course_overview_data", { courseId });
};

export const getUserFullData = async (config: MoodleConfig, userId: number) => {
  return callProxy(config, "get_user_full_data", { userId });
};

export const getUsersSummary = async (config: MoodleConfig) => {
  return callProxy(config, "get_users_summary");
};

export const getSiteInfo = async (config: MoodleConfig) => {
  return callProxy(config, "get_site_info");
};

export const getQuizAttemptReview = async (
  config: MoodleConfig,
  attemptId: number
) => {
  return callProxy(config, "get_quiz_attempt_review", { attemptId });
};

export const getCourseContents = async (
  config: MoodleConfig,
  courseId: number
) => {
  return callProxy(config, "get_course_contents", { courseId });
};

export const getCategories = async (config: MoodleConfig) => {
  return callProxy(config, "get_categories");
};

export const getAllCourses = async (config: MoodleConfig) => {
  return callProxy(config, "get_all_courses");
};

export const getCoursesEnrollmentSummary = async (
  config: MoodleConfig,
  courseIds: number[]
) => {
  return callProxy(config, "get_courses_enrollment_summary", { courseIds });
};

export const getLoginLogs = async (config: MoodleConfig) => {
  return callProxy(config, "get_login_logs");
};

// ═══════════════════════════════════════════════════════════════
// Missing types referenced by hooks/components
// ═══════════════════════════════════════════════════════════════

export interface SiteInfo {
  sitename: string;
  siteurl: string;
  username: string;
  fullname: string;
  userid: number;
  release: string;
  version: string;
}

export interface BasicCourse {
  id: number;
  shortname: string;
  fullname: string;
  categoryid: number;
  summary: string;
  startdate: number;
  enddate: number;
}

export interface MoodleCategory {
  id: number;
  name: string;
  parent: number;
  coursecount: number;
}

export interface CourseEnrollmentSummary {
  courseId: number;
  totalEnrolled: number;
  totalStudents: number;
  totalTeachers: number;
  completed: number;
  checkedStudents: number;
  avgCompletionPercentage: number;
  neverAccessed: number;
}

export interface UsersSummary {
  total: number;
  active: number;
  suspended: number;
  deleted: number;
}

// ═══════════════════════════════════════════════════════════════
// Streaming AI analysis functions
// ═══════════════════════════════════════════════════════════════

interface StreamOptions {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

async function streamFromEdgeFunction(
  functionName: string,
  body: Record<string, any>,
  { onDelta, onDone, onError }: StreamOptions
) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      onError(errData.error || `HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {}
      }
    }
    onDone();
  } catch (err: any) {
    onError(err.message || "Stream error");
  }
}

export async function streamAnalysis(
  opts: { userData: UserFullData } & StreamOptions
) {
  return streamFromEdgeFunction("analyze-user", { userData: opts.userData }, opts);
}

export async function streamCourseAnalysis(
  opts: { courseName: string; quizData: any[] } & StreamOptions
) {
  return streamFromEdgeFunction(
    "analyze-course",
    { courseName: opts.courseName, quizData: opts.quizData },
    opts
  );
}

export async function streamCourseOverviewAnalysis(
  opts: { courseName: string; courseData: CourseOverviewData } & StreamOptions
) {
  return streamFromEdgeFunction(
    "analyze-course-overview",
    { courseName: opts.courseName, courseData: opts.courseData },
    opts
  );
}