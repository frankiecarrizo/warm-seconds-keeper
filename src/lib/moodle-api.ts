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

export interface MoodleCourseData {
  id: number;
  shortname: string;
  fullname: string;
  progress: number | null;
  completed: boolean;
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