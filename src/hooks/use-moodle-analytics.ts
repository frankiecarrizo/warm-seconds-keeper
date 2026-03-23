import { useState, useCallback } from "react";
import { MoodleConfig, MoodleUser, UserFullData, searchUsers, getUserFullData, streamAnalysis, isTokenError } from "@/lib/moodle-api";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { toast } from "sonner";

export function useMoodleAnalytics() {
  const { isConnected, config, connect, disconnect } = useMoodleConnection();
  const [users, setUsers] = useState<MoodleUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MoodleUser | null>(null);
  const [userData, setUserData] = useState<UserFullData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTokenError = useCallback((e: any) => {
    if (e.message?.startsWith("TOKEN_INVALID")) {
      toast.error("Token inválido o expirado. Reconectá con un nuevo token.");
      disconnect();
      return true;
    }
    return false;
  }, [disconnect]);

  const search = useCallback(async (term: string) => {
    if (!term.trim()) return;
    const saved = localStorage.getItem("moodle-config");
    if (!saved) return;
    const cfg = JSON.parse(saved);
    setSearchLoading(true);
    setError(null);
    try {
      const results = await searchUsers(cfg, term);
      setUsers(results);
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  }, [handleTokenError]);

  const selectUser = useCallback((user: MoodleUser) => {
    setSelectedUser(user);
    setUserData(null);
    setAnalysis("");
    setError(null);
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!selectedUser) return;
    setDataLoading(true);
    setError(null);
    setAnalysis("");
    setUserData(null);

    const saved = localStorage.getItem("moodle-config");
    if (!saved) return;
    const cfg = JSON.parse(saved);

    try {
      const data = await getUserFullData(cfg, selectedUser.id);
      setUserData(data);
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
    } finally {
      setDataLoading(false);
    }
  }, [selectedUser, handleTokenError]);

  const analyze = useCallback(async () => {
    if (!userData) return;
    setAnalysisLoading(true);
    setAnalysis("");
    setError(null);

    try {
      await streamAnalysis({
        userData,
        onDelta: (text) => setAnalysis((prev) => prev + text),
        onDone: () => setAnalysisLoading(false),
        onError: (err) => {
          setError(err);
          setAnalysisLoading(false);
        },
      });
    } catch (e: any) {
      if (!handleTokenError(e)) {
        setError(e.message);
      }
      setAnalysisLoading(false);
    }
  }, [userData, handleTokenError]);

  return {
    config,
    isConnected,
    connect,
    disconnect,
    users,
    searchLoading,
    search,
    selectedUser,
    selectUser,
    fetchUserData,
    userData,
    dataLoading,
    analysis,
    analysisLoading,
    analyze,
    error,
    setError,
  };
}
