const DEFAULT_AUTH_RETURN = "/";

export type AuthMode = "login" | "signup" | "forgot" | "setup";

export function getSafeReturnPath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_AUTH_RETURN;
  }

  if (path.startsWith("/login")) {
    return DEFAULT_AUTH_RETURN;
  }

  return path;
}

export function buildAuthHref(mode: AuthMode, returnPath?: string | null) {
  const params = new URLSearchParams();
  params.set("mode", mode);

  const next = getSafeReturnPath(returnPath);
  if (next !== DEFAULT_AUTH_RETURN) {
    params.set("next", next);
  }

  return `/login?${params.toString()}`;
}
