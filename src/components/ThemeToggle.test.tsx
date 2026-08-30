import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "@/components/ThemeToggle";

const THEME_KEY = "english360.theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

describe("ThemeToggle", () => {
  it("applies + persists the light theme when 浅色 is clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "浅色" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("applies + persists the dark theme when 深色 is clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "深色" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("resolves 跟随系统 to the current OS preference", () => {
    // Force a light system preference for a deterministic assertion.
    window.matchMedia = (() => {
      const q = () => ({
        matches: true,
        media: "(prefers-color-scheme: light)",
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      });
      q.addEventListener = () => {};
      q.removeEventListener = () => {};
      return q as unknown as typeof window.matchMedia;
    })();
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "跟随系统" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("system");
  });
});
