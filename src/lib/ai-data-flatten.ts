/**
 * Flatten complex Moodle data into minimal summaries for AI analysis.
 * Reduces token usage and processing time significantly.
 */

import type { UserFullData, CourseOverviewData } from "@/lib/moodle-api";

/** Flatten user data for AI — plain text summary instead of raw JSON */
export function flattenUserDataForAI(userData: UserFullData): Record<string, any> {
  const courses = userData.courses.map((c) => {
    const courseGrade = c.grades?.find((g: any) => g.itemtype === "course");
    const gradePct = courseGrade && courseGrade.grademax > 0
      ? Math.round((courseGrade.graderaw ?? 0) / courseGrade.grademax * 100)
      : null;

    const quizSummary = (c.quizAttempts || [])
      .filter((q) => q.attempts.length > 0)
      .map((q) => ({
        name: q.quizName,
        attempts: q.attempts.length,
        bestGrade: Math.max(...q.attempts.map((a: any) => a.sumgrades || 0)),
      }));

    return {
      name: c.fullname,
      completed: c.completed,
      completionPct: c.completionPercentage ?? (c.completed ? 100 : 0),
      gradePct,
      lastAccess: c.lastaccess ? new Date(c.lastaccess * 1000).toISOString().split("T")[0] : null,
      quizzes: quizSummary.length > 0 ? quizSummary : undefined,
      certificates: c.certificates?.length || 0,
    };
  });

  const completedCount = courses.filter((c) => c.completed).length;
  const avgCompletion = Math.round(courses.reduce((s, c) => s + c.completionPct, 0) / (courses.length || 1));
  const gradesWithData = courses.filter((c) => c.gradePct !== null);
  const avgGrade = gradesWithData.length > 0
    ? Math.round(gradesWithData.reduce((s, c) => s + c.gradePct!, 0) / gradesWithData.length)
    : null;

  return {
    student: {
      name: userData.user.fullname,
      email: userData.user.email,
      firstAccess: userData.user.firstaccess
        ? new Date(userData.user.firstaccess * 1000).toISOString().split("T")[0]
        : null,
      lastAccess: userData.user.lastaccess
        ? new Date(userData.user.lastaccess * 1000).toISOString().split("T")[0]
        : null,
      suspended: userData.user.suspended,
    },
    summary: {
      totalCourses: courses.length,
      completedCourses: completedCount,
      avgCompletionPct: avgCompletion,
      avgGradePct: avgGrade,
      totalQuizzes: courses.reduce((s, c) => s + (c.quizzes?.length || 0), 0),
      totalCertificates: courses.reduce((s, c) => s + c.certificates, 0),
    },
    courses,
  };
}

/** Flatten course overview data for AI */
export function flattenCourseDataForAI(
  courseName: string,
  data: CourseOverviewData
): Record<string, any> {
  const allStudents = data.allStudentsBasic || [];
  const completedCount = allStudents.filter((s) => s.completed).length;
  const neverAccessed = allStudents.filter((s) => !s.lastaccess).length;

  const graded = data.students.filter((s) => s.gradeRaw !== null && s.gradeMax > 0);
  const avgGrade = graded.length > 0
    ? Math.round(graded.reduce((s, st) => s + (st.gradeRaw! / st.gradeMax) * 100, 0) / graded.length)
    : null;

  // Grade distribution buckets
  const gradeBuckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
  graded.forEach((s) => {
    const pct = (s.gradeRaw! / s.gradeMax) * 100;
    const idx = pct <= 20 ? 0 : pct <= 40 ? 1 : pct <= 60 ? 2 : pct <= 80 ? 3 : 4;
    gradeBuckets[idx]++;
  });

  // Quiz summary
  const quizSummary = data.quizzes.map((quiz) => {
    const scores: number[] = [];
    data.students.forEach((s) => {
      const qa = s.quizAttempts?.find((q) => q.quizId === quiz.id);
      if (qa && qa.attempts.length > 0) {
        const best = Math.max(...qa.attempts.map((a: any) => a.sumgrades || 0));
        scores.push(best);
      }
    });
    return {
      name: quiz.name,
      participants: scores.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10 : 0,
    };
  });

  return {
    courseName,
    stats: {
      totalEnrolled: data.totalEnrolled,
      totalStudents: data.totalStudents,
      totalTeachers: data.totalTeachers,
      completedCount,
      completionPct: data.totalStudents > 0 ? Math.round((completedCount / data.totalStudents) * 100) : 0,
      neverAccessed,
      neverAccessedPct: data.totalStudents > 0 ? Math.round((neverAccessed / data.totalStudents) * 100) : 0,
      avgGrade,
      gradeDistribution: { "0-20%": gradeBuckets[0], "21-40%": gradeBuckets[1], "41-60%": gradeBuckets[2], "61-80%": gradeBuckets[3], "81-100%": gradeBuckets[4] },
    },
    quizzes: quizSummary,
    // Only send top/bottom 5 students by grade for patterns
    topStudents: graded.sort((a, b) => (b.gradeRaw! / b.gradeMax) - (a.gradeRaw! / a.gradeMax))
      .slice(0, 5)
      .map((s) => ({ name: s.fullname, gradePct: Math.round((s.gradeRaw! / s.gradeMax) * 100) })),
    bottomStudents: graded.sort((a, b) => (a.gradeRaw! / a.gradeMax) - (b.gradeRaw! / b.gradeMax))
      .slice(0, 5)
      .map((s) => ({ name: s.fullname, gradePct: Math.round((s.gradeRaw! / s.gradeMax) * 100) })),
  };
}
