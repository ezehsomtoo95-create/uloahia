"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField } from "@/components/auth/auth-field";
import {
  AuthFormStack,
  AuthGhostButton,
  AuthMessageBanner,
  AuthPhoneHint,
  AuthPrimaryButton,
} from "@/components/auth/auth-primitives";
import { syncAuthProfile } from "@/lib/auth/profile-sync";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError, type AuthErrorDisplay, type AuthErrorInput } from "@/lib/utils/auth-errors";
import { formatDisplayPhone, isValidE164Phone, normalizeNigerianPhone } from "@/lib/utils/phone";

type Step = "phone" | "otp";

export function ChangePhoneForm({
  currentPhone,
}: {
  currentPhone: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState<AuthErrorDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedPhone = normalizeNigerianPhone(phoneInput);

  useEffect(() => {
    if (!normalizedPhone) {
      return;
    }

    if (normalizedPhone === normalizeNigerianPhone(currentPhone)) {
      setMessage("This is already your current phone number.");
    } else {
      setMessage("");
    }
  }, [currentPhone, normalizedPhone]);

  function showAuthError(error: AuthErrorInput | string) {
    setMessage("");
    setAuthError(mapAuthError(error, "setup"));
  }

  async function requestPhoneChange() {
    setMessage("");
    setAuthError(null);

    if (!normalizedPhone || !isValidE164Phone(normalizedPhone)) {
      setMessage("Enter a valid Nigerian phone number, for example 08101234567.");
      return;
    }

    if (normalizedPhone === normalizeNigerianPhone(currentPhone)) {
      setMessage("Enter a different phone number.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ phone: normalizedPhone });
    setIsLoading(false);

    if (error) {
      showAuthError({
        message: error.message,
        code: error.code,
        status: error.status,
      });
      return;
    }

    setStep("otp");
    setMessage(`OTP sent to ${normalizedPhone}.`);
  }

  async function verifyPhoneChange() {
    setMessage("");
    setAuthError(null);

    if (!normalizedPhone || !otp.trim()) {
      setMessage("Enter the OTP sent to your new phone number.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp.trim(),
      type: "phone_change",
    });
    setIsLoading(false);

    if (error || !data.user) {
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

    await syncAuthProfile(supabase, {
      userId: data.user.id,
      phone: normalizedPhone,
      fullName: data.user.user_metadata.full_name,
    });

    router.push("/profile");
    router.refresh();
  }

  return (
    <AuthFormStack stepKey={step}>
      <AuthPhoneHint prefix="Current number" phone={formatDisplayPhone(currentPhone)} />

      <AuthField label="New phone number">
        <input
          value={phoneInput}
          onChange={(event) => setPhoneInput(event.target.value)}
          inputMode="tel"
          placeholder="08101234567"
          disabled={step === "otp"}
          autoComplete="tel"
        />
      </AuthField>

      {step === "otp" ? (
        <AuthField label="OTP code" hint="Enter the code sent to your new phone number.">
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            inputMode="numeric"
            placeholder="6-digit code"
            autoComplete="one-time-code"
          />
        </AuthField>
      ) : null}

      {authError ? (
        <AuthMessageBanner tone="error">{authError.text}</AuthMessageBanner>
      ) : null}

      {message ? <AuthMessageBanner tone="info">{message}</AuthMessageBanner> : null}

      <AuthPrimaryButton
        type="button"
        isLoading={isLoading}
        onClick={() => {
          if (step === "phone") {
            void requestPhoneChange();
            return;
          }

          void verifyPhoneChange();
        }}
      >
        {step === "otp" ? "Verify and save" : "Send OTP"}
      </AuthPrimaryButton>

      {step === "otp" ? (
        <AuthGhostButton
          type="button"
          onClick={() => {
            setStep("phone");
            setOtp("");
            setMessage("");
            setAuthError(null);
          }}
        >
          Change number
        </AuthGhostButton>
      ) : (
        <Link href="/profile" className="auth-btn-ghost auth-btn-ghost--muted block text-center">
          Cancel
        </Link>
      )}
    </AuthFormStack>
  );
}
