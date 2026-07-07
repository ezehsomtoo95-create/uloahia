"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND_NAME } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError, type AuthErrorDisplay } from "@/lib/utils/auth-errors";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { cn } from "@/lib/utils/cn";

const AUTH_VIEWPORT_HEIGHT =
  "h-[calc(100dvh-56px-72px-env(safe-area-inset-bottom))] max-h-[calc(100dvh-56px-72px-env(safe-area-inset-bottom))]";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setIsChecking(false);
        setMessage("Set your new password.");
        setAuthError(null);
      }
    });

    async function bootstrap() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) {
          return;
        }

        if (error) {
          setMessage("This reset link is invalid or expired. Request a new one.");
          setIsChecking(false);
          return;
        }

        setRecoveryReady(true);
        window.history.replaceState({}, "", "/update-password");
        setIsChecking(false);
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 300));
      if (cancelled) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setRecoveryReady(true);
      }

      setIsChecking(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handlePasswordReset() {
    setMessage("");
    setAuthError(null);

    const validation = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!validation.success) {
      setMessage(validation.error.issues[0]?.message ?? "Invalid password.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: validation.data.password,
    });
    setIsLoading(false);

    if (error) {
      setAuthError(
        mapAuthError({
          message: error.message,
          code: error.code,
          status: error.status,
        }),
      );
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?reason=password-updated");
  }

  return (
    <main
      className={cn(
        "flex flex-col items-center justify-center overflow-hidden py-1 sm:py-4",
        AUTH_VIEWPORT_HEIGHT,
      )}
    >
      <section className="touch-card flex w-full min-h-0 flex-col p-4">
        <header className="shrink-0">
          <p className="type-brand-sub text-primary">{BRAND_NAME}</p>
          <h1 className="type-page-title mt-1">Set new password</h1>
          <p className="type-page-sub mt-1.5">
            Choose a new password for your account.
          </p>
        </header>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
          {isChecking ? (
            <p className="rounded-app border border-border bg-background p-3 text-[12px] leading-5 text-muted">
              Verifying your reset link...
            </p>
          ) : recoveryReady ? (
            <>
              <AuthField label="New password">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent outline-none"
                  type="password"
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
              </AuthField>
              <AuthField label="Confirm new password">
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full bg-transparent outline-none"
                  type="password"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </AuthField>
            </>
          ) : (
            <p className="rounded-app border border-border bg-background p-3 text-[12px] leading-5 text-muted">
              This reset link is invalid or expired. Request a new password reset email from the
              login page.
            </p>
          )}

          {authError ? (
            <div className="rounded-app border border-border bg-background p-3">
              {authError.title ? (
                <p className="text-[13px] font-semibold">{authError.title}</p>
              ) : null}
              <p
                className={
                  authError.title
                    ? "mt-1 text-[12px] leading-5 text-muted"
                    : "text-[12px] leading-5 text-muted"
                }
              >
                {authError.text}
              </p>
            </div>
          ) : null}

          {message ? (
            <p className="rounded-app border border-border bg-background p-3 text-[12px] leading-5 text-muted">
              {message}
            </p>
          ) : null}

          {recoveryReady ? (
            <button
              disabled={isLoading || isChecking}
              type="button"
              onClick={() => void handlePasswordReset()}
              className="type-btn h-11 w-full rounded-full bg-primary text-[14px] text-primary-foreground disabled:opacity-60"
            >
              {isLoading ? "Please wait..." : "Update password"}
            </button>
          ) : null}

          <Link
            href="/login?mode=recover"
            className="block text-center text-[12px] font-medium text-primary"
          >
            Back to recover access
          </Link>
        </div>
      </section>
    </main>
  );
}

function AuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-app border border-border bg-background px-3 py-2">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <div className="text-[14px] font-normal">{children}</div>
    </label>
  );
}
