export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

export function adminSuccess(): AdminActionResult {
  return { success: true };
}

export function adminError(error: string): AdminActionResult {
  return { success: false, error };
}
