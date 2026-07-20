"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assertSignupAvailability } from "@/app/actions/auth";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import { waitForInitialAuthSession } from "@/lib/client/auth-session";
import { buildAuthHref, getSafeReturnPath } from "@/lib/utils/auth-redirect";
import {
  getSupabaseEnvError,
  mapAuthError,
  type AuthErrorDisplay,
  type AuthErrorInput,
} from "@/lib/utils/auth-errors";
import {
  loginSchema,
  recoverSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/auth";
import { coerceAuthBannerText, formatZodError } from "@/lib/validation/common";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { SHOW_GOOGLE_SIGN_IN } from "@/lib/constants/auth-features";
import { cn } from "@/lib/utils/cn";

type Mode = "login" | "signup" | "recover";

type UnifiedAuthScreenProps = {
  returnPath?: string;
  syncUrl?: boolean;
  embedded?: boolean;
  initialMode?: Mode;
};

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

function logSignupAuthFailure(phase: string, error: unknown) {
  if (error && typeof error === "object") {
    const record = error as AuthErrorInput & { name?: string; stack?: string };
    console.error(`Signup failed (${phase}):`, {
      message: record.message,
      code: record.code,
      status: record.status,
      name: record.name,
      stack: record.stack,
    });
    return;
  }

  console.error(`Signup failed (${phase}):`, error);
}

export function UnifiedAuthScreenRoot({
  embedded,
  returnPath,
  syncUrl,
  initialMode,
}: UnifiedAuthScreenProps) {
  return (
    <Suspense fallback={<UnifiedAuthFallback embedded={embedded} />}>
      <UnifiedAuthScreen
        embedded={embedded}
        returnPath={returnPath}
        syncUrl={syncUrl}
        initialMode={initialMode}
      />
    </Suspense>
  );
}

export function UnifiedAuthFallback({ embedded = false }: { embedded?: boolean }) {
  return (
    <AuthCardLayout embedded={embedded}>
      <div className="h-5 w-28 skeleton rounded-full" />
      <div className="mt-2 h-16 w-full skeleton rounded-[14px]" />
    </AuthCardLayout>
  );
}

export function UnifiedAuthScreen({
  returnPath: returnPathProp,
  syncUrl = true,
  embedded = false,
  initialMode = "login",
}: UnifiedAuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = returnPathProp ?? getSafeReturnPath(searchParams.get("next"));
  const requestedMode = searchParams.get("mode");
  const reason = searchParams.get("reason");
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>(() => {
    if (syncUrl) {
      if (requestedMode === "signup") {
        return "signup";
      }

      if (requestedMode === "recover") {
        return "recover";
      }
    }

    return initialMode;
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
  const isRedirectingRef = useRef(false);
  const copy = MODE_COPY[mode];
  const showGoogleAuth =
    SHOW_GOOGLE_SIGN_IN &&
    (mode === "login" || (mode === "signup" && !showVerificationScreen));
  const statusMessage = (() => {
    const text = coerceAuthBannerText(message, "");
    return text ? text : null;
  })();
  const authErrorTitle = authError?.title
    ? coerceAuthBannerText(authError.title, "")
    : "";
  const authErrorText = authError
    ? coerceAuthBannerText(authError.text, "Something went wrong.")
    : "";

  function setBannerMessage(value: unknown, fallback = "") {
    setMessage(coerceAuthBannerText(value, fallback));
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setAuthError(null);
    setShowVerificationScreen(false);
    setRecoveryReady(false);
    if (syncUrl) {
      router.replace(buildAuthHref(nextMode, returnPath), { scroll: false });
    }
  }

  function showAuthError(error: AuthErrorInput | string) {
    setMessage("");
    setAuthError(mapAuthError(error, mode));
  }

  useEffect(() => {
    if (reason === "verify-email") {
      setMessage("Verify your email before accessing this page.");
    }

    if (reason === "password-updated") {
      setMessage("Password updated. You can now log in.");
    }
  }, [reason]);

  useEffect(() => {
    if (!syncUrl) {
      return;
    }

    const nextMode: Mode =
      requestedMode === "signup" || requestedMode === "recover" ? requestedMode : "login";
    setMode(nextMode);
  }, [requestedMode, syncUrl]);

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

      if (mode === "signup" && user && !user.email_confirmed_at) {
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

  async function handleGoogleSignIn() {
    setMessage("");
    setAuthError(null);
    setIsLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setIsLoading(false);
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
    }
  }

  async function handleSignup() {
    setMessage("");
    setAuthError(null);

    const envError = getSupabaseEnvError();
    if (envError) {
      setBannerMessage(envError);
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
      setBannerMessage(formatZodError(validation.error, "Invalid signup details."));
      return;
    }

    let availability: Awaited<ReturnType<typeof assertSignupAvailability>>;
    try {
      availability = await assertSignupAvailability(validation.data);
    } catch (error) {
      console.error("signup availability error", error);
      setBannerMessage("Could not validate signup details. Please try again.");
      return;
    }

    if (!availability?.success) {
      setBannerMessage(
        availability?.error,
        "Could not validate signup details. Please try again.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = availability.data?.normalizedPhone ?? "";
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email.toLowerCase(),
        password: validation.data.password,
        options: {
          data: {
            full_name: validation.data.fullName.trim(),
            phone: normalizedPhone,
          },
        },
      });

      if (error) {
        logSignupAuthFailure("supabase.auth.signUp", error);
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
    } catch (error) {
      logSignupAuthFailure("handleSignup", error);
      setBannerMessage("Could not complete signup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin() {
    setMessage("");
    setAuthError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setBannerMessage(
        validation.error.issues[0]?.message,
        "Invalid login details.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email.toLowerCase(),
        password: validation.data.password,
      });

      if (error) {
        console.error("LIVE LOGIN FAILURE:", error);
        showAuthError({
          message: error.message,
          code: error.code,
          status: error.status,
        });
        if (
          error.code === "email_not_confirmed" ||
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          setResendTargetEmail(validation.data.email.toLowerCase());
        }
        return;
      }

      if (!data.user || !data.user.email_confirmed_at) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("LIVE LOGIN FAILURE:", signOutError);
        }

        setResendTargetEmail(validation.data.email.toLowerCase());
        console.error("LIVE LOGIN FAILURE: Email not verified.", data.user);
        showAuthError({
          message: "Email not verified.",
          code: "email_not_confirmed",
        });
        return;
      }

      await waitForInitialAuthSession(supabase);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.email_confirmed_at) {
        console.error("LIVE LOGIN FAILURE: Could not establish login session.", session);
        setBannerMessage("Could not establish login session. Please try again.");
        return;
      }

      if (isRedirectingRef.current) {
        return;
      }

      isRedirectingRef.current = true;
      window.location.href = returnPath;
    } catch (error) {
      console.error("LIVE LOGIN FAILURE:", error);
      showAuthError(
        error instanceof Error ? error.message : "Could not complete login. Please try again.",
      );
    } finally {
      if (!isRedirectingRef.current) {
        setIsLoading(false);
      }
    }
  }

  async function handleRecoverRequest() {
    setMessage("");
    setAuthError(null);

    const validation = recoverSchema.safeParse({ email });
    if (!validation.success) {
      setBannerMessage(validation.error.issues[0]?.message, "Enter a valid email.");

      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      validation.data.email.toLowerCase(),
      {
        redirectTo: `${window.location.origin}/update-password`,
      },
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
      setBannerMessage(validation.error.issues[0]?.message, "Invalid password.");

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

  const signupFields = (
    <div className="auth-screen__fields">
      <AuthField label="Full name">
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </AuthField>
      <AuthField label="Email address">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </AuthField>
      <AuthField label="Phone number">
        <input
          value={phoneInput}
          onChange={(event) => setPhoneInput(event.target.value)}
          inputMode="tel"
          placeholder="08101234567"
          autoComplete="tel"
        />
      </AuthField>
      <AuthField label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />
      </AuthField>
      <AuthField label="Confirm password">
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
        />
      </AuthField>
    </div>
  );

  const loginFields = (
    <div className="auth-screen__fields">
      <AuthField label="Email address">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </AuthField>
      <AuthField label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
        />
      </AuthField>
      <div className="auth-screen__forgot">
        <button
          type="button"
          onClick={() => switchMode("recover")}
          className="auth-screen__forgot-btn"
        >
          Forgot password?
        </button>
      </div>
    </div>
  );

  const recoverFields = recoveryReady ? (
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
    <div className="auth-screen__fields">
      <AuthField label="Email address">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          inputMode="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </AuthField>
    </div>
  );

  return (
    <AuthCardLayout embedded={embedded} signup={mode === "signup"}>
        <header className="auth-screen__header">
          <p className="type-brand-sub text-primary">{BRAND_NAME}</p>
          <p className="auth-screen__tagline">{BRAND_TAGLINE}</p>
          <h1 className="type-page-title">{copy.title}</h1>
          <p className="type-page-sub">{copy.helper}</p>
        </header>

        <div className="auth-screen__tabs" role="tablist" aria-label="Authentication mode">
          {(["login", "signup", "recover"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => switchMode(item)}
              className={cn("auth-screen__tab", mode === item && "is-active")}
            >
              {item === "login" ? "Login" : item === "signup" ? "Signup" : "Recover"}
            </button>
          ))}
        </div>

        <div className="auth-screen__body">
          {showVerificationScreen && mode === "signup" ? (
            <div className="auth-screen__banner">
              <p className="auth-screen__banner-title">Check your email</p>
              <p className="auth-screen__banner-text">
                We sent a verification link to{" "}
                <span className="font-medium text-foreground">{verificationEmail}</span>.
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
            <div className="auth-screen__banner" role="alert">
              {authErrorTitle ? (
                <p className="auth-screen__banner-title">{authErrorTitle}</p>
              ) : null}
              <p className="auth-screen__banner-text">{authErrorText}</p>
              {authError.showSignupButton ? (
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="auth-screen__banner-action"
                >
                  Go to Signup
                </button>
              ) : null}
              {authError.showLoginButton ? (
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="auth-screen__banner-action"
                >
                  Go to Login
                </button>
              ) : null}
            </div>
          ) : null}

          {statusMessage ? (
            <p className="auth-screen__banner" role="status">
              {statusMessage}
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
            className="auth-screen__btn auth-screen__btn--primary"
          >
            {isLoading
              ? "Please wait..."
              : mode === "signup" && showVerificationScreen
                ? "Resend verification email"
                : mode === "recover" && recoveryReady
                  ? "Update password"
                  : copy.button}
          </button>

          {showGoogleAuth ? (
            <>
              <div className="auth-screen__divider" aria-hidden="true">
                <span className="auth-screen__divider-line" />
                <span className="auth-screen__divider-label">or</span>
                <span className="auth-screen__divider-line" />
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleGoogleSignIn()}
                className="auth-screen__btn auth-screen__btn--google"
              >
                <GoogleMark />
                Continue with Google
              </button>
            </>
          ) : null}

          {mode === "login" ? (
            <button
              type="button"
              onClick={() => void resendVerificationEmail()}
              className="auth-screen__link-btn"
            >
              Resend verification email
            </button>
          ) : null}
        </div>
    </AuthCardLayout>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
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
