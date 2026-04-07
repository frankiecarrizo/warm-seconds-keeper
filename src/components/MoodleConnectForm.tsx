import { useState } from "react";
import { Globe, Key, Plug, Loader2, LogOut, GraduationCap, BarChart3, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface MoodleConnectFormProps {
  onConnect: (url: string, token: string) => void;
  isConnected: boolean;
  onDisconnect: () => void;
  configUrl?: string;
}

const floatingIcons = [
  { Icon: BarChart3, x: "10%", y: "20%", delay: 0, size: 20 },
  { Icon: Users, x: "85%", y: "15%", delay: 0.5, size: 18 },
  { Icon: BookOpen, x: "75%", y: "75%", delay: 1, size: 22 },
  { Icon: GraduationCap, x: "15%", y: "80%", delay: 1.5, size: 16 },
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
    <div className="relative w-full max-w-md mx-auto">
      {/* Floating animated icons */}
      {floatingIcons.map(({ Icon, x, y, delay, size }, i) => (
        <motion.div
          key={i}
          className="absolute text-primary/15 pointer-events-none"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.4, 0.2, 0.4],
            scale: [0.5, 1, 0.9, 1],
            y: [0, -10, 5, -10],
          }}
          transition={{
            duration: 4,
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

          <CardContent className="p-6 sm:p-8 pt-8 sm:pt-10">
            {/* Logo */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl scale-150" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-foreground mb-1">Moodle AI Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Conectá tu campus para comenzar
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="space-y-1.5">
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
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
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
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" variant="gradient" className="w-full h-11 text-sm font-semibold" disabled={testing || !url || !token}>
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
              className="text-[11px] text-muted-foreground/60 text-center mt-4"
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
