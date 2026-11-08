import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { useSiteConfig } from "@/hooks/useApi";

const exploreLinks = [
  { to: "/courses", label: "All courses" },
  { to: "/categories", label: "Categories" },
  { to: "/instructors", label: "Instructors" },
  { to: "/verify", label: "Verify a certificate" },
];

const companyLinks = [
  { to: "/about", label: "About PAI" },
  { to: "/contact", label: "Contact us" },
  { to: "/terms", label: "Terms of service" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/refund-policy", label: "Refund policy" },
];

export function Footer() {
  const { data: config } = useSiteConfig();
  const year = new Date().getFullYear();
  const socials = [
    { href: config?.twitter_url, icon: Twitter, label: "Twitter" },
    { href: config?.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { href: config?.instagram_url, icon: Instagram, label: "Instagram" },
    { href: config?.youtube_url, icon: Youtube, label: "YouTube" },
    { href: config?.facebook_url, icon: Facebook, label: "Facebook" },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            {config?.tagline ??
              "Learn in-demand skills from expert instructors and advance your career at your own pace."}
          </p>
          {socials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href as string}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-neutral-600 transition-colors hover:border-primary-200 hover:text-primary"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Explore">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Explore</h3>
          <ul className="space-y-2.5">
            {exploreLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Company</h3>
          <ul className="space-y-2.5">
            {companyLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Get in touch</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {config?.support_email && (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href={`mailto:${config.support_email}`} className="hover:text-primary">
                  {config.support_email}
                </a>
              </li>
            )}
            {config?.contact_phone && (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{config.contact_phone}</span>
              </li>
            )}
            {config?.contact_address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{config.contact_address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {year} {config?.site_name ?? "PAI"}. All rights reserved.
          </p>
          <p className="text-xs">
            Demo build — seeded courses, reviews and accounts are fictional examples.
          </p>
        </div>
      </div>
    </footer>
  );
}
