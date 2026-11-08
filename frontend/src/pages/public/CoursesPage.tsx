import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";

import { CourseCard } from "@/components/courses/CourseCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { CourseGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCategories, useCourses, type CourseFilters } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const difficultyOptions = [
  { value: "", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
];

export function CoursesPage() {
  const [params, setParams] = useSearchParams();
  const categories = useCategories();

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const sort = params.get("sort") ?? "newest";
  const free = params.get("free") === "true";
  const minRating = params.get("min_rating") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const debouncedSearch = useDebounce(search, 350);

  const filters: CourseFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: category || undefined,
      difficulty: difficulty || undefined,
      sort,
      free: free || undefined,
      min_rating: minRating ? Number(minRating) : undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, category, difficulty, sort, free, minRating, page],
  );

  const courses = useCourses(filters);
  const activeFilterCount = [category, difficulty, free ? "free" : "", minRating].filter(Boolean).length;

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    setParams(next, { replace: true });
  };

  const total = courses.data?.count ?? 0;

  return (
    <div className="container py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Explore courses</h1>
        <p className="mt-2 text-muted-foreground">
          {courses.isLoading ? "Searching the catalogue…" : `${total} course${total === 1 ? "" : "s"} available`}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Course filters">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden />
                Filters
              </h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <X className="h-3 w-3" aria-hidden />
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="filter-category">Category</Label>
                <Select
                  id="filter-category"
                  value={category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  <option value="">All categories</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-difficulty">Level</Label>
                <Select
                  id="filter-difficulty"
                  value={difficulty}
                  onChange={(e) => update("difficulty", e.target.value)}
                >
                  {difficultyOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-rating">Minimum rating</Label>
                <Select
                  id="filter-rating"
                  value={minRating}
                  onChange={(e) => update("min_rating", e.target.value)}
                >
                  <option value="">Any rating</option>
                  <option value="4.5">4.5 &amp; up</option>
                  <option value="4">4.0 &amp; up</option>
                  <option value="3">3.0 &amp; up</option>
                </Select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(e) => update("free", e.target.checked ? "true" : "")}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring/40"
                />
                Free courses only
              </label>
            </div>
          </Card>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={search}
                onChange={(e) => update("search", e.target.value)}
                placeholder="Search courses, instructors or topics…"
                aria-label="Search courses"
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sort" className="whitespace-nowrap text-muted-foreground">
                <Filter className="mr-1 inline h-4 w-4" aria-hidden />
                Sort
              </Label>
              <Select id="sort" value={sort} onChange={(e) => update("sort", e.target.value)} className="w-48">
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {courses.isLoading ? (
            <CourseGridSkeleton count={6} />
          ) : courses.isError ? (
            <ErrorState message="We could not load the catalogue." onRetry={() => courses.refetch()} />
          ) : (courses.data?.results ?? []).length === 0 ? (
            <EmptyState
              icon={Search}
              title="No courses match your filters"
              description="Try adjusting your search or clearing some filters to see more results."
              action={
                <Button variant="outline" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3")}>
                {(courses.data?.results ?? []).map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(p) => update("page", String(p), false)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
