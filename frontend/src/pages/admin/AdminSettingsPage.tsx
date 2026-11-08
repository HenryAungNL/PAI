import { useEffect, useState } from "react";
import { Globe, Save, Share2, SlidersHorizontal, FileText, Mail } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelperText, Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import type { PlatformSettings } from "@/types";

type SettingsForm = Omit<PlatformSettings, "updated_at">;

const emptyForm: SettingsForm = {
  site_name: "",
  tagline: "",
  support_email: "",
  contact_phone: "",
  contact_address: "",
  twitter_url: "",
  linkedin_url: "",
  instagram_url: "",
  youtube_url: "",
  facebook_url: "",
  terms_url: "",
  privacy_url: "",
  refund_policy_url: "",
  allow_instructor_registration: true,
  stripe_test_mode: true,
};

function toForm(settings: PlatformSettings): SettingsForm {
  const { updated_at: _updatedAt, ...rest } = settings;
  return rest;
}

export function AdminSettingsPage() {
  const settings = useAdminSettings();
  const update = useUpdateAdminSettings();

  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [syncKey, setSyncKey] = useState<string | null>(null);

  // Hydrate the form when the server payload arrives (or is refetched).
  const key = settings.data ? settings.data.updated_at : null;
  useEffect(() => {
    if (settings.data && key !== syncKey) {
      setSyncKey(key);
      setForm(toForm(settings.data));
    }
  }, [settings.data, key, syncKey]);

  const set = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const onSave = () => {
    if (!form.site_name.trim()) {
      toast.error("A site name is required.");
      return;
    }
    if (!form.support_email.trim()) {
      toast.error("A support email is required.");
      return;
    }
    update.mutate(form, {
      onSuccess: () => toast.success("Platform settings saved."),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "We could not save your settings."),
    });
  };

  if (settings.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-16 w-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Settings" description="Platform-wide configuration for the PAI site." />
        <ErrorState message="We could not load the platform settings." onRetry={() => settings.refetch()} />
      </div>
    );
  }

  const updatedAt = new Date(settings.data.updated_at);

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <PageHeader
        title="Settings"
        description="Platform-wide configuration surfaced across the public site and checkout."
        actions={
          <Button onClick={onSave} loading={update.isPending}>
            <Save />
            Save changes
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <Globe className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle>Site identity</CardTitle>
                <CardDescription>How PAI presents itself to visitors.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Site name</Label>
              <Input
                id="site-name"
                value={form.site_name}
                onChange={(e) => set("site_name", e.target.value)}
                placeholder="PAI"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="Learn skills that move your career forward"
              />
              <HelperText>Shown in the footer and alongside the logo.</HelperText>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <Mail className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle>Contact details</CardTitle>
                <CardDescription>Where learners reach the support team.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="support-email">Support email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={form.support_email}
                  onChange={(e) => set("support_email", e.target.value)}
                  placeholder="support@pai.demo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                  placeholder="+1 (555) 010-2030"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-address">Address</Label>
              <Textarea
                id="contact-address"
                rows={2}
                value={form.contact_address}
                onChange={(e) => set("contact_address", e.target.value)}
                placeholder="123 Learning Lane, Suite 400, San Francisco, CA"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <Share2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle>Social links</CardTitle>
                <CardDescription>Leave a field blank to hide that icon in the footer.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="twitter">Twitter / X</Label>
              <Input
                id="twitter"
                value={form.twitter_url}
                onChange={(e) => set("twitter_url", e.target.value)}
                placeholder="https://twitter.com/…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={form.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/company/…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={form.instagram_url}
                onChange={(e) => set("instagram_url", e.target.value)}
                placeholder="https://instagram.com/…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                value={form.youtube_url}
                onChange={(e) => set("youtube_url", e.target.value)}
                placeholder="https://youtube.com/@…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={form.facebook_url}
                onChange={(e) => set("facebook_url", e.target.value)}
                placeholder="https://facebook.com/…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <FileText className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle>Legal pages</CardTitle>
                <CardDescription>Links used by the footer and checkout consent copy.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="terms">Terms of service</Label>
              <Input
                id="terms"
                value={form.terms_url}
                onChange={(e) => set("terms_url", e.target.value)}
                placeholder="/legal/terms"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="privacy">Privacy policy</Label>
              <Input
                id="privacy"
                value={form.privacy_url}
                onChange={(e) => set("privacy_url", e.target.value)}
                placeholder="/legal/privacy"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refund">Refund policy</Label>
              <Input
                id="refund"
                value={form.refund_policy_url}
                onChange={(e) => set("refund_policy_url", e.target.value)}
                placeholder="/legal/refunds"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <SlidersHorizontal className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle>Features</CardTitle>
                <CardDescription>Toggle platform capabilities.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              id="allow-instructor-registration"
              checked={form.allow_instructor_registration}
              onChange={(v) => set("allow_instructor_registration", v)}
              label="Allow instructor registration"
              hint="When disabled, new signups can only create student accounts."
            />
            <ToggleRow
              id="stripe-test-mode"
              checked={form.stripe_test_mode}
              onChange={(v) => set("stripe_test_mode", v)}
              label="Stripe test mode"
              hint="Show the test-mode badge at checkout. Live keys must still be configured on the server."
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Last updated {updatedAt.toLocaleString()}
          </p>
          <Button onClick={onSave} loading={update.isPending}>
            <Save />
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <HelperText>{hint}</HelperText>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 " +
          (checked ? "bg-primary" : "bg-neutral-300")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
            (checked ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}
