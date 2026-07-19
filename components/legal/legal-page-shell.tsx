import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_NAME } from "@/lib/constants/brand";
import { SUPPORT_MAILTO_HREF } from "@/lib/constants/support";

export function LegalPageShell({
  title,
  description,
  updated,
  children,
}: {
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <div className="legal-page__paper">
        <header className="legal-page__header">
          <p className="legal-page__crumb">
            <Link href="/" className="legal-page__link">
              {BRAND_NAME}
            </Link>
            <span className="legal-page__crumb-sep" aria-hidden>
              /
            </span>
            {title}
          </p>
          <h1 className="legal-page__title">{title}</h1>
          <p className="legal-page__lede">{description}</p>
          <p className="legal-page__updated">Last updated: {updated}</p>
        </header>

        <article className="legal-page__body">{children}</article>

        <nav className="legal-page__nav" aria-label="Legal pages">
          <Link href="/privacy" className="legal-page__link">
            Privacy Policy
          </Link>
          <Link href="/terms" className="legal-page__link">
            Terms of Service
          </Link>
          <a href={SUPPORT_MAILTO_HREF} className="legal-page__link">
            Contact support
          </a>
        </nav>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="legal-page__section">
      <h2 className="legal-page__heading">{title}</h2>
      <div className="legal-page__copy">{children}</div>
    </section>
  );
}
