import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const ACTION_CELL_CLASS = "min-w-0 flex-1";

export const ACTION_BUTTON_BASE =
  "box-border flex h-8 w-full min-w-0 flex-1 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border px-2.5 text-center text-[13px] font-medium leading-none";

export const ACTION_BUTTON_COMPACT =
  "box-border inline-flex h-6 shrink-0 items-center justify-center whitespace-nowrap rounded-md border px-1.5 text-[10px] font-medium leading-none";

export function actionButtonClass(
  variant: "default" | "danger" | "sold" = "default",
  size: "default" | "compact" = "default",
) {
  return cn(
    size === "compact" ? ACTION_BUTTON_COMPACT : ACTION_BUTTON_BASE,
    "border-border/70 bg-foreground/[0.04]",
    variant === "danger" && "text-red-400/75",
    variant === "sold" && "text-muted",
    variant === "default" && "text-foreground/80",
  );
}

export function ActionCell({ children }: { children: ReactNode }) {
  return <div className={ACTION_CELL_CLASS}>{children}</div>;
}
