import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RatingInput, RatingStars } from "@/components/ui/rating";

describe("RatingStars", () => {
  it("renders five stars", () => {
    const { container } = render(<RatingStars value={3} />);
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });

  it("can display the numeric value", () => {
    render(<RatingStars value={4.25} showValue />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
  });
});

describe("RatingInput", () => {
  it("reports the selected rating", async () => {
    const onChange = vi.fn();
    render(<RatingInput value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("marks the active rating and shows a hint", () => {
    render(<RatingInput value={2} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "2 stars" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });
});
