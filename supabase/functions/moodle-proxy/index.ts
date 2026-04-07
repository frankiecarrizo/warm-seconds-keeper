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

    const toBase64Result = async (response: Response) => {
      const contentType = response.headers.get("content-type") || "application/pdf";
      const arrayBuf = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

      return {
        downloadable: true,
        base64: btoa(binary),
        contentType,
        size: bytes.length,
      };
    };

    const buildDownloadFailure = (reason: string) => ({
      downloadable: false,
      reason,
    });

    const tryDirectCertificateDownload = async (certUrl: string) => {
      const separator = certUrl.includes("?") ? "&" : "?";
      const candidates = [
        `${certUrl}${separator}token=${moodleToken}`,
        `${certUrl}${separator}wstoken=${moodleToken}`,
      ];

      for (const fullUrl of candidates) {
        const certResp = await fetch(fullUrl, { redirect: "follow" });
        const contentType = certResp.headers.get("content-type") || "";

        if (!certResp.ok) {
          continue;
        }

        if (certResp.url.includes("/login/index.php")) {
          return buildDownloadFailure(
            "Moodle redirigió la descarga al login. Este certificado no acepta descarga directa con el token actual."
          );
        }

        if (contentType.includes("text/html")) {
          return buildDownloadFailure(
            "Moodle devolvió una página HTML en lugar del PDF. La descarga directa no está habilitada para este certificado con el token actual."
          );
        }

        return await toBase64Result(certResp);
      }

      return buildDownloadFailure("No se pudo descargar el certificado desde Moodle.");
    };

    const tryCustomCertMobileDownload = async (certificateId: number, userId: number) => {
      const mobileUrl = new URL(`${moodleUrl}/mod/customcert/mobile/pluginfile.php`);
      mobileUrl.searchParams.set("token", moodleToken);
      mobileUrl.searchParams.set("certificateid", String(certificateId));
      mobileUrl.searchParams.set("userid", String(userId));

      const response = await fetch(mobileUrl.toString(), { redirect: "follow" });
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error || payload?.message || "";

        if (message.toLowerCase().includes("file downloading must be enabled")) {
          return buildDownloadFailure(
            "El servicio web de Moodle no tiene habilitada la descarga de archivos para este token. Activá 'Files download' en el servicio del token para descargar certificados Custom Cert."
          );
        }

        if (message.toLowerCase().includes("acceso")) {
          return buildDownloadFailure(
            "El token de Moodle no tiene permisos para descargar este certificado Custom Cert."
          );
        }

        return buildDownloadFailure(message || "Moodle no permitió descargar este certificado Custom Cert.");
      }

      if (!response.ok) {
        return buildDownloadFailure(`Certificate download failed: ${response.status}`);
      }

      if (response.url.includes("/login/index.php") || contentType.includes("text/html")) {
        return buildDownloadFailure(
          "Moodle redirigió la descarga del Custom Cert al login en lugar de devolver el PDF."
        );
      }

      return await toBase64Result(response);
    };

    // ── Smart completion helper ──────────────────────────────────
    // 1. Try official course completion status
    // 2. Fallback: calculate % of completed activities
    const getCompletionForUser = async (
      courseId: number,
      userId: number
    ): Promise<{ completed: boolean; percentage: number; method: "criteria" | "activities" | "none" }> => {
      // Try official completion criteria first
      try {
        const c = await callMoodle("core_completion_get_course_completion_status", {
          courseid: String(courseId),
          userid: String(userId),
        });
        if (c.completionstatus) {
          const completed = c.completionstatus.completed === true;
          return { completed, percentage: completed ? 100 : 0, method: "criteria" };
        }
      } catch {}

      // Fallback: activity completion
      try {
        const actResult = await callMoodle("core_completion_get_activities_completion_status", {
          courseid: String(courseId),
          userid: String(userId),
        });
        const statuses = actResult.statuses || [];
        if (statuses.length === 0) {
          return { completed: false, percentage: 0, method: "none" };
        }
        const completedCount = statuses.filter(
          (s: any) => s.state === 1 || s.state === 2 // 1=complete, 2=complete-pass
        ).length;
        const pct = Math.round((completedCount / statuses.length) * 100);
        return { completed: pct === 100, percentage: pct, method: "activities" };
      } catch {}

      return { completed: false, percentage: 0, method: "none" };
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

      // ── Enrolled users with completion info ────────────────────
      case "get_enrolled_users_with_completion": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
          courseid: String(courseId),
        });
        const students = (enrolled || []).filter((u: any) => {
          const roles = (u.roles || []).map((r: any) => r.shortname);
          return !roles.includes("editingteacher") && !roles.includes("teacher") && !roles.includes("manager");
        });

        // Process in batches of 10
        const enriched: any[] = [];
        for (let i = 0; i < students.length; i += 10) {
          const batch = students.slice(i, i + 10);
          const results = await Promise.all(
            batch.map(async (u: any) => {
              const completion = await getCompletionForUser(courseId, u.id);
              return {
                id: u.id,
                fullname: u.fullname,
                email: u.email || "",
                lastcourseaccess: u.lastcourseaccess || 0,
                completed: completion.completed,
                completionPercentage: completion.percentage,
              };
            })
          );
          enriched.push(...results);
        }
        result = enriched;
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

        // Get user courses - fetch visible ones first, then supplement with all courses
        let courses = await callMoodle("core_enrol_get_users_courses", {
          userid: String(userId),
        });

        // Also get all courses to find hidden ones where user is enrolled
        try {
          const allCourses = await callMoodle("core_course_get_courses");
          const userCourseIds = new Set(courses.map((c: any) => c.id));
          
          // For each course not in the user's visible list, check enrollment
          for (const course of allCourses) {
            if (course.id === 1 || userCourseIds.has(course.id)) continue;
            if (course.visible === 0) {
              try {
                const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
                  courseid: String(course.id),
                });
                const isEnrolled = enrolled.some((u: any) => u.id === userId);
                if (isEnrolled) {
                  courses.push(course);
                }
              } catch {}
            }
          }
        } catch {}

        const coursesData = [];
        for (const course of courses.filter((c: any) => c.id !== 1)) {
          let grades = null;
          try {
            const g = await callMoodle("gradereport_user_get_grade_items", {
              courseid: String(course.id),
              userid: String(userId),
            });
            grades = g.usergrades?.[0]?.gradeitems || null;
          } catch {}

          // Smart completion: official criteria or activity-based fallback
          const completionResult = await getCompletionForUser(course.id, userId);

          // Get quiz attempts and certificates from course contents
          const contents = await callMoodle("core_course_get_contents", {
            courseid: String(course.id),
          }).catch(() => []);

          const quizzes: any[] = [];
          const certificates: any[] = [];
          for (const section of contents) {
            for (const mod of section.modules || []) {
              if (mod.modname === "quiz") {
                quizzes.push({ id: mod.instance, name: mod.name });
              }
              if (mod.modname === "customcert" || mod.modname === "certificate") {
                certificates.push({
                  id: mod.instance,
                  cmid: mod.id,
                  name: mod.name,
                  type: mod.modname,
                  courseId: course.id,
                  courseName: course.fullname,
                });
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

          // Check issued certificates for customcert
          const issuedCerts: any[] = [];
          for (const cert of certificates) {
            if (cert.type === "customcert") {
              try {
                const issued = await callMoodle("mod_customcert_get_issued_certificates", {
                  certificateid: String(cert.id),
                });
                const userCert = (issued.issues || []).find((i: any) => i.userid === userId);
                if (userCert) {
                  // Try to get the file URL from the issue data or build pluginfile URL
                  let downloadUrl = "";
                  if (userCert.fileurl) {
                    downloadUrl = userCert.fileurl;
                  } else {
                    // Use Moodle's mobile pluginfile endpoint which accepts tokens
                    downloadUrl = `${moodleUrl}/webservice/pluginfile.php/${userCert.contextid || ""}/mod_customcert/issues/${userCert.id}/certificate.pdf`;
                  }
                  issuedCerts.push({
                    ...cert,
                    issued: true,
                    issueDate: userCert.timecreated,
                    code: userCert.code || null,
                    downloadUrl,
                  });
                }
              } catch {
                // If API not available, still include cert with fallback URL
                issuedCerts.push({
                  ...cert,
                  issued: null,
                  downloadUrl: `${moodleUrl}/mod/customcert/view.php?id=${cert.cmid}&downloadown=1`,
                });
              }
            } else {
              // Native certificate module
              issuedCerts.push({
                ...cert,
                issued: null,
                downloadUrl: `${moodleUrl}/mod/certificate/view.php?id=${cert.cmid}&action=get`,
              });
            }
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
            completed: completionResult.completed,
            completionPercentage: completionResult.percentage,
            completionMethod: completionResult.method,
            startdate: course.startdate || 0,
            enddate: course.enddate || 0,
            lastaccess: course.lastaccess ?? null,
            grades,
            completion: null,
            quizAttempts,
            roles,
            certificates: issuedCerts,
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

        // Compute completion for ALL students in batches of 10
        const allStudentsBasic: any[] = [];
        const batchSize = 10;
        for (let i = 0; i < students.length; i += batchSize) {
          const batch = students.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (s: any) => {
              const completionResult = await getCompletionForUser(courseId, s.id);
              return {
                id: s.id,
                fullname: s.fullname,
                email: s.email || "",
                lastaccess: s.lastcourseaccess || s.lastaccess || 0,
                completed: completionResult.completed,
                completionPercentage: completionResult.percentage,
                completionMethod: completionResult.method,
              };
            })
          );
          allStudentsBasic.push(...results);
        }

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

          // Smart completion
          const completionResult = await getCompletionForUser(courseId, s.id);

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
            completed: completionResult.completed,
            completionPercentage: completionResult.percentage,
            completionMethod: completionResult.method,
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
            let totalPercentage = 0;
            const neverAccessed = studentsArr.filter((s: any) => !s.lastcourseaccess && !s.lastaccess).length;

            // Check completion for ALL students in parallel batches of 10
            const compBatchSize = 10;
            for (let si = 0; si < studentsArr.length; si += compBatchSize) {
              const batch = studentsArr.slice(si, si + compBatchSize);
              const results = await Promise.all(
                batch.map((s: any) => getCompletionForUser(cid, s.id).catch(() => ({ completed: false, percentage: 0, method: "none" as const })))
              );
              for (const comp of results) {
                checkedCount++;
                totalPercentage += comp.percentage;
                if (comp.completed) completedCount++;
              }
            }

            summaries.push({
              courseId: cid,
              totalEnrolled: enrolled.length,
              totalStudents: studentsArr.length,
              totalTeachers: teachersArr.length,
              teacherIds: teachersArr.map((t: any) => t.id),
              completed: completedCount,
              checkedStudents: checkedCount,
              avgCompletionPercentage: checkedCount > 0 ? Math.round(totalPercentage / checkedCount) : 0,
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

      // ── Send message to user(s) ─────────────────────────────────
      case "send_message": {
        const userIds: number[] = params?.userIds || [];
        const text: string = params?.text || "";
        if (!userIds.length || !text.trim()) {
          throw { message: "Missing userIds or text", status: 400 };
        }

        // Send in batches of 20 to avoid timeouts
        const batchSize = 20;
        const allResults: any[] = [];
        const errors: string[] = [];

        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          const msgParams: Record<string, string> = {};
          batch.forEach((uid, idx) => {
            msgParams[`messages[${idx}][touserid]`] = String(uid);
            msgParams[`messages[${idx}][text]`] = text;
            msgParams[`messages[${idx}][textformat]`] = "0";
          });

          const batchResult = await callMoodle("core_message_send_instant_messages", msgParams);

          // Check individual message results for errors
          if (Array.isArray(batchResult)) {
            for (const r of batchResult) {
              if (r.errormessage) {
                errors.push(`User ${r.touserid || 'unknown'}: ${r.errormessage}`);
              }
            }
            allResults.push(...batchResult);
          } else {
            allResults.push(batchResult);
          }
        }

        result = {
          sent: allResults.length,
          errors,
          hasErrors: errors.length > 0,
          results: allResults,
        };
        break;
      }

      // ── Get all users (for "send to all") ─────────────────────────
      case "get_all_users": {
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

        result = allUsersList
          .filter((u: any) => u.id > 1 && u.username !== "guest" && !u.suspended && !u.deleted)
          .map((u: any) => ({
            id: u.id,
            fullname: u.fullname,
            email: u.email || "",
          }));
        break;
      }

      // ── Get login logs for charts ──────────────────────────────
      case "get_login_logs": {
        // Use report_log_get_log_records to fetch login events
        // We'll get logs for the last 12 months
        const now = Math.floor(Date.now() / 1000);
        const twelveMonthsAgo = now - (365 * 24 * 60 * 60);
        
        let allLogs: any[] = [];
        let page = 0;
        const perPage = 500;
        let hasMore = true;
        
        while (hasMore) {
          try {
            const logsData = await callMoodle("report_log_get_log_records", {
              courseid: "0",
              "filters[eventname]": String.raw`\core\event\user_loggedin`,
              "filters[timecreated]": String(twelveMonthsAgo),
              page: String(page),
              perpage: String(perPage),
              orderby: "timecreated DESC",
            });
            
            const records = logsData?.data || [];
            allLogs.push(...records);
            
            if (records.length < perPage) {
              hasMore = false;
            } else {
              page++;
              // Safety limit
              if (page > 20) hasMore = false;
            }
          } catch (e: any) {
            // If report_log is not available, try fallback with user lastaccess
            console.warn("report_log not available, using fallback:", e.message);
            
            // Fallback: get all users with their firstaccess/lastaccess
            let users: any[] = [];
            try {
              const res = await callMoodle("core_user_get_users", {
                "criteria[0][key]": "email",
                "criteria[0][value]": "%@%",
              });
              users = (res.users || []).filter((u: any) => u.id > 1 && u.username !== "guest" && !u.deleted);
            } catch {}
            
            // Build synthetic login entries from firstaccess and lastaccess
            allLogs = users
              .filter((u: any) => u.lastaccess > 0)
              .map((u: any) => ({
                timecreated: u.lastaccess,
                userid: u.id,
              }));
            
            // Also add firstaccess as separate entry if different
            users.forEach((u: any) => {
              if (u.firstaccess > 0 && u.firstaccess !== u.lastaccess) {
                allLogs.push({ timecreated: u.firstaccess, userid: u.id });
              }
            });
            
            hasMore = false;
          }
        }
        
        // Return raw timestamps for client-side aggregation
        result = allLogs.map((l: any) => ({
          timecreated: l.timecreated,
          userid: l.userid || 0,
        }));
        break;
      }


      const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

      const normalizeText = (value: string) =>
        stripHtml(value)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

      // ── Activity completion report (student x activity matrix) ──
      case "get_activity_completion_report": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };

        // Get enrolled students
        const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
          courseid: String(courseId),
        });
        const students = (enrolled || []).filter((u: any) => {
          const roles = (u.roles || []).map((r: any) => r.shortname);
          return !roles.includes("editingteacher") && !roles.includes("teacher") && !roles.includes("manager");
        });

        // Get activities list from first student (or course contents)
        let activities: { cmid: number; name: string; modname: string }[] = [];
        const contents = await callMoodle("core_course_get_contents", {
          courseid: String(courseId),
        }).catch(() => []);
        for (const section of contents) {
          for (const mod of section.modules || []) {
            if (mod.completion && mod.completion > 0) {
              activities.push({ cmid: mod.id, name: mod.name, modname: mod.modname });
            }
          }
        }

        const activityByNormalizedName = new Map(
          activities.map((activity) => [normalizeText(activity.name), activity.cmid])
        );

        // Get completion status for each student in batches
        const rows: any[] = [];
        const batchSize = 10;
        for (let i = 0; i < students.length; i += batchSize) {
          const batch = students.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (s: any) => {
              try {
                const actResult = await callMoodle("core_completion_get_activities_completion_status", {
                  courseid: String(courseId),
                  userid: String(s.id),
                });
                const statuses = actResult.statuses || [];
                const statusMap: Record<number, number> = {};
                for (const st of statuses) {
                  statusMap[st.cmid] = st.state; // 0=incomplete, 1=complete, 2=complete-pass, 3=complete-fail
                }
                return {
                  id: s.id,
                  fullname: s.fullname,
                  email: s.email || "",
                  completions: statusMap,
                };
              } catch {
                try {
                  const courseCompletion = await callMoodle("core_completion_get_course_completion_status", {
                    courseid: String(courseId),
                    userid: String(s.id),
                  });

                  const completionEntries = courseCompletion?.completionstatus?.completions || [];
                  const statusMap: Record<number, number> = Object.fromEntries(
                    activities.map((activity) => [activity.cmid, 0])
                  );

                  for (const entry of completionEntries) {
                    const criteriaName = entry?.details?.criteria;
                    if (typeof criteriaName !== "string") continue;

                    const matchedCmid = activityByNormalizedName.get(normalizeText(criteriaName));
                    if (!matchedCmid) continue;

                    statusMap[matchedCmid] = entry.complete ? 1 : 0;
                  }

                  return {
                    id: s.id,
                    fullname: s.fullname,
                    email: s.email || "",
                    completions: statusMap,
                  };
                } catch {
                return {
                  id: s.id,
                  fullname: s.fullname,
                  email: s.email || "",
                  completions: {},
                };
                }
              }
            })
          );
          rows.push(...results);
        }

        result = { activities, students: rows };
        break;
      }

      // ── Grader report (student x grade item matrix) ────────────
      case "get_grader_report": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };

        // Get enrolled students
        const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
          courseid: String(courseId),
        });
        const students = (enrolled || []).filter((u: any) => {
          const roles = (u.roles || []).map((r: any) => r.shortname);
          return !roles.includes("editingteacher") && !roles.includes("teacher") && !roles.includes("manager");
        });

        // Get grade items structure from first student
        let gradeItemHeaders: { id: number; itemname: string; grademax: number }[] = [];

        // Get grades for each student in batches
        const rows: any[] = [];
        const batchSize = 10;
        for (let i = 0; i < students.length; i += batchSize) {
          const batch = students.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (s: any) => {
              try {
                const g = await callMoodle("gradereport_user_get_grade_items", {
                  courseid: String(courseId),
                  userid: String(s.id),
                });
                const items = g.usergrades?.[0]?.gradeitems || [];
                // Capture headers from first successful response
                if (gradeItemHeaders.length === 0 && items.length > 0) {
                  gradeItemHeaders = items
                    .filter((it: any) => it.itemtype !== "course")
                    .map((it: any) => ({
                      id: it.id,
                      itemname: it.itemname || it.itemtype,
                      grademax: it.grademax || 0,
                    }));
                }
                const grades: Record<number, { grade: number | null; grademax: number }> = {};
                for (const it of items) {
                  if (it.itemtype === "course") continue;
                  grades[it.id] = {
                    grade: it.graderaw ?? null,
                    grademax: it.grademax || 0,
                  };
                }
                // Course total
                const courseItem = items.find((it: any) => it.itemtype === "course");
                return {
                  id: s.id,
                  fullname: s.fullname,
                  email: s.email || "",
                  grades,
                  courseTotal: courseItem?.graderaw ?? null,
                  courseTotalMax: courseItem?.grademax ?? 0,
                };
              } catch {
                return {
                  id: s.id,
                  fullname: s.fullname,
                  email: s.email || "",
                  grades: {},
                  courseTotal: null,
                  courseTotalMax: 0,
                };
              }
            })
          );
          rows.push(...results);
        }

        result = { gradeItems: gradeItemHeaders, students: rows };
        break;
      }

      // ── Get all issued certificates for a course ──────────────
      case "get_course_certificates": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };

        // Get course contents to find certificate modules
        const contents = await callMoodle("core_course_get_contents", {
          courseid: String(courseId),
        }).catch(() => []);

        const certModules: any[] = [];
        for (const section of contents) {
          for (const mod of (section.modules || [])) {
            if (mod.modname === "customcert" || mod.modname === "certificate") {
              certModules.push({ id: mod.instance, cmid: mod.id, name: mod.name, type: mod.modname });
            }
          }
        }

        if (certModules.length === 0) {
          result = [];
          break;
        }

        // Try mod_customcert_get_issued_certificates first
        const allCerts: any[] = [];
        let apiAvailable = true;

        for (const cert of certModules) {
          if (cert.type === "customcert") {
            try {
              const issued = await callMoodle("mod_customcert_get_issued_certificates", {
                certificateid: String(cert.id),
              });
              for (const issue of (issued.issues || [])) {
                let downloadUrl = "";
                if (issue.fileurl) {
                  downloadUrl = issue.fileurl;
                } else {
                  downloadUrl = `${moodleUrl}/webservice/pluginfile.php/${issue.contextid || ""}/mod_customcert/issues/${issue.id}/certificate.pdf`;
                }
                allCerts.push({
                  id: cert.id,
                  cmid: cert.cmid,
                  name: cert.name,
                  type: cert.type,
                  courseId,
                  issued: true,
                  issueDate: issue.timecreated,
                  code: issue.code || null,
                  downloadUrl,
                  userName: issue.fullname || `User ${issue.userid}`,
                  userId: issue.userid,
                });
              }
            } catch {
              apiAvailable = false;
            }
          }
        }

        // Fallback: if API not available, get enrolled users and build cert entries per user
        if (!apiAvailable && allCerts.length === 0) {
          try {
            const enrolled = await callMoodle("core_enrol_get_enrolled_users", {
              courseid: String(courseId),
            });
            for (const cert of certModules) {
              for (const user of (enrolled || [])) {
                const downloadUrl = `${moodleUrl}/mod/customcert/view.php?id=${cert.cmid}&downloadown=1`;
                allCerts.push({
                  id: cert.id,
                  cmid: cert.cmid,
                  name: cert.name,
                  type: cert.type,
                  courseId,
                  issued: null,
                  downloadUrl,
                  userName: user.fullname || `User ${user.id}`,
                  userId: user.id,
                });
              }
            }
          } catch (e: any) {
            console.log("Fallback enrolled users error:", e?.message);
          }
        }

        result = allCerts;
        break;
      }

      case "download_certificate": {
        const { url: certUrl, type, certificateId, userId } = params;
        if (!certUrl) throw { message: "Missing certificate url", status: 400 };
        if (type === "customcert" && certificateId && userId) {
          // Try mobile endpoint first
          result = await tryCustomCertMobileDownload(Number(certificateId), Number(userId));
          if (!result.downloadable) {
            // Try direct URL with token
            const fallback = await tryDirectCertificateDownload(certUrl);
            if (fallback.downloadable) { result = fallback; break; }
            // Try pluginfile.php with different context patterns
            const pluginUrls = [
              `${moodleUrl}/webservice/pluginfile.php/1/mod_customcert/issues/${certificateId}/${userId}/certificate.pdf`,
              `${moodleUrl}/mod/customcert/my_certificates.php?downloadcert=1&certificateid=${certificateId}&userid=${userId}`,
              `${moodleUrl}/mod/customcert/view.php?id=${params.cmid || certUrl.match(/id=(\d+)/)?.[1] || ""}&downloadissue=${userId}`,
            ];
            for (const pUrl of pluginUrls) {
              const attempt = await tryDirectCertificateDownload(pUrl);
              if (attempt.downloadable) { result = attempt; break; }
            }
            if (result.downloadable) break;
          }
          break;
        }

        result = await tryDirectCertificateDownload(certUrl);
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
