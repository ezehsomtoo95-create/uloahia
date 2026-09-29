/**
 * Auth UI feature flags.
 *
 * Google sign-in is live. The backend was already complete and has been for a
 * while - the /auth/callback route, the signInWithOAuth handler, the button
 * and its styling were all in place, gated behind this flag. The flag is kept
 * so the UI can be withdrawn in an emergency by setting it back to false,
 * without needing a revert.
 *
 * Requires the callback URL to be allowlisted in Supabase (both):
 *   https://ahiaulo.ng/auth/callback
 *   http://localhost:3000/auth/callback
 *
 * Additive: email + password sign-in is untouched and remains the default.
 */
export const SHOW_GOOGLE_SIGN_IN = true;
