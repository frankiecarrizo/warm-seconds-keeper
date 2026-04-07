import { useState } from "react";
import { Globe, Key, Plug, Loader2, LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import loginIllustration from "@/assets/login-illustration.png";

interface MoodleConnectFormProps {
  onConnect: (url: string, token: string) => void;
  isConnected: boolean;
  onDisconnect: () => void;
  configUrl?: string;
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Large gradient orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, hsl(172 66% 50% / 0.08), transparent 70%)", left: "-10%", top: "-10%" }}
        animate={{ x: [0, 80, 20, 60, 0], y: [0, 60, -30, 40, 0], scale: [1, 1.3, 0.9, 1.2, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, hsl(172 66% 50% / 0.06), transparent 70%)", right: "-15%", bottom: "-15%" }}
        animate={{ x: [0, -60, 30, -40, 0], y: [0, -50, 20, -30, 0], scale: [1, 1.2, 1.1, 0.9, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, hsl(220 20% 50% / 0.05), transparent 70%)", right: "20%", top: "10%" }}
        animate={{ x: [0, -40, 50, -20, 0], y: [0, 30, -20, 40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Animated dashboard-like shapes */}
      {/* Bar chart bars */}
      <div className="absolute left-[8%] bottom-[20%] flex items-end gap-1.5">
        {[40, 65, 50, 80, 55].map((h, i) => (
          <motion.div
            key={`bar-${i}`}
            className="w-3 rounded-t-sm bg-primary/[0.07]"
            initial={{ height: 0 }}
            animate={{ height: [0, h, h * 0.7, h] }}
            transition={{ duration: 3, delay: i * 0.3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Donut chart */}
      <motion.svg
        className="absolute right-[10%] top-[15%]"
        width="80" height="80" viewBox="0 0 80 80"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(172 66% 50% / 0.06)" strokeWidth="8" />
        <motion.circle
          cx="40" cy="40" r="30" fill="none" stroke="hsl(172 66% 50% / 0.12)" strokeWidth="8"
          strokeDasharray="188.5"
          animate={{ strokeDashoffset: [188.5, 50, 120, 30, 188.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </motion.svg>

      {/* Line chart path */}
      <svg className="absolute left-[60%] bottom-[25%] w-[200px] h-[80px]" viewBox="0 0 200 80">
        <motion.path
          d="M0,60 Q30,20 60,45 T120,25 T180,40 T200,15"
          fill="none"
          stroke="hsl(172 66% 50% / 0.1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* Floating KPI cards */}
      <motion.div
        className="absolute left-[15%] top-[18%] w-24 h-14 rounded-lg border border-primary/[0.08] bg-primary/[0.03] backdrop-blur-sm"
        animate={{ y: [0, -12, 5, -8, 0], rotate: [-2, 1, -1, 2, -2] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="p-2">
          <div className="w-8 h-1.5 rounded bg-primary/10 mb-1.5" />
          <div className="w-12 h-3 rounded bg-primary/[0.07]" />
        </div>
      </motion.div>

      <motion.div
        className="absolute right-[12%] bottom-[35%] w-20 h-12 rounded-lg border border-primary/[0.08] bg-primary/[0.03] backdrop-blur-sm"
        animate={{ y: [0, 10, -6, 8, 0], rotate: [1, -2, 1, -1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <div className="p-2">
          <div className="w-6 h-1.5 rounded bg-primary/10 mb-1.5" />
          <div className="w-10 h-3 rounded bg-primary/[0.07]" />
        </div>
      </motion.div>

      {/* Pie segments */}
      <motion.svg
        className="absolute left-[70%] top-[65%]"
        width="60" height="60" viewBox="0 0 60 60"
        animate={{ rotate: [0, -360] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="30" cy="30" r="25" fill="none" stroke="hsl(172 66% 50% / 0.05)" strokeWidth="6" />
        <circle cx="30" cy="30" r="25" fill="none" stroke="hsl(220 20% 60% / 0.08)" strokeWidth="6"
          strokeDasharray="40 117" strokeDashoffset="0" />
      </motion.svg>

      {/* Grid dots */}
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(hsl(172 66% 50% / 0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
    </div>
  );
}

export function MoodleConnectForm({ onConnect, isConnected, onDisconnect, configUrl }: MoodleConnectFormProps) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) return;
    setTesting(true);
    await new Promise((r) => setTimeout(r, 500));
    onConnect(url, token);
    setTesting(false);
  };

  if (isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card glow-primary">
          <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm sm:text-base">Conectado a Moodle</p>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">{configUrl}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground hover:text-destructive shrink-0">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Desconectar</span>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="relative overflow-hidden border-border/50 shadow-2xl shadow-primary/10 bg-card/90 backdrop-blur-2xl">
            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

            <CardContent className="p-10 sm:p-12 pt-12 sm:pt-14">
              {/* Illustration or Logo */}
              {testing ? (
                <motion.div
                  className="flex justify-center mb-8"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.img
                    src={loginIllustration}
                    alt="Dashboard"
                    className="w-56 h-auto drop-shadow-xl"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  className="flex justify-center mb-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl scale-[2]" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20">
                      <GraduationCap className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Title */}
              <motion.div
                className="text-center mb-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {testing ? "Conectando..." : "Moodle AI Analytics"}
                </h1>
                <p className="text-base text-muted-foreground">
                  {testing ? "Estableciendo conexión con tu campus" : "Conectá tu campus para comenzar"}
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="moodle-url" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    URL del Campus
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="moodle-url"
                      type="url"
                      placeholder="https://tucampus.edu/moodle"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-11 h-13 text-base bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                      required
                      disabled={testing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moodle-token" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Token de Web Service
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                      id="moodle-token"
                      type="password"
                      placeholder="Tu token de API"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="pl-11 h-13 text-base bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                      required
                      disabled={testing}
                    />
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-2">
                  <Button type="submit" variant="gradient" className="w-full h-13 text-base font-semibold" disabled={testing || !url || !token}>
                    {testing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Conectando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Plug className="h-5 w-5" />
                        Conectar
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.form>

              <motion.p
                className="text-xs text-muted-foreground/50 text-center mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Compatible con Moodle 4.x y 5.x
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
