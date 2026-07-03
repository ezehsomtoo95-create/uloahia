type AuthMode = "login" | "signup" | "recover";

export type AuthErrorInput = {
  message: string;
  code?: string;
  status?: number;
};

export type AuthErrorDisplay = {
  title?: string;
  text: string;
  showSignupButton?: boolean;
  showLoginButton?: boolean;
};

function normalizeErrorMessage(message: string) {
  return message.trim().toLowerCase();
}

function normalizeErrorCode(code?: string) {
  return code?.trim().toLowerCase() ?? "";
}

function humanizeAuthMessage(raw: string) {
  const cleaned = raw
    .replace(/^authapierror:\s*/i, "")
    .replace(/^error:\s*/i, "")
    .trim();

  if (!cleaned) {
    return "Please try again.";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function isSignupDisabledMessage(message: string, code: string) {
  return (
    code === "signup_disabled" ||
    message.includes("signups not allowed") ||
    message.includes("signup is disabled") ||
    message.includes("new signups are disabled") ||
    message.includes("sms signups are disabled")
  );
}

function isMissingAccountMessage(message: string, code: string) {
  return (
    code === "user_not_found" ||
    message.includes("user not found") ||
    message.includes("invalid login") ||
    message.includes("no user found") ||
    message.includes("user does not exist")
  );
}

function isExistingAccountMessage(message: string, code: string) {
  return (
    code === "user_already_exists" ||
    code === "phone_exists" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already") ||
    message.includes("phone number already") ||
    message.includes("already been registered")
  );
}

function isOtpProviderUnavailableMessage(message: string, code: string) {
  return (
    code === "sms_send_failed" ||
    code === "otp_disabled" ||
    code === "phone_provider_disabled" ||
    code === "provider_disabled" ||
    message.includes("unable to send") ||
    message.includes("sms provider") ||
    message.includes("failed to send sms") ||
    message.includes("error sending sms") ||
    message.includes("phone provider") ||
    (message.includes("otp") && message.includes("disabled"))
  );
}

function isLoginSignupNotAllowedMessage(message: string) {
  return message.includes("signups not allowed");
}

export function mapAuthError(
  error: AuthErrorInput | string,
  mode: AuthMode,
): AuthErrorDisplay {
  const input =
    typeof error === "string"
      ? { message: error }
      : error;
  const message = normalizeErrorMessage(input.message);
  const code = normalizeErrorCode(input.code);

  if (mode === "signup" && isExistingAccountMessage(message, code)) {
    return {
      text: "This phone already has an account. Login instead.",
      showLoginButton: true,
    };
  }

  if (isOtpProviderUnavailableMessage(message, code)) {
    return {
      text: "Unable to send verification code right now.",
    };
  }

  if (mode === "signup" && isSignupDisabledMessage(message, code)) {
    return {
      text: "New accounts are currently unavailable.",
    };
  }

  if (
    mode === "login" &&
    (isMissingAccountMessage(message, code) ||
      isLoginSignupNotAllowedMessage(message))
  ) {
    return {
      title: "No account found",
      text: "This phone number hasn't created an account yet. Switch to Signup to continue.",
      showSignupButton: true,
    };
  }

  if (
    mode === "recover" &&
    (isMissingAccountMessage(message, code) ||
      isLoginSignupNotAllowedMessage(message))
  ) {
    return {
      title: "No account found",
      text: "This phone number hasn't created an account yet. Switch to Signup to continue.",
      showSignupButton: true,
    };
  }

  if (
    message.includes("invalid otp") ||
    message.includes("token has expired") ||
    message.includes("otp expired") ||
    code === "otp_expired" ||
    (message.includes("expired") && message.includes("otp"))
  ) {
    return {
      text: "That code didn't work or has expired. Request a new one and try again.",
    };
  }

  if (
    message.includes("rate limit") ||
    message.includes("too many") ||
    code === "over_sms_send_rate_limit"
  ) {
    return {
      text: "Too many attempts. Wait a moment and try again.",
    };
  }

  if (message.includes("invalid phone") || code === "validation_failed") {
    return {
      text: "Enter a valid Nigerian phone number, for example 08101234567.",
    };
  }

  return {
    text: humanizeAuthMessage(input.message),
  };
}

export function getSupabaseEnvError() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return "App connection is missing Supabase URL configuration.";
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "App connection is missing Supabase key configuration.";
  }

  return null;
}
