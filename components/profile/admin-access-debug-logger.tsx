"use client";

import { useEffect } from "react";
import type { AdminAccessMethod, AdminCheckDebugInfo } from "@/lib/utils/admin-access";

type AdminAccessDebugLoggerProps = {
  debug: AdminCheckDebugInfo;
  isAdmin: boolean;
  method: AdminAccessMethod;
};

/**
 * Temporary diagnostics for admin visibility in production.
 * Logs masked email metadata only — never full addresses or env secrets.
 */
export function AdminAccessDebugLogger({
  debug,
  isAdmin,
  method,
}: AdminAccessDebugLoggerProps) {
  useEffect(() => {
    console.log("[admin-check]", {
      isAdmin,
      method,
      sessionEmailMasked: debug.sessionEmailMasked,
      activeEmailMasked: debug.activeEmailMasked,
    });
  }, [debug, isAdmin, method]);

  return null;
}
