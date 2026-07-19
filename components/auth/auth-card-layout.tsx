import type { ReactNode } from "react";
import { ProfileSupportSettings } from "@/components/profile/profile-support-settings";
import { cn } from "@/lib/utils/cn";

type AuthCardLayoutProps = {
  children: ReactNode;
  /** Use a div instead of main when embedding inside another page (e.g. Profile). */
  embedded?: boolean;
  /** Slightly denser field sizing for signup. */
  signup?: boolean;
  className?: string;
  cardClassName?: string;
};

/**
 * Shared auth shell for Login, Signup, Recover, and related pages.
 * Responsive card width is controlled globally via `.auth-screen__card`.
 * Standalone auth pages also show Contact / Privacy / Terms below the card.
 */
export function AuthCardLayout({
  children,
  embedded = false,
  signup = false,
  className,
  cardClassName,
}: AuthCardLayoutProps) {
  const Root = embedded ? "div" : "main";

  return (
    <Root
      className={cn(
        "auth-screen",
        embedded && "auth-screen--embedded",
        signup && "auth-screen--signup",
        !embedded && "auth-screen--with-support",
        className,
      )}
    >
      <section className={cn("auth-screen__card", cardClassName)}>{children}</section>
      {!embedded ? <ProfileSupportSettings showAccountActions={false} /> : null}
    </Root>
  );
}
