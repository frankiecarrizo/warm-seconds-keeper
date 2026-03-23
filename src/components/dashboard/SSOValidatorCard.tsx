import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateSSO } from "@/lib/moodle-api";
import { Shield, Loader2, CheckCircle, XCircle } from "lucide-react";

const SSOValidatorCard = () => {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; payload?: any; error?: string } | null>(null);

  const handleValidate = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await validateSSO(token);
      setResult(res);
    } catch (err: any) {
      setResult({ valid: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Validador SSO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Valida tokens JWT de Single Sign-On
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Pega tu token JWT aquí..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-xs"
          />
          <Button onClick={handleValidate} disabled={loading || !token.trim()} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
          </Button>
        </div>

        {result && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              result.valid
                ? "border-accent/30 bg-accent/5"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.valid ? (
                <>
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="font-medium text-accent">Token válido</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    Token inválido: {result.error}
                  </span>
                </>
              )}
            </div>
            {result.payload && (
              <pre className="text-xs font-mono bg-background/60 rounded p-2 overflow-x-auto">
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SSOValidatorCard;
