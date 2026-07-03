"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type SaveToastContextValue = {
  showSaveToast: (message: string) => void;
};

const SaveToastContext = createContext<SaveToastContextValue | null>(null);

export function SaveToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showSaveToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 1800);
  }, []);

  const value = useMemo(() => ({ showSaveToast }), [showSaveToast]);

  return (
    <SaveToastContext.Provider value={value}>
      {children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(calc(100vw-24px),380px)] -translate-x-1/2 animate-[publish-rise_180ms_ease-out]"
        >
          <div className="rounded-full border border-border bg-surface/95 px-4 py-2 text-center text-[13px] font-medium text-foreground shadow-soft backdrop-blur-sm">
            {message}
          </div>
        </div>
      ) : null}
    </SaveToastContext.Provider>
  );
}

export function useSaveToast() {
  const context = useContext(SaveToastContext);
  if (!context) {
    throw new Error("useSaveToast must be used within SaveToastProvider");
  }
  return context;
}
