import { describe, expect, it } from "vitest";

import {
  cn,
  courseStatusLabels,
  difficultyLabels,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPrice,
  formatRating,
  initials,
  orderStatusLabels,
  plainText,
  truncate,
} from "@/lib/utils";

describe("cn", () => {
  it("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("formatPrice", () => {
  it("returns 'Free' for zero cents", () => {
    expect(formatPrice(0)).toBe("Free");
  });

  it("drops the decimals for whole-dollar amounts", () => {
    expect(formatPrice(2000)).toBe("$20");
  });

  it("shows cents when present", () => {
    expect(formatPrice(1999)).toBe("$19.99");
  });

  it("honours the supplied currency", () => {
    expect(formatPrice(1500, "eur")).toContain("€");
  });
});

describe("formatDuration", () => {
  it("returns a dash for zero", () => {
    expect(formatDuration(0)).toBe("—");
  });

  it("formats minutes only", () => {
    expect(formatDuration(45)).toBe("45 min");
  });

  it("formats whole hours and pluralises", () => {
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(120)).toBe("2 hrs");
  });

  it("formats hours and minutes together", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });
});

describe("formatRating", () => {
  it("treats a missing rating as new", () => {
    expect(formatRating(0)).toBe("New");
    expect(formatRating(null)).toBe("New");
    expect(formatRating(undefined)).toBe("New");
  });

  it("formats numeric and string ratings to one decimal", () => {
    expect(formatRating(4.5)).toBe("4.5");
    expect(formatRating("3.2")).toBe("3.2");
  });
});

describe("initials", () => {
  it("uses the first letters of the first two words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
  });

  it("falls back to a question mark", () => {
    expect(initials(undefined)).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("truncate", () => {
  it("leaves short text untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("appends an ellipsis when over the limit", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcde…");
  });
});

describe("plainText", () => {
  it("strips markdown-ish characters and collapses whitespace", () => {
    expect(plainText("**Hello** _world_")).toBe("Hello world");
    expect(plainText("line one\n\nline   two")).toBe("line one line two");
  });
});

describe("formatDate / formatDateTime", () => {
  it("renders a friendly date", () => {
    expect(formatDate("2024-03-05T00:00:00Z")).toMatch(/2024/);
  });

  it("returns a dash for empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
});

describe("label maps", () => {
  it("covers every course status and difficulty", () => {
    expect(difficultyLabels.beginner).toBe("Beginner");
    expect(courseStatusLabels.pending).toBeTruthy();
    expect(orderStatusLabels.partially_refunded).toBe("Partially refunded");
  });
});
