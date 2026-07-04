"use client";

import { useEffect, useState } from "react";
import {
  persistTheme,
  readActiveTheme,
  THEME_CHANGE_EVENT,
  type Theme,
} from "@/lib/theme/theme";
import { cn } from "@/lib/utils/cn";

export function DarkModeSettingRow() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(readActiveTheme() === "dark");

    function handleThemeChange(event: Event) {
      const nextTheme = (event as CustomEvent<{ theme: Theme }>).detail?.theme;
      if (nextTheme === "light" || nextTheme === "dark") {
        setIsDark(nextTheme === "dark");
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = isDark ? "light" : "dark";
    persistTheme(nextTheme);
    setIsDark(nextTheme === "dark");
  }

  return (
    <div className="flex min-h-[52px] shrink-0 items-center justify-between gap-3 p-4 text-[14px] font-medium">
      <span>Dark Mode</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Dark Mode"
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full border transition-colors duration-app",
          isDark
            ? "border-primary/40 bg-primary"
            : "border-border bg-muted/30",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-app",
            isDark ? "translate-x-[22px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}
