import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { dashboardPathForRole } from "@/lib/navigation";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // Already signed in? Skip the form.
  useEffect(() => {
    if (status === "authenticated") {
      navigate(from ?? dashboardPathForRole(user?.role), { replace: true });
    }
  }, [status, user, from, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      const signedIn = await login(values.email, values.password);
      navigate(from ?? dashboardPathForRole(signedIn.role), { replace: true });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "We could not sign you in. Please try again.";
      setError("root", { message });
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue learning.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errors.root && (
          <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {errors.root.message}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          New to PAI?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
