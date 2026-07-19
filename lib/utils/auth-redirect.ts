const DEFAULT_AUTH_RETURN = "/";

export function getSafeReturnPath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_AUTH_RETURN;
  }

  if (path.startsWith("/login") || path.startsWith("/update-password")) {
    return DEFAULT_AUTH_RETURN;
  }

  return path;
}

export type AuthEntryMode = "login" | "signup" | "recover";

/** Always lands on the unified `/login` auth-screen with Login / Signup / Recover tabs. */
export function buildAuthHref(
  mode: AuthEntryMode = "login",
  returnPath?: string | null,
) {
  const params = new URLSearchParams();
  params.set("mode", mode === "recover" ? "recover" : mode);

  const next = getSafeReturnPath(returnPath);
  if (next !== DEFAULT_AUTH_RETURN) {
    params.set("next", next);
  }

  return `/login?${params.toString()}`;
}
