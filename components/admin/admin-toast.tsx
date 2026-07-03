"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type AdminToastContextValue = {
  showAdminToast: (message: string) => void;
};

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showAdminToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 2400);
  }, []);

  const value = useMemo(() => ({ showAdminToast }), [showAdminToast]);

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-[10001] w-[min(calc(100vw-24px),380px)] -translate-x-1/2 animate-[publish-rise_180ms_ease-out]"
        >
          <div className="rounded-full border border-border bg-surface/95 px-4 py-2 text-center text-[13px] font-medium text-foreground shadow-soft backdrop-blur-sm">
            {message}
          </div>
        </div>
      ) : null}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(AdminToastContext);
  if (!context) {
    throw new Error("useAdminToast must be used within AdminToastProvider");
  }
  return context;
}
