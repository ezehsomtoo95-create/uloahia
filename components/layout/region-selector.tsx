"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils/cn";

export function RegionSelector({ className }: { className?: string }) {
  const { t } = useLocale();
  const router = useRouter();
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

  function openLocationPicker() {
    setOpen(false);
    router.push("/browse?openLocation=1");
  }

  return (
    <div ref={rootRef} className={cn("market-chrome-menu", className)}>
      <button
        type="button"
        className="market-chrome-btn market-chrome-btn--selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("nav.location")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="market-chrome-btn-text">Nigeria</span>
        <ChevronDown size={10} strokeWidth={2.25} className="shrink-0 opacity-70" aria-hidden />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="listbox"
          className="market-chrome-dropdown market-chrome-dropdown--compact"
          aria-label={t("nav.location")}
        >
          <li role="option" aria-selected>
            <button
              type="button"
              className="market-chrome-dropdown-item market-chrome-dropdown-item--region is-active"
              onClick={openLocationPicker}
            >
              <span>Nigeria</span>
              <Image
                src="/nigeria-flag.svg"
                alt=""
                width={16}
                height={11}
                className="nigeria-flag-icon"
                aria-hidden
                unoptimized
              />
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
