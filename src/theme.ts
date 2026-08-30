/**
 * Theme manager (dark / light / follow-system).
 *
 * The user's CHOICE is persisted ("dark" | "light" | "system", default "dark",
 * which preserves the existing look). The EFFECTIVE theme
 * ("light" | "dark") is what gets applied to <html data-theme="...">.
 *
 * When the choice is "system", we watch prefers-color-scheme and re-apply on
 * live OS changes, so the effective data-theme always equals the resolved
 * value and CSS needs only a single [data-theme="light"] override.
 */

export type ThemeChoice = "dark" | "light" | "system";
export type EffectiveTheme = "dark" | "light";

const THEME_KEY = "english360.theme";
const DEFAULT_CHOICE: ThemeChoice = "dark";

function systemPrefersLight(): boolean {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function resolveTheme(choice: ThemeChoice): EffectiveTheme {
  if (choice === "system") return systemPrefersLight() ? "light" : "dark";
  return choice;
}

export function applyTheme(choice: ThemeChoice): void {
  try {
    const effective = resolveTheme(choice);
    const el = document.documentElement;
    el.dataset.theme = effective;
    // Keep native controls (scrollbars, date pickers, etc.) in step.
    el.style.colorScheme = effective;
  } catch {
    // non-browser environment (tests) — no-op.
  }
}

export function getStoredTheme(): ThemeChoice {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    // storage unavailable — default.
  }
  return DEFAULT_CHOICE;
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // storage unavailable — ignore.
  }
}

/** Apply the stored choice once at startup (call before first render to avoid flash). */
export function applyStoredTheme(): void {
  applyTheme(getStoredTheme());
}

/**
 * Watch the OS color scheme and re-apply whenever it flips — only matters when
 * the current choice is "system". Returns an unsubscribe function.
 * Defensive against environments (e.g. jsdom) that lack addEventListener.
 */
export function watchSystemTheme(onChange: () => void): () => void {
  try {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    if (typeof mq.addListener === "function") {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  } catch {
    // media query unavailable — nothing to watch.
  }
  return () => {
    /* no-op */
  };
}
