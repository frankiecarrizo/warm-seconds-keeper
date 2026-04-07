import { useState, useCallback, createContext, useContext } from "react";
import { toast } from "sonner";
import { connectMoodle, disconnectMoodle } from "@/lib/moodle-api";

export interface MoodleConnectionState {
  isConnected: boolean;
  configUrl: string;
  connect: (url: string, token: string) => void;
  disconnect: () => void;
}

const MoodleConnectionContext = createContext<MoodleConnectionState | null>(null);

export function useMoodleConnection() {
  const ctx = useContext(MoodleConnectionContext);
  if (!ctx) throw new Error("useMoodleConnection must be used within MoodleConnectionProvider");
  return ctx;
}

export function MoodleConnectionProvider({ children }: { children: React.ReactNode }) {
  const [configUrl, setConfigUrl] = useState(() => localStorage.getItem("moodle-url") || "");
  const [isConnected, setIsConnected] = useState(() => !!localStorage.getItem("moodle-url") && !!localStorage.getItem("moodle-session"));

  const connect = useCallback((url: string, token: string) => {
    // Extract token from full URL if user pasted one
    let cleanToken = token.trim();
    try {
      if (cleanToken.startsWith("http")) {
        const parsed = new URL(cleanToken);
        const wstoken = parsed.searchParams.get("wstoken");
        if (wstoken) {
          cleanToken = wstoken;
          if (!url || url === "https://tucampus.edu/moodle") {
            url = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/webservice\/rest\/server\.php$/, "")}`;
          }
        }
      }
    } catch { /* not a URL, use as-is */ }
    const cleanUrl = url.replace(/\/+$/, "");
    // Store session in HttpOnly cookie via edge function
    connectMoodle(cleanUrl, cleanToken)
      .then(() => {
        setConfigUrl(cleanUrl);
        localStorage.setItem("moodle-url", cleanUrl);
        setIsConnected(true);
      })
      .catch((e) => {
        toast.error(e.message || "Error al conectar");
      });
  }, []);

  const disconnect = useCallback(() => {
    disconnectMoodle().finally(() => {
      localStorage.removeItem("moodle-url");
      setConfigUrl("");
      setIsConnected(false);
      toast.info("Desconectado de Moodle");
    });
  }, []);

  return (
    <MoodleConnectionContext.Provider value={{ isConnected, configUrl, connect, disconnect }}>
      {children}
    </MoodleConnectionContext.Provider>
  );
}
