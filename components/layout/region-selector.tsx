"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { REGION_LABEL } from "@/lib/constants/brand";
import { cn } from "@/lib/utils/cn";

const REGIONS = [{ id: "ng", label: "Nigeria", href: "/browse" }] as const;

export function RegionSelector({ className }: { className?: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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

  return (
    <div ref={rootRef} className={cn("market-chrome-menu", className)}>
      <button
        type="button"
        className="market-chrome-btn market-chrome-btn--selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("nav.nigeria")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="market-chrome-btn-text">{REGION_LABEL}</span>
        <ChevronDown size={12} strokeWidth={2.25} className="shrink-0 opacity-70" aria-hidden />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="listbox"
          className="market-chrome-dropdown market-chrome-dropdown--compact"
          aria-label={t("nav.nigeria")}
        >
          {REGIONS.map((region) => (
            <li key={region.id} role="option" aria-selected>
              <Link
                href={region.href}
                className="market-chrome-dropdown-item is-active"
                onClick={() => setOpen(false)}
              >
                <span>{region.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
