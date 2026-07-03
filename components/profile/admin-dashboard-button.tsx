"use client";

import { useRouter } from "next/navigation";

export function AdminDashboardButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/admin")}
      className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold text-primary"
    >
      Open →
    </button>
  );
}
