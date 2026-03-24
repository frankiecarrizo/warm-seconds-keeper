import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moodleUrl, moodleToken, action, params } = await req.json();

    if (!moodleUrl || !moodleToken) {
      return new Response(
        JSON.stringify({ error: "Missing moodleUrl or moodleToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = `${moodleUrl}/webservice/rest/server.php`;

    const callMoodle = async (
      wsfunction: string,
      extraParams: Record<string, string> = {}
    ) => {
      const urlParams = new URLSearchParams({
        wstoken: moodleToken,
        wsfunction,
        moodlewsrestformat: "json",
        ...extraParams,
      });
      const response = await fetch(`${baseUrl}?${urlParams.toString()}`);
      const data = await response.json();
      if (data.exception) {
        const isAccessError =
          data.errorcode === "accessexception" ||
          (data.message || "").toLowerCase().includes("access");
        throw { message: data.message, status: isAccessError ? 403 : 500 };
      }
      return data;
    };

    let result: any;

    switch (action) {
      // ── Site info ──────────────────────────────────────────────
      case "get_site_info": {
        result = await callMoodle("core_webservice_get_site_info");
        break;
      }

      // ── Users summary ──────────────────────────────────────────
      case "get_users_summary": {
        let allUsersList: any[] = [];
        try {
          const res = await callMoodle("core_user_get_users", {
            "criteria[0][key]": "email",
            "criteria[0][value]": "%@%",
          });
          allUsersList = res.users || [];
        } catch {}

        if (allUsersList.length === 0) {
          try {
            const res = await callMoodle("core_user_get_users", {
              "criteria[0][key]": "lastname",
              "criteria[0][value]": "%",
            });
            allUsersList = res.users || [];
          } catch {}
        }

        const users = allUsersList.filter(
          (u: any) => u.id > 1 && u.username !== "guest"
        );
        result = {
          total: users.length,
          active: users.filter((u: any) => !u.suspended && !u.deleted).length,
          suspended: users.filter((u: any) => u.suspended && !u.deleted).length,
          deleted: users.filter((u: any) => u.deleted).length,
        };
        break;
      }

      // ── Search users ───────────────────────────────────────────
      case "search_users": {
        const search = params?.search || "";
        let users: any[] = [];

        // Try searching by email first, then lastname
        for (const key of ["email", "lastname", "firstname"]) {
          try {
            const res = await callMoodle("core_user_get_users", {
              "criteria[0][key]": key,
              "criteria[0][value]": `%${search}%`,
            });
            if (res.users?.length) {
              users = [...users, ...res.users];
            }
          } catch {}
        }

        // Deduplicate by id
        const seen = new Set<number>();
        const unique = users.filter((u: any) => {
          if (seen.has(u.id) || u.id <= 1 || u.username === "guest") return false;
          seen.add(u.id);
          return true;
        });

        result = unique.map((u: any) => ({
          id: u.id,
          username: u.username,
          fullname: u.fullname,
          email: u.email,
          firstaccess: u.firstaccess || 0,
          lastaccess: u.lastaccess || 0,
          profileimageurl: u.profileimageurl || "",
          suspended: !!u.suspended,
        }));
        break;
      }

      // ── Categories ─────────────────────────────────────────────
      case "get_categories": {
        result = await callMoodle("core_course_get_categories");
        break;
      }

      // ── All courses ────────────────────────────────────────────
      case "get_all_courses": {
        result = await callMoodle("core_course_get_courses");
        break;
      }

      // ── Search courses ─────────────────────────────────────────
      case "search_courses": {
        const search = params?.search || "";
        const res = await callMoodle("core_course_search_courses", {
          criterianame: "search",
          criteriavalue: search,
        });
        result = res;
        break;
      }

      // ── Course contents ────────────────────────────────────────
      case "get_course_contents": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        result = await callMoodle("core_course_get_contents", {
          courseid: String(courseId),
        });
        break;
      }

      // ── Enrolled users for a course ────────────────────────────
      case "get_enrolled_users": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        result = await callMoodle("core_enrol_get_enrolled_users", {
          courseid: String(courseId),
        });
        break;
      }

      // ── Quiz attempt review ────────────────────────────────────
      case "get_quiz_attempt_review": {
        const attemptId = params?.attemptId;
        if (!attemptId) throw { message: "Missing attemptId", status: 400 };
        result = await callMoodle("mod_quiz_get_attempt_review", {
          attemptid: String(attemptId),
        });
        break;
      }

      // ── User full data (courses + grades + quizzes) ────────────
      case "get_user_full_data": {
        const userId = params?.userId;
        if (!userId) throw { message: "Missing userId", status: 400 };

        // Get user info
        const userRes = await callMoodle("core_user_get_users_by_field", {
          field: "id",
          "values[0]": String(userId),
        });
        const user = userRes[0];
        if (!user) throw { message: "User not found", status: 404 };

        // Get user courses (include hidden/non-visible courses)
        const courses = await callMoodle("core_enrol_get_users_courses", {
          userid: String(userId),
          returnhidden: "1",
        });

        const coursesData = [];
        for (const course of courses) {
          let grades = null;
          try {
            const g = await callMoodle("gradereport_user_get_grade_items", {
              courseid: String(course.id),
              userid: String(userId),
            });
            grades = g.usergrades?.[0]?.gradeitems || null;
          } catch {}

          let completion = null;
          try {
            const c = await callMoodle("core_completion_get_course_completion_status", {
              courseid: String(course.id),
              userid: String(userId),
            });
            completion = c.completionstatus || null;
          } catch {}

          // Get quiz attempts
          const contents = await callMoodle("core_course_get_contents", {
            courseid: String(course.id),
          }).catch(() => []);

          const quizzes: any[] = [];
          for (const section of contents) {
            for (const mod of section.modules || []) {
              if (mod.modname === "quiz") {
                quizzes.push({ id: mod.instance, name: mod.name });
              }
            }
          }

          const quizAttempts = [];
          for (const quiz of quizzes) {
            try {
              const att = await callMoodle("mod_quiz_get_user_attempts", {
                quizid: String(quiz.id),
                userid: String(userId),
                status: "all",
              });
              quizAttempts.push({
                quizName: quiz.name,
                quizId: quiz.id,
                attempts: att.attempts || [],
              });
            } catch {}
          }

          // Determine roles
          let roles: string[] = [];
          try {
            const profiles = await callMoodle("core_user_get_course_user_profiles", {
              "userlist[0][userid]": String(userId),
              "userlist[0][courseid]": String(course.id),
            });
            roles = (profiles[0]?.roles || []).map((r: any) => r.shortname);
          } catch {}

          coursesData.push({
            id: course.id,
            shortname: course.shortname,
            fullname: course.fullname,
            progress: course.progress ?? null,
            completed: course.completed || false,
            startdate: course.startdate || 0,
            enddate: course.enddate || 0,
            lastaccess: course.lastaccess ?? null,
            grades,
            completion,
            quizAttempts,
            roles,
          });
        }

        result = {
          user: {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            email: user.email,
            firstaccess: user.firstaccess || 0,
            lastaccess: user.lastaccess || 0,
            profileimageurl: user.profileimageurl || "",
            suspended: !!user.suspended,
          },
          courses: coursesData,
          totalCourses: coursesData.length,
        };
        break;
      }

      // ── Course overview data ───────────────────────────────────
      case "get_course_overview_data": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };

        const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
          courseid: String(courseId),
        });

        const students: any[] = [];
        const teachers: any[] = [];

        for (const u of enrolled) {
          const roleNames = (u.roles || []).map((r: any) => r.shortname);
          if (roleNames.includes("editingteacher") || roleNames.includes("teacher") || roleNames.includes("manager")) {
            teachers.push(u);
          } else {
            students.push(u);
          }
        }

        // Get contents to find quizzes
        const contents = await callMoodle("core_course_get_contents", {
          courseid: String(courseId),
        }).catch(() => []);

        const quizzes: { id: number; name: string }[] = [];
        for (const section of contents) {
          for (const mod of section.modules || []) {
            if (mod.modname === "quiz") {
              quizzes.push({ id: mod.instance, name: mod.name });
            }
          }
        }

        const allStudentsBasic = students.map((s: any) => ({
          id: s.id,
          fullname: s.fullname,
          email: s.email || "",
          lastaccess: s.lastcourseaccess || s.lastaccess || 0,
          completed: false,
        }));

        // For detailed data, limit to first 50 students
        const detailedStudents = students.slice(0, 50);
        const studentData = [];

        for (const s of detailedStudents) {
          let gradeRaw = null;
          let gradeMax = 100;
          let gradeFormatted = "-";
          let gradeItems: any[] = [];

          try {
            const g = await callMoodle("gradereport_user_get_grade_items", {
              courseid: String(courseId),
              userid: String(s.id),
            });
            const items = g.usergrades?.[0]?.gradeitems || [];
            gradeItems = items;
            const courseItem = items.find((i: any) => i.itemtype === "course");
            if (courseItem) {
              gradeRaw = courseItem.graderaw ?? null;
              gradeMax = courseItem.grademax ?? 100;
              gradeFormatted = courseItem.gradeformatted || "-";
            }
          } catch {}

          let completed = false;
          try {
            const c = await callMoodle("core_completion_get_course_completion_status", {
              courseid: String(courseId),
              userid: String(s.id),
            });
            completed = c.completionstatus?.completed || false;
          } catch {}

          const quizAttempts = [];
          for (const quiz of quizzes) {
            try {
              const att = await callMoodle("mod_quiz_get_user_attempts", {
                quizid: String(quiz.id),
                userid: String(s.id),
                status: "all",
              });
              quizAttempts.push({
                quizName: quiz.name,
                quizId: quiz.id,
                attempts: att.attempts || [],
              });
            } catch {}
          }

          studentData.push({
            id: s.id,
            fullname: s.fullname,
            email: s.email || "",
            lastaccess: s.lastcourseaccess || s.lastaccess || 0,
            completed,
            gradeRaw,
            gradeMax,
            gradeFormatted,
            gradeItems,
            quizAttempts,
          });
        }

        result = {
          totalEnrolled: enrolled.length,
          totalStudents: students.length,
          totalTeachers: teachers.length,
          neverAccessed: students.filter((s: any) => !s.lastcourseaccess && !s.lastaccess).length,
          students: studentData,
          allStudentsBasic,
          quizzes,
        };
        break;
      }

      // ── Courses enrollment summary ─────────────────────────────
      case "get_courses_enrollment_summary": {
        const courseIds: number[] = params?.courseIds || [];
        const summaries = [];

        for (const cid of courseIds.slice(0, 20)) {
          try {
            const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
              courseid: String(cid),
            });

            const studentsArr = enrolled.filter((u: any) => {
              const roles = (u.roles || []).map((r: any) => r.shortname);
              return !roles.includes("editingteacher") && !roles.includes("teacher") && !roles.includes("manager");
            });
            const teachersArr = enrolled.filter((u: any) => {
              const roles = (u.roles || []).map((r: any) => r.shortname);
              return roles.includes("editingteacher") || roles.includes("teacher") || roles.includes("manager");
            });

            let completedCount = 0;
            let checkedCount = 0;
            const neverAccessed = studentsArr.filter((s: any) => !s.lastcourseaccess && !s.lastaccess).length;

            // Check completion for up to 10 students per course to stay fast
            for (const s of studentsArr.slice(0, 10)) {
              try {
                const c = await callMoodle("core_completion_get_course_completion_status", {
                  courseid: String(cid),
                  userid: String(s.id),
                });
                checkedCount++;
                if (c.completionstatus?.completed) completedCount++;
              } catch {
                checkedCount++;
              }
            }

            summaries.push({
              courseId: cid,
              totalEnrolled: enrolled.length,
              totalStudents: studentsArr.length,
              totalTeachers: teachersArr.length,
              completed: completedCount,
              checkedStudents: checkedCount,
              neverAccessed,
            });
          } catch {
            summaries.push({
              courseId: cid,
              totalEnrolled: 0,
              totalStudents: 0,
              totalTeachers: 0,
              completed: 0,
              checkedStudents: 0,
              neverAccessed: 0,
            });
          }
        }

        result = summaries;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Internal error" }),
      { status: e?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
