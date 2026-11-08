import { Link } from "react-router-dom";
import { Clock, Users } from "lucide-react";

import { SmartImage } from "@/components/ui/smart-image";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating";
import { Avatar } from "@/components/ui/avatar";
import { difficultyLabels, formatDuration, formatPrice, truncate } from "@/lib/utils";
import type { CourseListItem } from "@/types";

interface CourseCardProps {
  course: CourseListItem;
  className?: string;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover">
      <Link to={`/courses/${course.slug}`} className="relative block" aria-label={course.title}>
        <SmartImage
          src={course.thumbnail_url}
          alt={course.title}
          ratioClassName="aspect-[16/9]"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 flex gap-2">
          {course.category && <Badge variant="solid" className="shadow-sm">{course.category.name}</Badge>}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{difficultyLabels[course.difficulty] ?? course.difficulty}</Badge>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatDuration(course.total_duration_minutes)}
          </span>
        </div>

        <h3 className="mb-1.5 line-clamp-2 text-base font-semibold leading-snug text-foreground">
          <Link to={`/courses/${course.slug}`} className="hover:text-primary">
            {course.title}
          </Link>
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{truncate(course.subtitle || "", 110)}</p>

        <div className="mt-auto">
          <div className="mb-3 flex items-center gap-2">
            <Avatar src={course.instructor.avatar} name={course.instructor.full_name} size="sm" />
            <span className="truncate text-sm text-muted-foreground">{course.instructor.full_name}</span>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-sm">
                <RatingStars value={Number(course.average_rating)} size={14} />
                <span className="font-medium">{Number(course.average_rating).toFixed(1)}</span>
                <span className="text-muted-foreground">({course.review_count})</span>
              </span>
            </div>
            <span className={`text-base font-bold ${course.is_free ? "text-success" : "text-foreground"}`}>
              {formatPrice(course.price_cents, course.currency)}
            </span>
          </div>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {course.enrollment_count} enrolled · {course.lesson_count} lessons
          </p>
        </div>
      </div>
    </article>
  );
}
