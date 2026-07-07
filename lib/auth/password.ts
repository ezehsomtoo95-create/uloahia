export const PASSWORD_MIN_LENGTH = 8;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  const trimmed = password.trim();

  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }

  return { ok: true };
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): PasswordValidationResult {
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    return passwordCheck;
  }

  if (password !== confirmation) {
    return { ok: false, message: "Passwords do not match." };
  }

  return { ok: true };
}
