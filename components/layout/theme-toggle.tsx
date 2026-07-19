"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  persistTheme,
  readActiveTheme,
  THEME_CHANGE_EVENT,
  type Theme,
} from "@/lib/theme/theme";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readActiveTheme());

    function onThemeChange(event: Event) {
      const next = (event as CustomEvent<{ theme: Theme }>).detail?.theme;
      if (next === "light" || next === "dark") {
        setTheme(next);
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={cn("market-chrome-btn", className)}
      aria-label={isDark ? t("nav.themeLight") : t("nav.themeDark")}
      title={isDark ? t("nav.themeLight") : t("nav.themeDark")}
      onClick={() => {
        const next: Theme = isDark ? "light" : "dark";
        persistTheme(next);
        setTheme(next);
      }}
    >
      {isDark ? <Sun size={11} strokeWidth={2} /> : <Moon size={11} strokeWidth={2} />}
    </button>
  );
}
