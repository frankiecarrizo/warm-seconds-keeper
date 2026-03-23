import { supabase } from "@/integrations/supabase/client";
import { getMoodleConnection } from "./moodle-store";

function getConnection() {
  const conn = getMoodleConnection();
  if (!conn) throw new Error("No Moodle connection configured");
  return conn;
}

async function callProxy(action: string, params: Record<string, any> = {}) {
  const conn = getConnection();
  const { data, error } = await supabase.functions.invoke("moodle-proxy", {
    body: {
      moodleUrl: conn.moodleUrl,
      moodleToken: conn.moodleToken,
      action,
      params,
    },
  });
  if (error) throw new Error(error.message || "Proxy error");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getSiteInfo() {
  return callProxy("get_site_info");
}

export async function getUsersSummary() {
  return callProxy("get_users_summary");
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

async function callAIStream(
  functionName: string,
  body: Record<string, any>,
  callbacks: StreamCallbacks
) {
  const conn = getMoodleConnection();
  if (!conn) {
    callbacks.onError(new Error("No Moodle connection"));
    return;
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

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
    callbacks.onError(new Error(errData.error || `HTTP ${response.status}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body"));
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
        callbacks.onDone();
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) callbacks.onChunk(content);
      } catch {}
    }
  }
  callbacks.onDone();
}

export function analyzeUser(userData: any, callbacks: StreamCallbacks) {
  return callAIStream("analyze-user", { userData }, callbacks);
}

export function analyzeCourse(
  courseName: string,
  quizData: any[],
  callbacks: StreamCallbacks
) {
  return callAIStream("analyze-course", { courseName, quizData }, callbacks);
}

export function analyzeCourseOverview(
  courseName: string,
  courseData: any,
  callbacks: StreamCallbacks
) {
  return callAIStream(
    "analyze-course-overview",
    { courseName, courseData },
    callbacks
  );
}

export async function validateSSO(token: string) {
  const { data, error } = await supabase.functions.invoke("validate-sso", {
    body: { token },
  });
  if (error) throw new Error(error.message);
  return data as { valid: boolean; payload?: any; error?: string };
}
