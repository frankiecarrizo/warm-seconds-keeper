import { useState } from "react";
import { Globe, Key, Plug, Loader2, LogOut, GraduationCap, BarChart3, Users, BookOpen, PieChart, TrendingUp, Activity } from "lucide-react";
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

const bgShapes = [
  { x: "5%", y: "10%", size: 180, delay: 0, duration: 20 },
  { x: "80%", y: "5%", size: 120, delay: 2, duration: 25 },
  { x: "70%", y: "70%", size: 200, delay: 4, duration: 22 },
  { x: "10%", y: "75%", size: 140, delay: 1, duration: 18 },
  { x: "50%", y: "85%", size: 100, delay: 3, duration: 24 },
  { x: "90%", y: "40%", size: 90, delay: 5, duration: 20 },
];

const floatingIcons = [
  { Icon: BarChart3, x: "8%", y: "25%", delay: 0, size: 24 },
  { Icon: Users, x: "88%", y: "18%", delay: 0.8, size: 22 },
  { Icon: BookOpen, x: "82%", y: "72%", delay: 1.6, size: 26 },
  { Icon: GraduationCap, x: "12%", y: "78%", delay: 2.4, size: 20 },
  { Icon: PieChart, x: "92%", y: "50%", delay: 0.4, size: 18 },
  { Icon: TrendingUp, x: "5%", y: "50%", delay: 1.2, size: 20 },
  { Icon: Activity, x: "50%", y: "8%", delay: 2, size: 22 },
];

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
    <div className="relative w-full max-w-lg mx-auto">
      {/* Background animated blobs */}
      {bgShapes.map((shape, i) => (
        <motion.div
          key={`blob-${i}`}
          className="absolute rounded-full bg-primary/[0.04] pointer-events-none"
          style={{
            left: shape.x,
            top: shape.y,
            width: shape.size,
            height: shape.size,
            filter: "blur(40px)",
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -10, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: shape.duration,
            delay: shape.delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Floating animated icons */}
      {floatingIcons.map(({ Icon, x, y, delay, size }, i) => (
        <motion.div
          key={i}
          className="absolute text-primary/10 pointer-events-none"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.3, 0.15, 0.3],
            scale: [0.5, 1, 0.85, 1],
            y: [0, -15, 8, -15],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 5,
            delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        >
          <Icon size={size} />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="relative overflow-hidden border-border/50 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-xl">
          {/* Gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <CardContent className="p-8 sm:p-10 pt-10 sm:pt-12">
            {/* Illustration shown while connecting */}
            {testing ? (
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.img
                  src={loginIllustration}
                  alt="Dashboard"
                  className="w-48 h-auto drop-shadow-lg"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ) : (
              /* Logo */
              <motion.div
                className="flex justify-center mb-8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl scale-150" />
                  <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <GraduationCap className="h-9 w-9 text-primary" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Title */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {testing ? "Conectando..." : "Moodle AI Analytics"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {testing ? "Estableciendo conexión con tu campus" : "Conectá tu campus para comenzar"}
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="space-y-2">
                <Label htmlFor="moodle-url" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  URL del Campus
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="moodle-url"
                    type="url"
                    placeholder="https://tucampus.edu/moodle"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
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
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="moodle-token"
                    type="password"
                    placeholder="Tu token de API"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                    required
                    disabled={testing}
                  />
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="pt-1">
                <Button type="submit" variant="gradient" className="w-full h-12 text-sm font-semibold" disabled={testing || !url || !token}>
                  {testing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Conectando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plug className="h-4 w-4" />
                      Conectar
                    </span>
                  )}
                </Button>
              </motion.div>
            </motion.form>

            <motion.p
              className="text-[11px] text-muted-foreground/60 text-center mt-5"
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
  );
}
