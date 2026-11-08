import { Link, useNavigate } from "react-router-dom";
import { Award, BadgeCheck, Compass, HeartHandshake, Target, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePublicStats } from "@/hooks/useApi";

const values = [
  {
    icon: Target,
    title: "Depth over hype",
    body: "We would rather publish one excellent course than ten rushed ones. Quality is our growth strategy.",
  },
  {
    icon: BadgeCheck,
    title: "Practitioner-led",
    body: "Instructors are approved professionals. We vet their work, not just their follower counts.",
  },
  {
    icon: HeartHandshake,
    title: "Learner-first",
    body: "Transparent pricing, no dark patterns and a refund policy we actually honour.",
  },
];

const milestones = [
  { label: "Courses", value: "courses" },
  { label: "Instructors", value: "instructors" },
  { label: "Learners", value: "students" },
];

export function AboutPage() {
  const navigate = useNavigate();
  const stats = usePublicStats();
  const statMap: Record<string, number | undefined> = {
    courses: stats.data?.courses,
    instructors: stats.data?.instructors,
    students: stats.data?.students,
  };

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container py-16 text-center lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Our mission
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Making quality education accessible to everyone
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            PAI brings together expert instructors and curious learners. We believe the best way to learn a
            skill is to learn it from someone who practises it — with clear structure and honest expectations.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/courses")}>
              Explore courses
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/register")}>
              Join free
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <dl className="grid gap-6 sm:grid-cols-3">
          {milestones.map((m) => (
            <Card key={m.value} className="p-6 text-center">
              <dd className="text-4xl font-bold text-primary">
                {statMap[m.value] === undefined ? "—" : statMap[m.value]?.toLocaleString()}
              </dd>
              <dt className="mt-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">{m.label}</dt>
            </Card>
          ))}
        </dl>
      </section>

      <section className="bg-surface py-16">
        <div className="container">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">What we stand for</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {values.map((value) => (
              <Card key={value.title} className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <value.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{value.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Built for learners and teachers</h2>
            <p className="mt-4 text-muted-foreground">
              PAI is a complete learning platform: a catalogue for learners, an authoring workspace for
              instructors and a moderation dashboard for administrators. Instructors keep a fair share of every
              sale, and every certificate can be verified publicly.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                Role-based workspaces for students, instructors and admins.
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                Verifiable certificates issued automatically at 100% completion.
              </li>
              <li className="flex items-start gap-3 text-sm">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                Secure Stripe payments with server-authoritative pricing.
              </li>
            </ul>
          </div>
          <Card className="p-8">
            <h3 className="text-lg font-semibold">Want to teach on PAI?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create an instructor account and submit your first course for review. Our team will help you get
              it classroom-ready.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => navigate("/register?role=instructor")}>Become an instructor</Button>
              <Button variant="outline" onClick={() => navigate("/contact")}>
                Talk to us
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="container pb-20 text-center">
        <p className="text-sm text-muted-foreground">
          Questions?{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            Get in touch
          </Link>{" "}
          — we usually reply within one business day.
        </p>
      </section>
    </div>
  );
}
