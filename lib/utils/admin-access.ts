export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  if (!left || !right) {
    return false;
  }

  return normalizeAdminEmail(left) === normalizeAdminEmail(right);
}

export function maskDisplayEmail(email?: string | null) {
  if (!email?.trim()) {
    return "none";
  }

  const [local, domain] = email.trim().split("@");
  if (!domain) {
    return "***";
  }

  const maskedLocal =
    local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}***`;

  return `${maskedLocal}@${domain}`;
}

export type AdminAccessMethod =
  | "rpc_is_email_admin"
  | "rpc_is_admin"
  | "env_email_match"
  | "none";

export type AdminCheckDebugInfo = {
  sessionEmailMasked: string;
  activeEmailMasked: string;
};

/** Safe debug payload — no full emails or env secrets. */
export function buildAdminCheckDebugInfo(
  userEmail?: string | null,
): AdminCheckDebugInfo {
  const email = userEmail?.trim() || "";

  return {
    sessionEmailMasked: maskDisplayEmail(email || undefined),
    activeEmailMasked: maskDisplayEmail(email || undefined),
  };
}
