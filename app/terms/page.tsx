import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { BRAND_NAME, DOMAIN } from "@/lib/constants/brand";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing use of the ${BRAND_NAME} marketplace.`,
  keywords: ["terms", "service", "legal", "agreement", "marketplace"],
  alternates: {
    canonical: "/terms",
  },
};

const UPDATED = "19 July 2026";

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description={`These Terms govern your use of ${BRAND_NAME} at ${DOMAIN}. By using the platform, you agree to them.`}
      updated={UPDATED}
    >
      <LegalSection title="1. Acceptance of terms">
        <p>
          By creating an account or using {BRAND_NAME}, you agree to these Terms of
          Service and our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use
          the service.
        </p>
      </LegalSection>

      <LegalSection title={`2. What ${BRAND_NAME} is`}>
        <p>
          {BRAND_NAME} is a marketplace and directory that helps users discover listings
          and communicate with each other. We provide tools to post and browse items and
          an in-app chat feature. We are not a party to transactions between users.
        </p>
        <p>
          <strong>No payment processing.</strong> {BRAND_NAME} does not collect payment
          for goods or services listed on the platform. Users may arrange completion of
          a deal through WhatsApp or other channels outside {BRAND_NAME}. Any payment,
          delivery, inspection, or dispute related to a purchase is solely between the
          users involved.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility and accounts">
        <p>
          You must be able to enter a binding contract under applicable law to use{" "}
          {BRAND_NAME}. You are responsible for keeping your login credentials secure
          and for activity under your account. Provide accurate information when you
          register (including via Google Sign-In) and keep your profile reasonably
          up to date.
        </p>
      </LegalSection>

      <LegalSection title="4. Listings and content">
        <p>
          You retain ownership of content you post, but you grant {BRAND_NAME} a
          non-exclusive, worldwide license to host, display, and distribute that content
          as needed to operate the marketplace.
        </p>
        <p>You agree not to post content that is:</p>
        <ul>
          <li>False, misleading, or fraudulent</li>
          <li>Illegal, stolen, or prohibited under Nigerian law</li>
          <li>Infringing of intellectual property or privacy rights</li>
          <li>Harassing, abusive, discriminatory, or otherwise harmful</li>
          <li>Spam, malware, or designed to disrupt the service</li>
        </ul>
        <p>
          We may remove listings, limit features, or suspend accounts that violate these
          Terms or our moderation standards.
        </p>
      </LegalSection>

      <LegalSection title="5. Messaging">
        <p>
          In-app chat is provided so buyers and sellers can discuss listings. You agree
          to use messaging respectfully and lawfully. Do not use chat to scam, threaten,
          spam, or solicit illegal activity. Message content may be reviewed when needed
          for safety, abuse investigation, or legal compliance.
        </p>
        <p>
          Sharing contact details or moving a conversation to WhatsApp is at your own
          risk. Exercise caution before transferring money or meeting in person.
        </p>
      </LegalSection>

      <LegalSection title="6. Transactions and disclaimer">
        <p>
          {BRAND_NAME} does not guarantee the quality, safety, legality, or availability
          of any listed item, or the identity or conduct of any user. We do not escrow
          funds, process card payments, or mediate purchase disputes as a payment
          provider.
        </p>
        <p>
          You are solely responsible for verifying items, agreeing prices, arranging
          delivery or meetup, and completing payment outside the platform. Meet in safe,
          public places when possible and never share OTPs, PINs, or banking passwords in
          chat.
        </p>
      </LegalSection>

      <LegalSection title="7. Prohibited uses">
        <p>You may not:</p>
        <ul>
          <li>Use the service for fraud, money laundering, or other unlawful activity</li>
          <li>Impersonate another person or misrepresent affiliation</li>
          <li>Scrape, harvest, or systematically extract data without permission</li>
          <li>Interfere with platform security or attempt unauthorized access</li>
          <li>Circumvent bans, rate limits, or safety controls</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Intellectual property">
        <p>
          The {BRAND_NAME} name, branding, software, and site design are owned by us or
          our licensors. You may not copy, modify, or distribute our branding or
          software except as allowed by these Terms or with written permission.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension and termination">
        <p>
          You may stop using {BRAND_NAME} at any time and may request account deletion
          from your profile settings where available. We may suspend or terminate access
          if you violate these Terms, create risk for other users, or if we discontinue
          the service.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          The service is provided “as is” and “as available.” To the fullest extent
          permitted by law, we disclaim warranties of merchantability, fitness for a
          particular purpose, and non-infringement. We do not warrant uninterrupted or
          error-free operation.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {BRAND_NAME} and its operators will
          not be liable for indirect, incidental, special, consequential, or punitive
          damages, or for loss of profits, data, or goodwill arising from your use of
          the service or from user-to-user transactions. Our total liability for any
          claim relating to the service is limited to the greater of (a) the amount you
          paid us (if any) for paid platform features in the three months before the
          claim, or (b) ₦10,000.
        </p>
      </LegalSection>

      <LegalSection title="12. Indemnity">
        <p>
          You agree to defend and indemnify {BRAND_NAME} against claims arising from
          your content, your use of the service, your transactions with other users, or
          your violation of these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may update these Terms periodically. We will post the updated Terms on this
          page and revise the “Last updated” date. Continued use after changes
          constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing law">
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria.
          Disputes will be subject to the exclusive jurisdiction of the courts of
          Nigeria, without prejudice to any mandatory consumer protections that apply.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          For questions about these Terms, email{" "}
          <a href="mailto:info@ahiaulo.ng">info@ahiaulo.ng</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
