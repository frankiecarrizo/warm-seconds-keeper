import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ── Allowed origins for CORS with credentials ──
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.lovableproject\.com$/,
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/qa\.campusvirtualfp\.com\.ar$/,
  /^https:\/\/campuscivet\.ar\/campusvirtual3\/$/,
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-moodle-session, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Credentials": "false",
  };
}

// ── Cookie encryption helpers ──
const COOKIE_NAME = "moodle_session";

async function deriveKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-secret-key";
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("moodle-session-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptConfig(config: { moodleUrl: string; moodleToken: string }): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(config));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptConfig(encrypted: string): Promise<{ moodleUrl: string; moodleToken: string }> {
  const key = await deriveKey();
  const binary = atob(encrypted);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, params } = body;

    // ── Connect: encrypt and return encrypted blob ──
    if (action === "connect") {
      const { moodleUrl, moodleToken } = body;
      if (!moodleUrl || !moodleToken) {
        return new Response(JSON.stringify({ error: "Missing moodleUrl or moodleToken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const encrypted = await encryptConfig({ moodleUrl, moodleToken });
      return new Response(JSON.stringify({ success: true, session: encrypted }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Disconnect: no-op on server side ──
    if (action === "disconnect") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── For all other actions, read credentials from x-moodle-session header ──
    const sessionBlob = req.headers.get("x-moodle-session");
    if (!sessionBlob) {
      return new Response(JSON.stringify({ error: "SESSION_EXPIRED: No hay sesión activa. Reconectá." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let moodleUrl: string;
    let moodleToken: string;
    try {
      const config = await decryptConfig(sessionBlob);
      moodleUrl = config.moodleUrl;
      moodleToken = config.moodleToken;
    } catch {
      return new Response(JSON.stringify({ error: "SESSION_INVALID: Sesión corrupta. Reconectá." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = `${moodleUrl}/webservice/rest/server.php`;

    const callMoodle = async (wsfunction: string, extraParams: Record<string, string> = {}) => {
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
          data.errorcode === "accessexception" || (data.message || "").toLowerCase().includes("access");
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
      const candidates = [`${certUrl}${separator}token=${moodleToken}`, `${certUrl}${separator}wstoken=${moodleToken}`];
      for (const fullUrl of candidates) {
        const certResp = await fetch(fullUrl, { redirect: "follow" });
        const contentType = certResp.headers.get("content-type") || "";
        if (!certResp.ok) continue;
        if (certResp.url.includes("/login/index.php")) {
          return buildDownloadFailure("Moodle redirigió la descarga al login.");
        }
        if (contentType.includes("text/html")) {
          return buildDownloadFailure("Moodle devolvió HTML en lugar del PDF.");
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
          return buildDownloadFailure("El servicio web no tiene habilitada la descarga de archivos.");
        }
        return buildDownloadFailure(message || "Moodle no permitió descargar este certificado.");
      }
      if (!response.ok) return buildDownloadFailure(`Certificate download failed: ${response.status}`);
      if (response.url.includes("/login/index.php") || contentType.includes("text/html")) {
        return buildDownloadFailure("Moodle redirigió la descarga al login.");
      }
      return await toBase64Result(response);
    };

    let result: any;

    switch (action) {
      // ══════════════════════════════════════════════════════════════
      // PLUGIN ENDPOINTS (local_dashboard) — Direct SQL queries
      // ══════════════════════════════════════════════════════════════

      // ── General data (site info + courses + categories + users summary) ──
      case "get_general_data": {
        result = await callMoodle("local_dashboard_get_general_data");
        break;
      }

      // ── Site info (standalone, lightweight) ──
      case "get_site_info": {
        result = await callMoodle("core_webservice_get_site_info");
        break;
      }

      // ── Users summary ──
      case "get_users_summary": {
        const general = await callMoodle("local_dashboard_get_general_data");
        result = general.usersSummary;
        break;
      }

      // ── Categories ──
      case "get_categories": {
        const general = await callMoodle("local_dashboard_get_general_data");
        result = general.categories;
        break;
      }

      // ── All courses ──
      case "get_all_courses": {
        const general = await callMoodle("local_dashboard_get_general_data");
        result = general.courses;
        break;
      }

      // ── Enrollment summaries (batched via plugin) ──
      case "get_courses_enrollment_summary": {
        const courseIds: number[] = params?.courseIds || [];
        result = await callMoodle("local_dashboard_get_enrollment_summaries", {
          courseids: JSON.stringify(courseIds),
        });
        break;
      }

      // ── Login logs ──
      case "get_login_logs": {
        result = await callMoodle("local_dashboard_get_login_logs");
        break;
      }

      // ── Course overview data ──
      case "get_course_overview_data": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        result = await callMoodle("local_dashboard_get_course_overview", {
          courseid: String(courseId),
        });
        break;
      }

      // ── User full data ──
      case "get_user_full_data": {
        const userId = params?.userId;
        if (!userId) throw { message: "Missing userId", status: 400 };
        result = await callMoodle("local_dashboard_get_user_data", {
          userid: String(userId),
        });
        break;
      }

      // ── Activity completion report ──
      case "get_activity_completion_report": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        result = await callMoodle("local_dashboard_get_activity_completion", {
          courseid: String(courseId),
        });
        break;
      }

      // ── Grader report ──
      case "get_grader_report": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        result = await callMoodle("local_dashboard_get_grader_report", {
          courseid: String(courseId),
        });
        break;
      }

      // ══════════════════════════════════════════════════════════════
      // WEBSERVICE ENDPOINTS (kept for features not covered by plugin)
      // ══════════════════════════════════════════════════════════════

      // ── Search users ──
      case "search_users": {
        const search = params?.search || "";
        let users: any[] = [];
        for (const key of ["email", "lastname", "firstname"]) {
          try {
            const res = await callMoodle("core_user_get_users", {
              "criteria[0][key]": key,
              "criteria[0][value]": `%${search}%`,
            });
            if (res.users?.length) users = [...users, ...res.users];
          } catch {}
        }
        const seen = new Set<number>();
        result = users
          .filter((u: any) => {
            if (seen.has(u.id) || u.id <= 1 || u.username === "guest") return false;
            seen.add(u.id);
            return true;
          })
          .map((u: any) => ({
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

      // ── Search courses ──
      case "search_courses": {
        const search = params?.search || "";
        result = await callMoodle("core_course_search_courses", {
          criterianame: "search",
          criteriavalue: search,
        });
        break;
      }

      // ── Course contents ──
      case "get_course_contents": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        result = await callMoodle("core_course_get_contents", {
          courseid: String(courseId),
        });
        break;
      }

      // ── Quiz attempt review ──
      case "get_quiz_attempt_review": {
        const attemptId = params?.attemptId;
        if (!attemptId) throw { message: "Missing attemptId", status: 400 };
        try {
          result = await callMoodle("mod_quiz_get_attempt_review", {
            attemptid: String(attemptId),
          });
        } catch (e: any) {
          result = {
            accessDenied: true,
            message: e.message || "No se pudo obtener la revisión del intento",
          };
        }
        break;
      }

      // ── Send message ──
      case "send_message": {
        const userIds: number[] = params?.userIds || [];
        const text: string = params?.text || "";
        if (!userIds.length || !text.trim()) {
          throw { message: "Missing userIds or text", status: 400 };
        }
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
          if (Array.isArray(batchResult)) {
            for (const r of batchResult) {
              if (r.errormessage) errors.push(`User ${r.touserid || "unknown"}: ${r.errormessage}`);
            }
            allResults.push(...batchResult);
          } else {
            allResults.push(batchResult);
          }
        }
        result = { sent: allResults.length, errors, hasErrors: errors.length > 0, results: allResults };
        break;
      }

      // ── Get all users (for messaging) ──
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
          .map((u: any) => ({ id: u.id, fullname: u.fullname, email: u.email || "" }));
        break;
      }

      // ── Get course certificates ──
      case "get_course_certificates": {
        const courseId = params?.courseId;
        if (!courseId) throw { message: "Missing courseId", status: 400 };
        let allCerts: any[] = [];
        let pluginAvailable = false;
        try {
          const pluginResult = await callMoodle("local_certapi_get_course_certificates", {
            courseId: String(courseId),
          });
          if (Array.isArray(pluginResult)) {
            pluginAvailable = true;
            allCerts = pluginResult;
          }
        } catch (e: any) {
          console.log("local_certapi plugin not available, using fallback:", e?.message);
        }

        if (!pluginAvailable) {
          const contents = await callMoodle("core_course_get_contents", {
            courseid: String(courseId),
          }).catch(() => []);
          const certModules: any[] = [];
          const seenCertIds = new Set<string>();
          for (const section of contents) {
            for (const mod of section.modules || []) {
              if (mod.modname === "customcert" || mod.modname === "certificate") {
                const key = `${mod.modname}-${mod.instance}`;
                if (!seenCertIds.has(key)) {
                  seenCertIds.add(key);
                  certModules.push({ id: mod.instance, cmid: mod.id, name: mod.name, type: mod.modname });
                }
              }
            }
          }
          if (certModules.length === 0) {
            try {
              const customcerts = await callMoodle("mod_customcert_get_certificates_by_courses", {
                "courseids[0]": String(courseId),
              });
              for (const cert of customcerts?.customcerts || []) {
                const key = `customcert-${cert.id}`;
                if (!seenCertIds.has(key)) {
                  seenCertIds.add(key);
                  certModules.push({ id: cert.id, cmid: cert.coursemodule || cert.cmid || 0, name: cert.name, type: "customcert" });
                }
              }
            } catch {}
          }
          if (certModules.length === 0) {
            result = [];
            break;
          }
          let apiAvailable = true;
          for (const cert of certModules) {
            if (cert.type === "customcert") {
              try {
                const issued = await callMoodle("mod_customcert_get_issued_certificates", {
                  certificateid: String(cert.id),
                });
                for (const issue of issued.issues || []) {
                  let downloadUrl = issue.fileurl || `${moodleUrl}/webservice/pluginfile.php/${issue.contextid || ""}/mod_customcert/issues/${issue.id}/certificate.pdf`;
                  allCerts.push({
                    id: cert.id, cmid: cert.cmid, name: cert.name, type: cert.type,
                    courseId, issued: true, issueDate: issue.timecreated, code: issue.code || null,
                    downloadUrl, userName: issue.fullname || `User ${issue.userid}`, userId: issue.userid,
                  });
                }
              } catch {
                apiAvailable = false;
              }
            }
          }
          if (!apiAvailable && allCerts.length === 0) {
            try {
              const enrolled = await callMoodle("core_enrol_get_enrolled_users", { courseid: String(courseId) });
              for (const cert of certModules) {
                for (const user of enrolled || []) {
                  allCerts.push({
                    id: cert.id, cmid: cert.cmid, name: cert.name, type: cert.type,
                    courseId, issued: null, downloadUrl: `${moodleUrl}/mod/customcert/view.php?id=${cert.cmid}&downloadown=1`,
                    userName: user.fullname || `User ${user.id}`, userId: user.id,
                  });
                }
              }
            } catch {}
          }
        }
        result = allCerts;
        break;
      }

      // ── Download certificate ──
      case "download_certificate": {
        const { url: certUrl, type, certificateId, userId } = params;
        if (!certUrl) throw { message: "Missing certificate url", status: 400 };
        if (type === "customcert" && certificateId && userId) {
          result = await tryCustomCertMobileDownload(Number(certificateId), Number(userId));
          if (!result.downloadable) {
            const fallback = await tryDirectCertificateDownload(certUrl);
            if (fallback.downloadable) { result = fallback; break; }
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
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: e?.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
