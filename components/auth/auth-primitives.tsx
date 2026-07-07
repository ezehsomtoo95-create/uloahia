"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function AuthPageShell({
  children,
  centered = true,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <main
      className={cn(
        "auth-page",
        centered && "auth-page--centered",
      )}
    >
      <div className="auth-page__inner">{children}</div>
    </main>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("auth-card", className)}>{children}</section>;
}

export function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="auth-heading">
      {eyebrow ? <p className="auth-heading__eyebrow">{eyebrow}</p> : null}
      <h1 className="auth-heading__title">{title}</h1>
      <p className="auth-heading__description">{description}</p>
    </header>
  );
}

export function AuthModeTabs({
  activeMode,
  onChange,
  modes,
}: {
  activeMode: string;
  onChange: (mode: "login" | "signup" | "forgot") => void;
  modes: readonly ("login" | "signup" | "forgot")[];
}) {
  const labels = {
    login: "Login",
    signup: "Signup",
    forgot: "Forgot",
  } as const;

  return (
    <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
      {modes.map((item) => {
        const selected = activeMode === item;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item)}
            className={cn("auth-tab", selected && "auth-tab--active")}
          >
            {labels[item]}
          </button>
        );
      })}
    </div>
  );
}

export function AuthField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();
  const fieldChild = Children.only(children);
  const control = isValidElement(fieldChild)
    ? cloneElement(fieldChild as ReactElement<{ id?: string; className?: string; disabled?: boolean }>, {
        id,
        className: cn(
          "auth-input",
          (fieldChild as ReactElement<{ className?: string }>).props.className,
          (fieldChild as ReactElement<{ disabled?: boolean }>).props.disabled && "auth-input--disabled",
        ),
      })
    : children;

  return (
    <div className="auth-field-wrap">
      <label htmlFor={id} className="auth-field">
        <span className="auth-field__label">{label}</span>
        <div className="auth-field__control">{control}</div>
      </label>
      {hint ? <p className="auth-field__hint">{hint}</p> : null}
    </div>
  );
}

export function AuthPhoneHint({
  prefix,
  phone,
}: {
  prefix: string;
  phone: string;
}) {
  return (
    <p className="auth-phone-hint">
      <span className="auth-phone-hint__prefix">{prefix}</span>
      <span className="auth-phone-hint__value">{phone}</span>
    </p>
  );
}

export function AuthMessageBanner({
  tone = "neutral",
  title,
  children,
  actions,
}: {
  tone?: "neutral" | "info" | "error";
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "auth-banner",
        tone === "info" && "auth-banner--info",
        tone === "error" && "auth-banner--error",
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {title ? <p className="auth-banner__title">{title}</p> : null}
      <p className={cn("auth-banner__text", title && "auth-banner__text--titled")}>{children}</p>
      {actions ? <div className="auth-banner__actions">{actions}</div> : null}
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  isLoading,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      disabled={props.disabled || isLoading}
      className={cn("auth-btn-primary", className)}
    >
      {isLoading ? (
        <span className="auth-btn-primary__content">
          <Loader2 className="auth-btn-primary__spinner" aria-hidden="true" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthSecondaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={cn("auth-btn-secondary", className)}>
      {children}
    </button>
  );
}

export function AuthGhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={cn("auth-btn-ghost", className)}>
      {children}
    </button>
  );
}

export function AuthFormStack({
  stepKey,
  children,
}: {
  stepKey: string;
  children: ReactNode;
}) {
  return (
    <div key={stepKey} className="auth-form-stack">
      {children}
    </div>
  );
}

export function AuthFallbackCard() {
  return (
    <AuthPageShell>
      <AuthCard>
        <div className="auth-skeleton">
          <div className="auth-skeleton__title skeleton" />
          <div className="auth-skeleton__line skeleton" />
          <div className="auth-skeleton__field skeleton" />
          <div className="auth-skeleton__field skeleton" />
          <div className="auth-skeleton__button skeleton" />
        </div>
      </AuthCard>
    </AuthPageShell>
  );
}
