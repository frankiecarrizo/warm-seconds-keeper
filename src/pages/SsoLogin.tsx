import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";

const SsoLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { connect } = useMoodleConnection();
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

    // Save SSO token for reference
    localStorage.setItem("sso-auth-token", token);

    // Use the same connect flow as manual login
    const cleanUrl = moodleUrl.replace(/\/+$/, "");
    connect(cleanUrl, wstoken);

    // Navigate after triggering connect
    navigate("/", { replace: true });
  }, [searchParams, navigate, connect]);

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
