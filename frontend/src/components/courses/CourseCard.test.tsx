import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CourseCard } from "@/components/courses/CourseCard";
import type { CourseListItem } from "@/types";

const course: CourseListItem = {
  id: 1,
  title: "Mastering React",
  slug: "mastering-react",
  subtitle: "Build production-grade interfaces with confidence.",
  category: {
    id: 2,
    name: "Web Development",
    slug: "web-development",
    description: "",
    icon: "Code2",
    image_url: "",
    is_active: true,
    order: 0,
  },
  instructor: {
    id: 7,
    email: "ada@pai.demo",
    full_name: "Ada Lovelace",
    avatar: null,
    headline: "",
    bio: "",
    role: "instructor",
    created_at: "2024-01-01T00:00:00Z",
  },
  difficulty: "intermediate",
  thumbnail_url: null,
  price_cents: 4999,
  currency: "usd",
  price: "49.99",
  is_free: false,
  average_rating: "4.7",
  review_count: 128,
  enrollment_count: 2048,
  lesson_count: 42,
  total_duration_minutes: 315,
  status: "published",
  published_at: "2024-02-01T00:00:00Z",
  created_at: "2024-01-15T00:00:00Z",
};

function renderCard(item: CourseListItem = course) {
  return render(
    <MemoryRouter>
      <CourseCard course={item} />
    </MemoryRouter>,
  );
}

describe("CourseCard", () => {
  it("shows the core course details", () => {
    renderCard();
    expect(screen.getByText("Mastering React")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Web Development")).toBeInTheDocument();
    expect(screen.getByText("Intermediate")).toBeInTheDocument();
    expect(screen.getByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getByText(/2048 enrolled/)).toBeInTheDocument();
    expect(screen.getByText("5h 15m")).toBeInTheDocument();
  });

  it("links to the course detail page", () => {
    renderCard();
    const links = screen.getAllByRole("link", { name: /mastering react/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/courses/mastering-react"));
  });

  it("renders 'Free' for a free course", () => {
    renderCard({ ...course, price_cents: 0, is_free: true });
    expect(screen.getByText("Free")).toBeInTheDocument();
  });
});
