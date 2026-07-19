import Link from "next/link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants/brand";

export const metadata = {
  title: "Offline",
  description: `You're offline. Reconnect to keep using ${BRAND_NAME}.`,
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="auth-screen auth-screen--with-support">
      <section className="auth-screen__card" style={{ textAlign: "center" }}>
        <p className="type-brand-sub text-primary">{BRAND_NAME}</p>
        <p className="auth-screen__tagline">{BRAND_TAGLINE}</p>
        <h1 className="type-page-title">You&apos;re offline</h1>
        <p className="type-page-sub">
          Check your connection, then try again. Cached pages may still work.
        </p>
        <div className="auth-screen__body" style={{ marginTop: "1rem" }}>
          <Link href="/" className="auth-screen__btn auth-screen__btn--primary">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
