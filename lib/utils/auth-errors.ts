type AuthMode = "login" | "signup" | "forgot" | "setup";

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
  showSetupPasswordLink?: boolean;
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
    message.includes("no user found") ||
    message.includes("user does not exist")
  );
}

function isInvalidCredentialsMessage(message: string, code: string) {
  return (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password") ||
    message.includes("invalid phone or password")
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

function isWeakPasswordMessage(message: string, code: string) {
  return (
    code === "weak_password" ||
    message.includes("password should be at least") ||
    message.includes("password is too weak")
  );
}

export function mapAuthError(
  error: AuthErrorInput | string,
  mode: AuthMode,
): AuthErrorDisplay {
  const input = typeof error === "string" ? { message: error } : error;
  const message = normalizeErrorMessage(input.message);
  const code = normalizeErrorCode(input.code);

  if (mode === "login" && isInvalidCredentialsMessage(message, code)) {
    return {
      title: "Could not log in",
      text: "Check your phone and password. If you have not set a password yet, verify your phone with OTP first.",
      showSetupPasswordLink: true,
    };
  }

  if (isWeakPasswordMessage(message, code)) {
    return {
      text: "Choose a stronger password with at least 8 characters.",
    };
  }

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
    (mode === "forgot" || mode === "setup") &&
    (isMissingAccountMessage(message, code) || isLoginSignupNotAllowedMessage(message))
  ) {
    return {
      title: "No account found",
      text: "This phone number has not created an account yet. Switch to Signup to continue.",
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
