import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  resolveTheme,
  applyTheme,
  getStoredTheme,
  storeTheme,
  applyStoredTheme,
  watchSystemTheme,
} from "@/theme";

const THEME_KEY = "english360.theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockLightSystem(value: boolean): void {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: value,
    media: "(prefers-color-scheme: light)",
    onchange: null,
    addEventListener: vi.fn((_t, cb) => void cb),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
}

describe("theme module", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(getStoredTheme()).toBe("dark");
    mockLightSystem(true);
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("resolves system to light or dark based on the OS preference", () => {
    mockLightSystem(true);
    expect(resolveTheme("system")).toBe("light");
    mockLightSystem(false);
    expect(resolveTheme("system")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it("stores and recalls a persisted choice", () => {
    storeTheme("light");
    expect(getStoredTheme()).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("ignores an invalid persisted value and falls back to dark", () => {
    window.localStorage.setItem(THEME_KEY, "neon");
    expect(getStoredTheme()).toBe("dark");
  });

  it("applies the effective theme to the html data-theme attribute", () => {
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("applyStoredTheme applies the stored choice", () => {
    storeTheme("light");
    applyStoredTheme();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("watchSystemTheme returns an unsubscribe that removes the listener", () => {
    mockLightSystem(false);
    const remove = vi.fn();
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: remove,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as MediaQueryList);
    const off = watchSystemTheme(vi.fn());
    off();
    expect(remove).toHaveBeenCalled();
  });
});
