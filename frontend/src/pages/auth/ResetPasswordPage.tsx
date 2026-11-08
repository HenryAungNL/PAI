import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invalidLink = !uid || !token;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm/", {
        uid,
        token,
        password,
        password_confirm: confirm,
      });
      toast.success("Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick something strong that you don't use elsewhere.">
      {invalidLink ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            This reset link is missing or malformed. Please request a new one.
          </div>
          <Link to="/forgot-password" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <FieldError>{password && confirm && password !== confirm ? "Passwords do not match" : undefined}</FieldError>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
