import { useEffect, useState } from "react";
import {
  type ThemeChoice,
  getStoredTheme,
  storeTheme,
  applyTheme,
  watchSystemTheme,
} from "@/theme";

const OPTIONS: { value: ThemeChoice; label: string; zh: string }[] = [
  { value: "dark", label: "深色", zh: "深色" },
  { value: "light", label: "浅色", zh: "浅色" },
  { value: "system", label: "跟随系统", zh: "跟随系统" },
];

function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(getStoredTheme());

  // Apply + persist whenever the user's choice changes.
  useEffect(() => {
    applyTheme(choice);
    storeTheme(choice);
  }, [choice]);

  // Keep "system" in sync with live OS color-scheme changes.
  useEffect(() => {
    return watchSystemTheme(() => {
      if (getStoredTheme() === "system") applyTheme("system");
    });
  }, []);

  return [choice, setChoice];
}

export default function ThemeToggle() {
  const [choice, setChoice] = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="主题切换" data-choice={choice}>
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className="theme-toggle-btn"
          aria-pressed={choice === value}
          title={label}
          onClick={() => setChoice(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
