import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setMoodleConnection } from "@/lib/moodle-store";
import { getSiteInfo } from "@/lib/moodle-api";
import { toast } from "sonner";
import { Globe, Key, Loader2, GraduationCap } from "lucide-react";

interface Props {
  onConnected: () => void;
}

const MoodleConnectForm = ({ onConnected }: Props) => {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !token) return;

    setLoading(true);
    try {
      // Save connection first so the proxy can use it
      const cleanUrl = url.replace(/\/+$/, "");
      setMoodleConnection({ moodleUrl: cleanUrl, moodleToken: token });

      // Test connection
      const info = await getSiteInfo();
      setMoodleConnection({
        moodleUrl: cleanUrl,
        moodleToken: token,
        siteName: info.sitename,
        username: info.username,
      });

      toast.success(`Conectado a ${info.sitename}`);
      onConnected();
    } catch (err: any) {
      toast.error("Error de conexión: " + (err.message || "Verifica tus credenciales"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Learner Arc</CardTitle>
          <CardDescription className="text-base">
            Conecta tu plataforma Moodle para analizar el rendimiento académico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4 text-muted-foreground" />
                URL de Moodle
              </Label>
              <Input
                id="url"
                placeholder="https://tu-moodle.edu.ar"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4 text-muted-foreground" />
                Token de Web Service
              </Label>
              <Input
                id="token"
                type="password"
                placeholder="Tu token de Moodle"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Administración del sitio → Servicios web → Tokens
              </p>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Conectar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MoodleConnectForm;
