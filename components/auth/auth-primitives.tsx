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
    <main className="auth-screen">
      <section className="auth-screen__card">
        <div className="h-5 w-28 skeleton rounded-full" />
        <div className="mt-2 h-16 w-full skeleton rounded-[14px]" />
        <div className="mt-4 h-11 w-full skeleton rounded-[12px]" />
        <div className="mt-2 h-11 w-full skeleton rounded-[12px]" />
        <div className="mt-4 h-11 w-full skeleton rounded-[12px]" />
      </section>
    </main>
  );
}
