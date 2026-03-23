import { useState, useEffect } from "react";
import { getMoodleConnection } from "@/lib/moodle-store";
import MoodleConnectForm from "@/components/MoodleConnectForm";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const Index = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(!!getMoodleConnection());
  }, []);

  if (!connected) {
    return <MoodleConnectForm onConnected={() => setConnected(true)} />;
  }

  return <DashboardLayout onDisconnect={() => setConnected(false)} />;
};

export default Index;
