"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_NAME } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import { getSafeReturnPath } from "@/lib/utils/auth-redirect";
import { isValidE164Phone, normalizeNigerianPhone } from "@/lib/utils/phone";
import {
  getSupabaseEnvError,
  mapAuthError,
  type AuthErrorDisplay,
  type AuthErrorInput,
} from "@/lib/utils/auth-errors";

type Mode = "login" | "signup" | "recover";
type Step = "phone" | "otp";

const MODE_COPY = {
  login: {
    title: "Log in with phone",
    helper: "Enter your Nigerian phone number. We'll send an OTP.",
    button: "Send OTP",
    shouldCreateUser: false,
  },
  signup: {
    title: "Create account",
    helper: `Use one phone number for one ${BRAND_NAME} account.`,
    button: "Create account",
    shouldCreateUser: true,
  },
  recover: {
    title: "Recover access",
    helper: "Use OTP to access your account again.",
    button: "Send recovery OTP",
    shouldCreateUser: false,
  },
} as const;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[calc(100vh-160px)] items-center py-4">
          <section className="touch-card w-full p-4">
            <div className="h-8 w-40 skeleton rounded-full" />
            <div className="mt-4 h-24 w-full skeleton rounded-app" />
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
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedPhone = normalizeNigerianPhone(phoneInput);
  const copy = MODE_COPY[mode];

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStep("phone");
    setOtp("");
    setMessage("");
    setAuthError(null);
  }

  function showAuthError(error: AuthErrorInput | string) {
    setMessage("");
    setAuthError(mapAuthError(error, mode));
  }

  async function sendOtp() {
    setMessage("");
    setAuthError(null);

    const envError = getSupabaseEnvError();
    if (envError) {
      setMessage(envError);
      console.log("signup env error", envError);
      return;
    }

    if (!normalizedPhone || !isValidE164Phone(normalizedPhone)) {
      setMessage("Enter a valid Nigerian phone number, for example 08101234567.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      setMessage("Enter your full name to create an account.");
      return;
    }

    setIsLoading(true);
    const shouldCreateUser = copy.shouldCreateUser;
    if (mode === "signup") {
      console.log("signup otp", {
        phone: normalizedPhone,
        shouldCreateUser,
      });
    } else {
      console.log("sending otp", normalizedPhone);
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser,
        data:
          mode === "signup"
            ? {
                full_name: fullName.trim(),
              }
            : undefined,
      },
    });
    setIsLoading(false);

    if (error) {
      if (mode === "signup") {
        console.log(error);
        console.log(error.code);
        console.log(error.message);
        console.log(error.status);
      } else {
        console.log("otp error", error);
        console.log("otp error code", error.code);
        console.log("otp error message", error.message);
        console.log("otp error status", error.status);
      }
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return;
    }

    setStep("otp");
    setAuthError(null);
    setMessage(`OTP sent to ${normalizedPhone}.`);
  }

  async function verifyOtp() {
    setMessage("");
    setAuthError(null);

    if (!normalizedPhone || !isValidE164Phone(normalizedPhone)) {
      setMessage("Enter a valid Nigerian phone number.");
      return;
    }

    if (!otp.trim()) {
      setMessage("Enter the OTP sent to your phone.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp.trim(),
      type: "sms",
    });

    if (error || !data.user) {
      setIsLoading(false);
      if (mode === "signup") {
        console.log("signup verify error", error);
      }
      showAuthError(
        error
          ? {
              message: error.message,
              code: error.code,
              status: error.status,
            }
          : "Could not verify OTP.",
      );
      return;
    }

    await supabase.from("profiles").upsert({
      id: data.user.id,
      phone: normalizedPhone,
      full_name: fullName.trim() || data.user.user_metadata.full_name || null,
    });

    setIsLoading(false);
    router.push(returnPath);
    router.refresh();
  }

  return (
    <main className="flex min-h-[calc(100vh-160px)] items-center py-4">
      <section className="touch-card w-full p-4">
        <p className="type-brand-sub text-primary">{BRAND_NAME}</p>
        <h1 className="type-page-title mt-1">
          {step === "otp" ? "Verify OTP" : copy.title}
        </h1>
        <p className="type-page-sub mt-1.5">
          {step === "otp"
            ? "Enter the code sent to your phone to continue."
            : copy.helper}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-border bg-background p-1">
          {(["login", "signup", "recover"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={
                mode === item
                  ? "type-btn rounded-full bg-primary px-2 py-2 text-[11px] text-primary-foreground"
                  : "type-btn rounded-full px-2 py-2 text-[11px] text-muted"
              }
            >
              {item === "login" ? "Login" : item === "signup" ? "Signup" : "Recover"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {mode === "signup" && step === "phone" ? (
            <AuthField label="Full name">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full bg-transparent outline-none"
                placeholder="Your name"
              />
            </AuthField>
          ) : null}

          <AuthField label="Phone number">
            <input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              className="w-full bg-transparent outline-none"
              inputMode="tel"
              placeholder="08101234567"
              disabled={step === "otp"}
            />
          </AuthField>

          {normalizedPhone ? (
            <p className="text-[12px] font-medium text-muted">
              We&apos;ll use {normalizedPhone}
            </p>
          ) : null}

          {step === "otp" ? (
            <AuthField label="OTP code">
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="w-full bg-transparent outline-none"
                inputMode="numeric"
                placeholder="6-digit code"
              />
            </AuthField>
          ) : null}

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
            <p className="rounded-app border border-border bg-background p-3 text-[12px] leading-5 text-muted">
              {message}
            </p>
          ) : null}

          <button
            disabled={isLoading}
            type="button"
            onClick={() => {
              if (step === "phone") void sendOtp();
              if (step === "otp") void verifyOtp();
            }}
            className="type-btn h-11 w-full rounded-full bg-primary text-[14px] text-primary-foreground disabled:opacity-60"
          >
            {isLoading ? "Please wait..." : step === "otp" ? "Verify OTP" : copy.button}
          </button>

          {step === "otp" ? (
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setMessage("");
                setAuthError(null);
              }}
              className="w-full text-center text-[12px] font-medium text-primary"
            >
              Change phone number
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
