import { useState, useCallback, createContext, useContext } from "react";
import { toast } from "sonner";

export interface MoodleConnectionState {
  isConnected: boolean;
  configUrl: string;
  config: { moodleUrl: string; moodleToken: string };
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
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem("moodle-config");
    return saved ? JSON.parse(saved) : { moodleUrl: "", moodleToken: "" };
  });
  const [isConnected, setIsConnected] = useState(() => !!localStorage.getItem("moodle-config"));

  const connect = useCallback((url: string, token: string) => {
    const c = { moodleUrl: url.replace(/\/+$/, ""), moodleToken: token };
    setConfig(c);
    localStorage.setItem("moodle-config", JSON.stringify(c));
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem("moodle-config");
    setConfig({ moodleUrl: "", moodleToken: "" });
    setIsConnected(false);
    toast.info("Desconectado de Moodle");
  }, []);

  return (
    <MoodleConnectionContext.Provider value={{ isConnected, configUrl: config.moodleUrl, config, connect, disconnect }}>
      {children}
    </MoodleConnectionContext.Provider>
  );
}
