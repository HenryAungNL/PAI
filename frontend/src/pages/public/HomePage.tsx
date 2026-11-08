import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Infinity as InfinityIcon,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { CourseCard } from "@/components/courses/CourseCard";
import { CategoryIcon } from "@/components/courses/CategoryIcon";
import { SmartImage } from "@/components/ui/smart-image";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating";
import { CourseGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import {
  useCategories,
  useCourseReviews,
  useCourses,
  useInstructors,
  usePublicStats,
} from "@/hooks/useApi";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80";

const valueProps = [
  {
    icon: PlayCircle,
    title: "Learn by doing",
    body: "Short, focused lessons and hands-on projects that mirror the work you will actually do.",
  },
  {
    icon: BadgeCheck,
    title: "Taught by practitioners",
    body: "Every instructor is an approved professional with real experience shipping and leading.",
  },
  {
    icon: InfinityIcon,
    title: "Lifetime access",
    body: "Buy once and keep access to your lessons, notes and updates for as long as PAI exists.",
  },
  {
    icon: Award,
    title: "Certificates that verify",
    body: "Finish a course and receive a certificate with a public verification page you can share.",
  },
];

const steps = [
  { title: "Find your course", body: "Browse by category or search the catalogue to find the skill you want next." },
  { title: "Learn at your pace", body: "Work through video lessons, notes and practice — on desktop or mobile." },
  { title: "Earn your certificate", body: "Complete every lesson to unlock a verifiable certificate of completion." },
];

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const categories = useCategories();
  const popular = useCourses({ sort: "popular", page_size: 6 });
  const instructors = useInstructors(4);
  const stats = usePublicStats();

  // Real testimonials: pull the highest-enrolling course's published reviews.
  const topCourseId = popular.data?.results?.[0]?.id;
  const reviews = useCourseReviews(topCourseId, 1);
  const testimonials = (reviews.data?.results ?? []).slice(0, 3);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/courses?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface">
        <div className="container grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              New courses added every week
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Learn new skills.
              <br />
              <span className="text-primary">Advance your career.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Expert-led courses in technology, business, design and beyond — learn at your own pace and
              earn certificates that verify your progress.
            </p>

            <form onSubmit={onSearch} className="mt-8 flex max-w-lg gap-2" role="search">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What do you want to learn today?"
                  aria-label="Search courses"
                  className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>

            <dl className="mt-10 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label="Courses" value={stats.data?.courses} suffix="+" />
              <Stat label="Instructors" value={stats.data?.instructors} suffix="+" />
              <Stat label="Learners" value={stats.data?.students} suffix="+" />
              <Stat
                label="Avg. rating"
                value={stats.data?.average_rating ? stats.data.average_rating.toFixed(1) : undefined}
              />
            </dl>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-card-hover">
              <SmartImage src={HERO_IMAGE} alt="Students learning together" ratioClassName="aspect-[4/3]" />
            </div>
            <Card className="absolute -bottom-5 -left-5 hidden max-w-[15rem] p-4 shadow-card-hover sm:block">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary">
                  <Award className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Certificates</p>
                  <p className="text-xs text-muted-foreground">Verified completion</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16 lg:py-20">
        <SectionHeading
          eyebrow="Browse by topic"
          title="Explore our categories"
          description="Find the right path — from programming and data science to design, marketing and personal growth."
          action={
            <Button variant="outline" onClick={() => navigate("/categories")}>
              All categories
              <ArrowRight />
            </Button>
          }
        />
        {categories.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(categories.data ?? []).slice(0, 6).map((category) => (
              <Link
                key={category.id}
                to={`/courses?category=${category.slug}`}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <CategoryIcon name={category.icon} className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold leading-tight text-foreground">{category.name}</span>
                <span className="text-xs text-muted-foreground">{category.course_count ?? 0} courses</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular courses */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="container">
          <SectionHeading
            eyebrow="Most popular"
            title="Trending courses this month"
            description="Join thousands of learners in the courses they rate most highly."
            action={
              <Button variant="outline" onClick={() => navigate("/courses?sort=popular")}>
                Browse all
                <ArrowRight />
              </Button>
            }
          />
          {popular.isLoading ? (
            <CourseGridSkeleton count={6} />
          ) : popular.isError ? (
            <ErrorState message="We could not load courses right now." onRetry={() => popular.refetch()} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(popular.data?.results ?? []).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why PAI */}
      <section className="container py-16 lg:py-20">
        <SectionHeading
          eyebrow="Why PAI"
          title="A calmer way to learn online"
          description="No noise, no gimmicks — just well-structured courses and the tools you need to finish them."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((prop) => (
            <Card key={prop.title} className="p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
                <prop.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{prop.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{prop.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="container">
          <SectionHeading eyebrow="How it works" title="Start learning in three steps" />
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative rounded-xl border border-border bg-card p-6 shadow-card">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Instructors */}
      <section className="container py-16 lg:py-20">
        <SectionHeading
          eyebrow="Meet the experts"
          title="Learn from practitioners"
          description="Our instructors are vetted professionals who teach what they do every day."
        />
        {instructors.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(instructors.data ?? []).map((instructor) => (
              <Link
                key={instructor.id}
                to={`/instructors/${instructor.id}`}
                className="group flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover"
              >
                <Avatar src={instructor.avatar} name={instructor.full_name} size="xl" />
                <h3 className="mt-4 text-base font-semibold text-foreground group-hover:text-primary">
                  {instructor.full_name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{instructor.headline}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  {instructor.course_count} courses
                  <span aria-hidden>·</span>
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {instructor.student_count} learners
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-surface py-16 lg:py-20">
          <div className="container">
            <SectionHeading eyebrow="Loved by learners" title="What students are saying" />
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((review) => (
                <Card key={review.id} className="flex flex-col p-6">
                  <RatingStars value={review.rating} size={16} />
                  {review.title && <h3 className="mt-3 text-base font-semibold text-foreground">{review.title}</h3>}
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">"{review.body}"</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                    <Avatar src={review.student.avatar} name={review.student.full_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{review.student.full_name}</p>
                      <p className="text-xs text-muted-foreground">Verified learner</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 px-8 py-14 text-center shadow-card-hover sm:px-14">
          <Star className="mx-auto h-8 w-8 text-white/90" aria-hidden />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to start learning?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-primary-50">
            Create a free account to save courses, track your progress and earn certificates — or explore the
            catalogue first.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" className="bg-white text-primary-700 hover:bg-white/90" onClick={() => navigate("/register")}>
              Create free account
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/courses")}
            >
              Explore courses
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: number | string | undefined; suffix?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-foreground">
        {value === undefined ? (
          <Skeleton className="h-7 w-12" />
        ) : typeof value === "number" ? (
          `${value.toLocaleString()}${suffix}`
        ) : (
          `${value}${suffix}`
        )}
      </dd>
    </div>
  );
}
