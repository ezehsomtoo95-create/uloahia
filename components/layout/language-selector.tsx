"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const activeLabel = locale === "en" ? "English" : "Igbo";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(code: LocaleCode) {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("market-chrome-menu", className)}>
      <button
        type="button"
        className="market-chrome-btn market-chrome-btn--selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("nav.language")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="market-chrome-btn-text">{activeLabel}</span>
        <ChevronDown size={12} strokeWidth={2.25} className="shrink-0 opacity-70" aria-hidden />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="listbox"
          className="market-chrome-dropdown market-chrome-dropdown--compact"
          aria-label={t("nav.language")}
        >
          {LOCALES.map((item) => (
            <li key={item.code} role="option" aria-selected={item.code === locale}>
              <button
                type="button"
                className={cn(
                  "market-chrome-dropdown-item",
                  item.code === locale && "is-active",
                )}
                onClick={() => choose(item.code)}
              >
                <span>{item.nativeLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
