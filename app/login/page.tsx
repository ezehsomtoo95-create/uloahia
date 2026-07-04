"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { phoneAccountExists } from "@/lib/auth/check-phone-account";
import { AuthField } from "@/components/auth/auth-field";
import {
  AuthCard,
  AuthFallbackCard,
  AuthFormStack,
  AuthGhostButton,
  AuthHeading,
  AuthMessageBanner,
  AuthModeTabs,
  AuthPageShell,
  AuthPhoneHint,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from "@/components/auth/auth-primitives";
import { syncAuthProfile } from "@/lib/auth/profile-sync";
import {
  validatePasswordConfirmation,
} from "@/lib/auth/password";
import { BRAND_NAME } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import { getSafeReturnPath } from "@/lib/utils/auth-redirect";
import {
  getSupabaseEnvError,
  mapAuthError,
  type AuthErrorDisplay,
  type AuthErrorInput,
} from "@/lib/utils/auth-errors";
import { isValidE164Phone, normalizeNigerianPhone } from "@/lib/utils/phone";

type Mode = "login" | "signup" | "forgot" | "setup";
type Step = "credentials" | "phone" | "otp" | "password";

const MODE_COPY = {
  login: {
    title: "Log in",
    helper: "Use your phone number and password.",
  },
  signup: {
    title: "Create account",
    helper: `Use one phone number for one ${BRAND_NAME} account.`,
    button: "Continue",
  },
  forgot: {
    title: "Forgot password",
    helper: "Verify your phone with OTP, then choose a new password.",
    button: "Send OTP",
  },
  setup: {
    title: "Set up your password",
    helper: "Verify your phone with OTP, then create a password for future logins.",
    button: "Send OTP",
  },
} as const;

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFallbackCard />}>
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
    if (requestedMode === "signup") return "signup";
    if (requestedMode === "forgot") return "forgot";
    if (requestedMode === "setup") return "setup";
    return "login";
  });
  const [step, setStep] = useState<Step>(() =>
    requestedMode === "signup" ||
    requestedMode === "forgot" ||
    requestedMode === "setup"
      ? "phone"
      : "credentials",
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedPhone = normalizeNigerianPhone(phoneInput);
  const copy = MODE_COPY[mode];
  const usesOtpFlow = mode === "signup" || mode === "forgot" || mode === "setup";

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStep(nextMode === "login" ? "credentials" : "phone");
    setOtp("");
    setPassword("");
    setPasswordConfirm("");
    setMessage("");
    setAuthError(null);
  }

  function showAuthError(error: AuthErrorInput | string) {
    setMessage("");
    setAuthError(mapAuthError(error, mode));
  }

  async function loginWithPassword() {
    setMessage("");
    setAuthError(null);

    const envError = getSupabaseEnvError();
    if (envError) {
      setMessage(envError);
      return;
    }

    if (!normalizedPhone || !isValidE164Phone(normalizedPhone)) {
      setMessage("Enter a valid Nigerian phone number, for example 08101234567.");
      return;
    }

    if (!password) {
      setMessage("Enter your password.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password,
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

    router.push(returnPath);
    router.refresh();
  }

  async function sendOtp() {
    setMessage("");
    setAuthError(null);

    const envError = getSupabaseEnvError();
    if (envError) {
      setMessage(envError);
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

    try {
      if (mode === "signup") {
        const exists = await phoneAccountExists(normalizedPhone);
        if (exists) {
          setAuthError({
            text: "This phone number is already registered. Please log in instead.",
            showLoginButton: true,
          });
          return;
        }
      }

      if (mode === "forgot" || mode === "setup") {
        const exists = await phoneAccountExists(normalizedPhone);
        if (!exists) {
          setAuthError({
            text: "No account was found with this phone number.",
          });
          return;
        }
      }

      const shouldCreateUser = mode === "signup";
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

      if (error) {
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
    } catch (error) {
      showAuthError(
        error instanceof Error ? error.message : "Could not verify phone number.",
      );
    } finally {
      setIsLoading(false);
    }
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

    if (mode === "signup") {
      await syncAuthProfile(supabase, {
        userId: data.user.id,
        phone: normalizedPhone,
        fullName: fullName.trim() || data.user.user_metadata.full_name,
      });
    }

    setIsLoading(false);
    setStep("password");
    setPassword("");
    setPasswordConfirm("");
    setMessage("Choose a password for your account.");
    setAuthError(null);
  }

  async function savePassword() {
    setMessage("");
    setAuthError(null);

    const validation = validatePasswordConfirmation(password, passwordConfirm);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error || !data.user) {
      setIsLoading(false);
      showAuthError(
        error
          ? {
              message: error.message,
              code: error.code,
              status: error.status,
            }
          : "Could not save password.",
      );
      return;
    }

    try {
      await syncAuthProfile(supabase, {
        userId: data.user.id,
        phone: normalizedPhone ?? data.user.phone ?? "",
        fullName:
          fullName.trim() ||
          (typeof data.user.user_metadata.full_name === "string"
            ? data.user.user_metadata.full_name
            : null),
        markPasswordSet: true,
      });
    } catch (profileError) {
      setIsLoading(false);
      showAuthError(
        profileError instanceof Error ? profileError.message : "Could not update profile.",
      );
      return;
    }

    setIsLoading(false);

    if (mode === "forgot" || mode === "setup") {
      router.push(returnPath);
      router.refresh();
      return;
    }

    router.push(returnPath);
    router.refresh();
  }

  function handlePrimaryAction() {
    if (mode === "login" && step === "credentials") {
      void loginWithPassword();
      return;
    }

    if (step === "phone") {
      void sendOtp();
      return;
    }

    if (step === "otp") {
      void verifyOtp();
      return;
    }

    if (step === "password") {
      void savePassword();
    }
  }

  function primaryButtonLabel() {
    if (isLoading) {
      return "Please wait...";
    }

    if (mode === "login") {
      return "Log in";
    }

    if (step === "otp") {
      return "Verify OTP";
    }

    if (step === "password") {
      return mode === "signup" ? "Create account" : "Save password";
    }

    return "Continue";
  }

  const tabModes = ["login", "signup", "forgot"] as const;

  const headingTitle =
    step === "otp"
      ? "Verify OTP"
      : step === "password"
        ? "Create password"
        : copy.title;

  const headingDescription =
    step === "otp"
      ? "Enter the code sent to your phone to continue."
      : step === "password"
        ? "Use at least 8 characters. You will log in with this password next time."
        : copy.helper;

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthHeading
          eyebrow={BRAND_NAME}
          title={headingTitle}
          description={headingDescription}
        />

        {mode !== "setup" ? (
          <AuthModeTabs activeMode={mode} onChange={switchMode} modes={tabModes} />
        ) : null}

        <AuthFormStack stepKey={`${mode}-${step}`}>
          {mode === "signup" && step === "phone" ? (
            <AuthField label="Full name">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </AuthField>
          ) : null}

          {(mode === "login" && step === "credentials") || usesOtpFlow ? (
            <AuthField label="Phone number">
              <input
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                inputMode="tel"
                placeholder="08101234567"
                disabled={usesOtpFlow && (step === "otp" || step === "password")}
                autoComplete="tel"
              />
            </AuthField>
          ) : null}

          {normalizedPhone && step !== "password" ? (
            <AuthPhoneHint
              prefix={mode === "login" ? "Logging in as" : "Using"}
              phone={normalizedPhone}
            />
          ) : null}

          {mode === "login" && step === "credentials" ? (
            <AuthField label="Password">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
              />
            </AuthField>
          ) : null}

          {step === "otp" ? (
            <AuthField label="OTP code" hint="Check your SMS messages for the 6-digit code.">
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                placeholder="6-digit code"
                autoComplete="one-time-code"
              />
            </AuthField>
          ) : null}

          {step === "password" ? (
            <>
              <AuthField label="Password">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </AuthField>
              <AuthField label="Confirm password">
                <input
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                />
              </AuthField>
            </>
          ) : null}

          {authError ? (
            <AuthMessageBanner
              tone="error"
              title={authError.title}
              actions={
                <>
                  {authError.showSignupButton ? (
                    <AuthSecondaryButton type="button" onClick={() => switchMode("signup")}>
                      Go to Signup
                    </AuthSecondaryButton>
                  ) : null}
                  {authError.showLoginButton ? (
                    <AuthPrimaryButton type="button" onClick={() => switchMode("login")}>
                      Go to Login
                    </AuthPrimaryButton>
                  ) : null}
                  {authError.showSetupPasswordLink ? (
                    <AuthSecondaryButton type="button" onClick={() => switchMode("setup")}>
                      Set up password with OTP
                    </AuthSecondaryButton>
                  ) : null}
                </>
              }
            >
              {authError.text}
            </AuthMessageBanner>
          ) : null}

          {message ? (
            <AuthMessageBanner tone="info">{message}</AuthMessageBanner>
          ) : null}

          <AuthPrimaryButton
            type="button"
            isLoading={isLoading}
            onClick={handlePrimaryAction}
          >
            {primaryButtonLabel()}
          </AuthPrimaryButton>

          {mode === "login" && step === "credentials" ? (
            <div className="auth-link-row">
              <AuthGhostButton type="button" onClick={() => switchMode("forgot")}>
                Forgot password?
              </AuthGhostButton>
              <AuthGhostButton
                type="button"
                className="auth-btn-ghost--muted"
                onClick={() => switchMode("setup")}
              >
                Existing user? Set up your password
              </AuthGhostButton>
            </div>
          ) : null}

          {usesOtpFlow && (step === "otp" || step === "password") ? (
            <AuthGhostButton
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setPassword("");
                setPasswordConfirm("");
                setMessage("");
                setAuthError(null);
              }}
            >
              Change phone number
            </AuthGhostButton>
          ) : null}

          {mode === "setup" ? (
            <AuthGhostButton
              type="button"
              className="auth-btn-ghost--muted"
              onClick={() => switchMode("login")}
            >
              Back to login
            </AuthGhostButton>
          ) : null}
        </AuthFormStack>
      </AuthCard>
    </AuthPageShell>
  );
}
