import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/AuthContext";
import { useChangePassword, useUpdateProfile } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  headline: z.string().trim().max(120, "Keep it under 120 characters").optional(),
  bio: z.string().trim().max(600, "Keep it under 600 characters").optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });
type PasswordValues = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile and account security." />

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6"
        tabs={[
          { value: "profile", label: "Profile" },
          { value: "security", label: "Security" },
        ]}
      />

      {tab === "profile" ? <ProfileForm /> : <PasswordForm />}
    </div>
  );
}

function ProfileForm() {
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      headline: user?.headline ?? "",
      bio: user?.bio ?? "",
    },
  });

  const onSubmit = async (values: ProfileValues) => {
    try {
      const updated = await updateProfile.mutateAsync(values);
      updateUser(updated);
      reset(values);
      toast.success("Profile updated.");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "We could not save your profile.";
      setError("root", { message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" aria-hidden />
            Your profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar src={user?.avatar || user?.avatar_url} name={user?.full_name ?? "User"} size="xl" />
            <div>
              <p className="font-semibold text-foreground">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                {user?.role} · joined {formatDate(user?.date_joined)}
              </p>
            </div>
          </div>

          {errors.root && (
            <div
              className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-danger"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {errors.root.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" aria-invalid={Boolean(errors.first_name)} {...register("first_name")} />
              <FieldError>{errors.first_name?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" aria-invalid={Boolean(errors.last_name)} {...register("last_name")} />
              <FieldError>{errors.last_name?.message}</FieldError>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="e.g. Product designer & mentor"
              aria-invalid={Boolean(errors.headline)}
              {...register("headline")}
            />
            <FieldError>{errors.headline?.message}</FieldError>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              placeholder="Tell learners a little about yourself."
              aria-invalid={Boolean(errors.bio)}
              {...register("bio")}
            />
            <FieldError>{errors.bio?.message}</FieldError>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function PasswordForm() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const onSubmit = async (values: PasswordValues) => {
    try {
      const result = await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success(result.detail || "Password updated.");
      reset();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "We could not change your password.";
      setError("root", { message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {errors.root && (
            <div
              className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-danger"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {errors.root.message}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.current_password)}
              {...register("current_password")}
            />
            <FieldError>{errors.current_password?.message}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.new_password)}
                {...register("new_password")}
              />
              <FieldError>{errors.new_password?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm_password)}
                {...register("confirm_password")}
              />
              <FieldError>{errors.confirm_password?.message}</FieldError>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
