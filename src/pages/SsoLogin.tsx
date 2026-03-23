import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SsoLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const token = searchParams.get("token");
    const moodleUrl = searchParams.get("moodle_url");
    const wstoken = searchParams.get("wstoken");

    if (!token || !moodleUrl || !wstoken) {
      setError("Faltan parámetros requeridos (token, moodle_url, wstoken).");
      setValidating(false);
      return;
    }

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("validate-sso", {
          body: { token },
        });

        if (fnError || !data?.valid) {
          setError(data?.error || fnError?.message || "Token SSO inválido o expirado.");
          setValidating(false);
          return;
        }

        // Token is valid — store Moodle config
        const config = {
          moodleUrl: moodleUrl.replace(/\/+$/, ""),
          moodleToken: wstoken,
        };
        localStorage.setItem("moodle-config", JSON.stringify(config));
        localStorage.setItem("sso-auth-token", token);

        // Redirect to dashboard (Index page)
        navigate("/", { replace: true });
      } catch (e: any) {
        setError(e.message || "Error de validación.");
        setValidating(false);
      }
    })();
  }, [searchParams, navigate]);

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando acceso desde Moodle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Error de autenticación</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate("/", { replace: true })}>
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default SsoLogin;
