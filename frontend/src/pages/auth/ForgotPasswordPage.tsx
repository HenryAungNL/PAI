import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password-reset/", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure link to choose a new password.">
      {sent ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div className="text-sm text-neutral-700">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="mt-0.5">
                If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
              </p>
            </div>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                aria-invalid={Boolean(error)}
              />
            </div>
            <FieldError>{error}</FieldError>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset link
          </Button>

          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
