"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { BRAND_NAME } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError, type AuthErrorDisplay } from "@/lib/utils/auth-errors";
import { resetPasswordSchema } from "@/lib/validation/auth";

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
        mapAuthError(
          {
            message: error.message,
            code: error.code,
            status: error.status,
          },
          "recover",
        ),
      );
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?reason=password-updated");
  }

  return (
    <AuthCardLayout>
      <header className="auth-screen__header">
        <p className="type-brand-sub text-primary">{BRAND_NAME}</p>
        <h1 className="type-page-title">Set new password</h1>
        <p className="type-page-sub">Choose a new password for your account.</p>
      </header>

      <div className="auth-screen__body">
        {isChecking ? (
          <p className="auth-screen__banner">Verifying your reset link...</p>
        ) : recoveryReady ? (
          <div className="auth-screen__fields">
            <AuthField label="New password">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </AuthField>
            <AuthField label="Confirm new password">
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </AuthField>
          </div>
        ) : (
          <p className="auth-screen__banner">
            This reset link is invalid or expired. Request a new password reset email from the
            login page.
          </p>
        )}

        {authError ? (
          <div className="auth-screen__banner" role="alert">
            {authError.title ? (
              <p className="auth-screen__banner-title">{authError.title}</p>
            ) : null}
            <p className="auth-screen__banner-text">{authError.text}</p>
          </div>
        ) : null}

        {message ? (
          <p className="auth-screen__banner" role="status">
            {message}
          </p>
        ) : null}

        {recoveryReady ? (
          <button
            disabled={isLoading || isChecking}
            type="button"
            onClick={() => void handlePasswordReset()}
            className="auth-screen__btn auth-screen__btn--primary"
          >
            {isLoading ? "Please wait..." : "Update password"}
          </button>
        ) : null}

        <Link href="/login?mode=recover" className="auth-screen__link-btn">
          Back to recover access
        </Link>
      </div>
    </AuthCardLayout>
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
    <label className="auth-screen__field">
      <span className="auth-screen__field-label">{label}</span>
      <div className="auth-screen__field-control">{children}</div>
    </label>
  );
}
