import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, GraduationCap, Presentation } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    password_confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirm, {
    path: ["password_confirm"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser, status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<"student" | "instructor">(
    params.get("role") === "instructor" ? "instructor" : "student",
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "", password_confirm: "" },
  });

  useEffect(() => {
    if (status === "authenticated") navigate("/dashboard", { replace: true });
  }, [status, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      const user = await registerUser({
        email: values.email,
        password: values.password,
        password_confirm: values.password_confirm,
        first_name: values.first_name,
        last_name: values.last_name,
        role,
      });
      if (user.role === "instructor") {
        toast.success("Instructor account created. An administrator will review your profile.");
        navigate("/instructor", { replace: true });
      } else {
        toast.success("Welcome to PAI!");
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "We could not create your account.";
      setError("root", { message });
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Free to join — start learning in minutes.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {errors.root && (
          <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {errors.root.message}
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">I want to</legend>
          <div className="grid grid-cols-2 gap-3">
            <RoleOption
              selected={role === "student"}
              onSelect={() => setRole("student")}
              icon={GraduationCap}
              title="Learn"
              description="Take courses as a student"
            />
            <RoleOption
              selected={role === "instructor"}
              onSelect={() => setRole("instructor")}
              icon={Presentation}
              title="Teach"
              description="Create and sell courses"
            />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" autoComplete="given-name" aria-invalid={Boolean(errors.first_name)} {...register("first_name")} />
            <FieldError>{errors.first_name?.message}</FieldError>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" autoComplete="family-name" aria-invalid={Boolean(errors.last_name)} {...register("last_name")} />
            <FieldError>{errors.last_name?.message}</FieldError>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password_confirm">Confirm password</Label>
          <Input
            id="password_confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password_confirm)}
            {...register("password_confirm")}
          />
          <FieldError>{errors.password_confirm?.message}</FieldError>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function RoleOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-primary bg-primary-50" : "border-border hover:border-primary-200 hover:bg-muted",
      )}
    >
      <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
