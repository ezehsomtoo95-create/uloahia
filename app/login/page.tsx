"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assertSignupAvailability } from "@/app/actions/auth";
import { BRAND_NAME } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import { getSafeReturnPath } from "@/lib/utils/auth-redirect";
import {
  getSupabaseEnvError,
  mapAuthError,
  type AuthErrorDisplay,
  type AuthErrorInput,
} from "@/lib/utils/auth-errors";
import { normalizeNigerianPhone } from "@/lib/utils/phone";
import {
  loginSchema,
  recoverSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";
import { cn } from "@/lib/utils/cn";

const AUTH_VIEWPORT_HEIGHT =
  "h-[calc(100dvh-56px-72px-env(safe-area-inset-bottom))] max-h-[calc(100dvh-56px-72px-env(safe-area-inset-bottom))]";

type Mode = "login" | "signup" | "recover";

const MODE_COPY = {
  login: {
    title: "Log in",
    helper: "Use your email and password to continue.",
    button: "Log in",
  },
  signup: {
    title: "Create account",
    helper: `Create your ${BRAND_NAME} account with email verification.`,
    button: "Create account",
  },
  recover: {
    title: "Recover access",
    helper: "Reset your password via email link.",
    button: "Send reset email",
  },
} as const;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          className={cn(
            "flex flex-col items-center justify-center overflow-hidden py-1 sm:py-4",
            AUTH_VIEWPORT_HEIGHT,
          )}
        >
          <section className="touch-card w-full p-3 sm:p-4">
            <div className="h-7 w-36 skeleton rounded-full" />
            <div className="mt-3 h-20 w-full skeleton rounded-app" />
          </section>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = getSafeReturnPath(searchParams.get("next"));
  const requestedMode = searchParams.get("mode");
  const reason = searchParams.get("reason");
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>(() => {
    if (requestedMode === "signup") {
      return "signup";
    }

    if (requestedMode === "recover") {
      return "recover";
    }

    return "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTargetEmail, setResendTargetEmail] = useState("");
  const copy = MODE_COPY[mode];

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setAuthError(null);
    setShowVerificationScreen(false);
    setRecoveryReady(false);
  }

  function showAuthError(error: AuthErrorInput | string) {
    setMessage("");
    setAuthError(mapAuthError(error, mode));
  }

  useEffect(() => {
    if (reason === "verify-email") {
      setMessage("Verify your email before accessing this page.");
    }
  }, [reason]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      const sessionEmail = user?.email?.toLowerCase();
      if (!sessionEmail) {
        return;
      }

      setResendTargetEmail(sessionEmail);

      if (reason === "verify-email") {
        setEmail(sessionEmail);
      }

      if (mode === "signup" && !user.email_confirmed_at) {
        setVerificationEmail(sessionEmail);
        setShowVerificationScreen(true);
      }
    });
  }, [mode, reason, supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recover");
        setRecoveryReady(true);
        setMessage("Set your new password.");
        setAuthError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignup() {
    setMessage("");
    setAuthError(null);

    const envError = getSupabaseEnvError();
    if (envError) {
      setMessage(envError);
      console.log("signup env error", envError);
      return;
    }

    const validation = signupSchema.safeParse({
      fullName,
      email,
      phone: phoneInput,
      password,
      confirmPassword,
    });
    if (!validation.success) {
      setMessage(validation.error.issues[0]?.message ?? "Invalid signup details.");
      return;
    }

    const availability = await assertSignupAvailability(validation.data);
    if (!availability.success) {
      setMessage(availability.error);
      return;
    }

    setIsLoading(true);
    const normalizedPhone = availability.data?.normalizedPhone ?? "";
    const { data, error } = await supabase.auth.signUp({
      email: validation.data.email.toLowerCase(),
      password: validation.data.password,
      options: {
        data:
          {
            full_name: validation.data.fullName.trim(),
            phone: normalizedPhone,
          },
      },
    });
    setIsLoading(false);

    if (error) {
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return;
    }

    const signedUpEmail =
      data.user?.email?.toLowerCase() ?? validation.data.email.toLowerCase();
    setVerificationEmail(signedUpEmail);
    setResendTargetEmail(signedUpEmail);
    setShowVerificationScreen(true);
    setMessage("");
  }

  async function handleLogin() {
    setMessage("");
    setAuthError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setMessage(validation.error.issues[0]?.message ?? "Invalid login details.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email.toLowerCase(),
      password: validation.data.password,
    });
    setIsLoading(false);

    if (error) {
      showAuthError(
        {
          message: error.message,
          code: error.code,
          status: error.status,
        },
      );
      if (
        error.code === "email_not_confirmed" ||
        error.message.toLowerCase().includes("email not confirmed")
      ) {
        setResendTargetEmail(validation.data.email.toLowerCase());
      }
      return;
    }

    if (!data.user || !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setResendTargetEmail(validation.data.email.toLowerCase());
      showAuthError({
        message: "Email not verified.",
        code: "email_not_confirmed",
      });
      return;
    }

    router.push(returnPath);
    router.refresh();
  }

  async function handleRecoverRequest() {
    setMessage("");
    setAuthError(null);

    const validation = recoverSchema.safeParse({ email });
    if (!validation.success) {
      setMessage(validation.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }

    setIsLoading(true);
    const redirectTo = `${window.location.origin}/login?mode=recover`;
    const { error } = await supabase.auth.resetPasswordForEmail(
      validation.data.email.toLowerCase(),
      { redirectTo },
    );
    setIsLoading(false);

    if (error) {
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return;
    }

    setMessage("Password reset link sent. Check your email.");
  }

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
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return;
    }

    await supabase.auth.signOut();
    setRecoveryReady(false);
    setMode("login");
    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated. You can now log in.");
  }

  async function resendVerificationEmail(targetEmail?: string) {
    const nextEmail = (targetEmail || resendTargetEmail || email).trim().toLowerCase();
    if (!nextEmail) {
      setMessage("Enter your email to resend verification.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: nextEmail,
    });
    setIsLoading(false);

    if (error) {
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return;
    }

    setResendTargetEmail(nextEmail);
    setMessage("Verification email sent again. Check your inbox.");
  }

  const isCompact = mode === "signup" && !showVerificationScreen;

  const signupFields = (
    <>
      <AuthField compact label="Full name">
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="w-full bg-transparent outline-none"
          placeholder="Your name"
        />
      </AuthField>
      <AuthField compact label="Email address">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full bg-transparent outline-none"
          inputMode="email"
          placeholder="you@example.com"
        />
      </AuthField>
      <AuthField compact label="Phone number">
        <input
          value={phoneInput}
          onChange={(event) => setPhoneInput(event.target.value)}
          className="w-full bg-transparent outline-none"
          inputMode="tel"
          placeholder="08101234567"
        />
      </AuthField>
      <AuthField compact label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full bg-transparent outline-none"
          type="password"
          placeholder="Min. 8 characters"
        />
      </AuthField>
      <AuthField compact label="Confirm password">
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full bg-transparent outline-none"
          type="password"
          placeholder="Re-enter password"
        />
      </AuthField>
    </>
  );

  const loginFields = (
    <>
      <AuthField label="Email address">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full bg-transparent outline-none"
          inputMode="email"
          placeholder="you@example.com"
        />
      </AuthField>
      <AuthField label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full bg-transparent outline-none"
          type="password"
          placeholder="Your password"
        />
      </AuthField>
    </>
  );

  const recoverFields = recoveryReady ? (
    <>
      <AuthField label="New password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full bg-transparent outline-none"
          type="password"
          placeholder="Minimum 8 characters"
        />
      </AuthField>
      <AuthField label="Confirm new password">
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full bg-transparent outline-none"
          type="password"
          placeholder="Re-enter password"
        />
      </AuthField>
    </>
  ) : (
    <AuthField label="Email address">
      <input
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full bg-transparent outline-none"
        inputMode="email"
        placeholder="you@example.com"
      />
    </AuthField>
  );

  return (
    <main
      className={cn(
        "flex flex-col items-center justify-center overflow-hidden py-1 sm:py-4",
        AUTH_VIEWPORT_HEIGHT,
      )}
    >
      <section
        className={cn(
          "touch-card flex w-full min-h-0 flex-col",
          isCompact ? "p-3" : "p-4",
        )}
      >
        <header className="shrink-0">
          <p className="type-brand-sub text-primary">{BRAND_NAME}</p>
          <h1
            className={cn(
              "type-page-title",
              isCompact ? "mt-0.5 text-[1rem]" : "mt-1",
            )}
          >
            {copy.title}
          </h1>
          <p
            className={cn(
              "type-page-sub",
              isCompact
                ? "mt-0.5 line-clamp-2 text-[11px] leading-snug"
                : "mt-1.5",
            )}
          >
            {copy.helper}
          </p>
        </header>

        <div
          className={cn(
            "mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-background p-1",
            isCompact && "mt-2",
          )}
        >
          {(["login", "signup", "recover"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={cn(
                "type-btn rounded-full px-2 text-muted",
                isCompact ? "py-1.5 text-[10px]" : "py-2 text-[11px]",
                mode === item && "bg-primary text-primary-foreground",
              )}
            >
              {item === "login" ? "Login" : item === "signup" ? "Signup" : "Recover"}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            isCompact ? "mt-2 space-y-2" : "mt-4 space-y-3",
          )}
        >
          {showVerificationScreen && mode === "signup" ? (
            <div className="rounded-app border border-border bg-background p-2.5 text-[12px] leading-5 text-muted sm:p-3">
              <p className="font-semibold text-foreground">Check your email</p>
              <p className="mt-1">
                We sent a verification link to <span className="font-medium">{verificationEmail}</span>.
                Verify your email before logging in.
              </p>
            </div>
          ) : mode === "signup" ? (
            signupFields
          ) : mode === "login" ? (
            loginFields
          ) : (
            recoverFields
          )}

          {authError ? (
            <div
              className={cn(
                "rounded-app border border-border bg-background",
                isCompact ? "p-2.5" : "p-3",
              )}
            >
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
              {authError.showSignupButton ? (
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="type-btn mt-3 h-9 w-full rounded-full bg-primary text-[12px] text-primary-foreground"
                >
                  Go to Signup
                </button>
              ) : null}
              {authError.showLoginButton ? (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="mt-3 h-9 w-full rounded-full bg-primary text-[12px] font-semibold text-primary-foreground"
                >
                  Go to Login
                </button>
              ) : null}
            </div>
          ) : null}

          {message ? (
            <p
              className={cn(
                "rounded-app border border-border bg-background text-[12px] leading-5 text-muted",
                isCompact ? "p-2.5" : "p-3",
              )}
            >
              {message}
            </p>
          ) : null}

          <button
            disabled={isLoading}
            type="button"
            onClick={() => {
              if (mode === "signup") {
                if (showVerificationScreen) {
                  void resendVerificationEmail(verificationEmail);
                } else {
                  void handleSignup();
                }
                return;
              }

              if (mode === "login") {
                void handleLogin();
                return;
              }

              if (recoveryReady) {
                void handlePasswordReset();
                return;
              }

              void handleRecoverRequest();
            }}
            className={cn(
              "type-btn w-full rounded-full bg-primary text-primary-foreground disabled:opacity-60",
              isCompact ? "h-10 text-[13px]" : "h-11 text-[14px]",
            )}
          >
            {isLoading
              ? "Please wait..."
              : mode === "signup" && showVerificationScreen
                ? "Resend verification email"
                : mode === "recover" && recoveryReady
                  ? "Update password"
                  : copy.button}
          </button>

          {mode === "login" ? (
            <button
              type="button"
              onClick={() => void resendVerificationEmail()}
              className="w-full text-center text-[12px] font-medium text-primary"
            >
              Resend verification email
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function AuthField({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "block rounded-app border border-border bg-background",
        compact ? "px-2.5 py-1.5" : "px-3 py-2",
      )}
    >
      <span
        className={cn(
          "block font-medium text-muted",
          compact ? "mb-0.5 text-[10px] leading-tight" : "mb-1 text-[11px]",
        )}
      >
        {label}
      </span>
      <div className={cn("font-normal", compact ? "text-[13px] leading-snug" : "text-[14px]")}>
        {children}
      </div>
    </label>
  );
}
