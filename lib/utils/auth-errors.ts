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
      message.includes("email signups are disabled")

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
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("email already") ||
    message.includes("already been registered")
  );
}

function isEmailProviderUnavailableMessage(message: string, code: string) {
  return (
    code === "email_not_sent" ||
    code === "provider_disabled" ||
    message.includes("unable to send") ||
    message.includes("email provider") ||
    message.includes("failed to send email")
  );
}

function isLoginSignupNotAllowedMessage(message: string) {
  return message.includes("signups not allowed");
}

function isEmailNotVerifiedMessage(message: string, code: string) {
  return (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed") ||
    message.includes("email not verified") ||
    message.includes("confirm your email")
  );
}


function isInvalidCredentialsMessage(message: string, code: string) {
  return (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")

  );
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
      text: "This email already has an account. Login instead.",

      showLoginButton: true,
    };
  }

  if (isEmailProviderUnavailableMessage(message, code)) {
    return {
      text: "Unable to send email right now.",

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
      text: "This email hasn't created an account yet. Switch to Signup to continue.",

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
      text: "This email hasn't created an account yet. Switch to Signup to continue.",
      showSignupButton: true,
    };
  }

  if (isEmailNotVerifiedMessage(message, code) && mode === "login") {
    return {
      title: "Email not verified",
      text: "Please verify your email before logging in.",
    };
  }

  if (
    message.includes("token has expired") ||
    message.includes("expired") ||
    code === "otp_expired"
  ) {
    return {
      text: "That link has expired. Request a new one and try again.",

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

  if (isInvalidCredentialsMessage(message, code)) {
    return {
      text: "Invalid email or password.",

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
