import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/layout/Logo";

const highlights = [
  "Learn from vetted industry experts",
  "Track progress across every device",
  "Earn certificates you can verify and share",
];

/** Split layout used by the login, registration and password-reset screens. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo />
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 lg:block">
        <div className="flex h-full flex-col justify-center px-16 text-white">
          <h2 className="text-3xl font-bold leading-tight">Start learning something new today.</h2>
          <p className="mt-4 max-w-md text-primary-50">
            Join a growing community of learners and instructors on PAI.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-primary-50">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-12 text-sm text-primary-100/80">
            <Link to="/" className="underline-offset-4 hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
