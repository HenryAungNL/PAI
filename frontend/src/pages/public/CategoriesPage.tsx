import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { CategoryIcon } from "@/components/courses/CategoryIcon";
import { SmartImage } from "@/components/ui/smart-image";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCategories } from "@/hooks/useApi";
import { truncate } from "@/lib/utils";

export function CategoriesPage() {
  const categories = useCategories();

  return (
    <div className="container py-10 lg:py-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Browse by category</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a topic to explore curated courses from expert instructors.
        </p>
      </header>

      {categories.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : categories.isError ? (
        <ErrorState message="We could not load categories." onRetry={() => categories.refetch()} />
      ) : (categories.data ?? []).length === 0 ? (
        <EmptyState title="No categories yet" description="Categories will appear here once they are published." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(categories.data ?? []).map((category) => (
            <Link key={category.id} to={`/courses?category=${category.slug}`} aria-label={category.name}>
              <Card className="group h-full overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card-hover">
                <SmartImage
                  src={category.image_url || null}
                  alt={category.name}
                  ratioClassName="aspect-[16/9]"
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                      <CategoryIcon name={category.icon} className="h-5 w-5" />
                    </span>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">{category.name}</h2>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{truncate(category.description, 120)}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    {category.course_count ?? 0} course{category.course_count === 1 ? "" : "s"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
