// Simple store for Moodle connection credentials (session only)
const STORAGE_KEY = "moodle_connection";

export interface MoodleConnection {
  moodleUrl: string;
  moodleToken: string;
  siteName?: string;
  username?: string;
}

export function getMoodleConnection(): MoodleConnection | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setMoodleConnection(conn: MoodleConnection) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conn));
}

export function clearMoodleConnection() {
  sessionStorage.removeItem(STORAGE_KEY);
}
