import { FunctionsHttpError } from "@supabase/supabase-js";

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

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moodle-proxy`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

export interface CourseTeacher {
  id: number;
  fullname: string;
  roles: string[];
}

export interface CourseOverviewData {
  totalEnrolled: number;
  totalStudents: number;
  totalTeachers: number;
  neverAccessed: number;
  students: CourseStudentData[];
  allStudentsBasic: StudentBasicData[];
  quizzes: { id: number; name: string }[];
  teachers?: CourseTeacher[];
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

const getSessionBlob = () => localStorage.getItem("moodle-session") || "";

export const callProxy = async (
  action: string,
  params?: Record<string, any>
) => {
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      apikey: API_KEY,
      "x-moodle-session": getSessionBlob(),
    },
    body: JSON.stringify({ action, params }),
  });

  const data = await response.json().catch(() => null);
  const resolvedError = data?.error;

  if (resolvedError) {
    if (isTokenError(resolvedError)) {
      throw new Error("TOKEN_INVALID: El token de Moodle es inválido o expiró.");
    }
    if (isAccessError(resolvedError)) {
      throw new Error("ACCESS_DENIED: El token no tiene permisos.");
    }
    if (resolvedError.startsWith("SESSION_")) {
      throw new Error(resolvedError);
    }
    throw new Error(resolvedError);
  }

  return data;
};

export const connectMoodle = async (moodleUrl: string, moodleToken: string) => {
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      apikey: API_KEY,
    },
    body: JSON.stringify({ action: "connect", moodleUrl, moodleToken }),
  });
  const data = await response.json();
  if (data?.error) throw new Error(data.error);
  // Store encrypted session blob
  if (data?.session) {
    localStorage.setItem("moodle-session", data.session);
  }
  return data;
};

export const disconnectMoodle = async () => {
  localStorage.removeItem("moodle-session");
  return { success: true };
};

export const searchUsers = async (search: string) => {
  return callProxy("search_users", { search });
};

export const searchCourses = async (search: string) => {
  const data = await callProxy("search_courses", { search });
  return (data.courses || []).map((c: any) => ({
    id: c.id,
    shortname: c.shortname,
    fullname: c.fullname,
    categoryid: c.categoryid,
    summary: c.summary || "",
    enrolledusercount: c.enrolledusercount || 0,
  }));
};

export const getCourseOverviewData = async (courseId: number) => {
  return callProxy("get_course_overview_data", { courseId });
};

export const getUserFullData = async (userId: number) => {
  return callProxy("get_user_full_data", { userId });
};

export const getUsersSummary = async () => {
  return callProxy("get_users_summary");
};

export const getSiteInfo = async () => {
  return callProxy("get_site_info");
};

export const getGeneralData = async () => {
  return callProxy("get_general_data");
};

export const getQuizAttemptReview = async (attemptId: number) => {
  return callProxy("get_quiz_attempt_review", { attemptId });
};

export const getCourseContents = async (courseId: number) => {
  return callProxy("get_course_contents", { courseId });
};

export const getCategories = async () => {
  return callProxy("get_categories");
};

export const getAllCourses = async () => {
  return callProxy("get_all_courses");
};

export const getCoursesEnrollmentSummary = async (courseIds: number[]) => {
  return callProxy("get_courses_enrollment_summary", { courseIds });
};

export const getLoginLogs = async () => {
  return callProxy("get_login_logs");
};

export interface ActivityCompletionReport {
  activities: { cmid: number; name: string; modname: string }[];
  students: {
    id: number;
    fullname: string;
    email: string;
    completions: Record<number, number>; // cmid -> state (0,1,2,3)
  }[];
}

export interface GraderReport {
  gradeItems: { id: number; itemname: string; grademax: number }[];
  students: {
    id: number;
    fullname: string;
    email: string;
    grades: Record<number, { grade: number | null; grademax: number }>;
    courseTotal: number | null;
    courseTotalMax: number;
  }[];
}

export const getActivityCompletionReport = async (courseId: number): Promise<ActivityCompletionReport> => {
  return callProxy("get_activity_completion_report", { courseId });
};

export const getGraderReport = async (courseId: number): Promise<GraderReport> => {
  return callProxy("get_grader_report", { courseId });
};

// Keep MoodleConfig as a lightweight type for display-only usage
export interface MoodleConfig {
  moodleUrl: string;
}

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
        Authorization: `Bearer ${API_KEY}`,
        apikey: API_KEY,
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