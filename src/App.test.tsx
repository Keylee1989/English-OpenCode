import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { AUTHORED_DAYS, COURSE_TARGET_DAYS } from "@/content";

describe("App home (Phase 1 learning loop)", () => {
  it("renders Day X / 360 and the today-task card", async () => {
    window.location.hash = "";
    render(<App />);

    const heading = await screen.findByText(/Day 1/i);
    expect(heading.textContent).toBe(`Day 1 / ${COURSE_TARGET_DAYS}`);
    expect(await screen.findByText("今日任务")).toBeTruthy();
    // Real authored content is reachable: Day 1 title shows up in the goal line.
    await screen.findByText(/第 1 天 · 打招呼/);
  });

  it("offers the start button that enters the study flow", async () => {
    window.location.hash = "";
    render(<App />);
    const start = await screen.findByRole("button", { name: "开始学习" });
    expect(start).toBeTruthy();
  });

  it("keeps bottom navigation with honest destinations", async () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByText("学习")).toBeTruthy();
    expect(screen.getByText("报告")).toBeTruthy();
    expect(screen.getByText("状态")).toBeTruthy();
    // Authored-days honesty note.
    expect(await screen.findByText(new RegExp(`已上线第 1-${AUTHORED_DAYS} 天`))).toBeTruthy();
  });
});
