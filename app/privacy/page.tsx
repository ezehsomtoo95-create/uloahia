import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { BRAND_NAME, DOMAIN } from "@/lib/constants/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BRAND_NAME} collects, uses, and protects your information.`,
  keywords: ["privacy", "policy", "data protection", "GDPR", "information"],
  alternates: {
    canonical: "/privacy",
  },
};

const UPDATED = "19 July 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description={`This policy explains how ${BRAND_NAME} handles information when you use our marketplace at ${DOMAIN}.`}
      updated={UPDATED}
    >
      <LegalSection title="1. Who we are">
        <p>
          {BRAND_NAME} (“we”, “us”, or “our”) operates an online marketplace and
          directory that helps people discover items and connect with other users in
          Nigeria. We provide listing discovery, account tools, and in-app messaging.
          We do not process payments on the platform.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We collect only what we need to run accounts and marketplace features:</p>
        <ul>
          <li>
            <strong>Account details.</strong> When you sign in with Google, we receive
            your name and email address for account management, authentication, and
            support.
          </li>
          <li>
            <strong>Profile details you provide.</strong> Information you add to your
            profile (such as phone number, username, location, or photo) to use selling,
            chatting, or listing features.
          </li>
          <li>
            <strong>Listings and marketplace content.</strong> Titles, descriptions,
            photos, prices, locations, and related details you post.
          </li>
          <li>
            <strong>Messages.</strong> Content you send or receive through our in-app
            chat, stored so conversations remain available on the platform.
          </li>
          <li>
            <strong>Usage and device data.</strong> Basic technical data such as
            browser type, approximate location derived from your use of the service,
            and interaction logs needed for security, reliability, and product
            improvement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use your information">
        <p>We use your information to:</p>
        <ul>
          <li>Create and manage your account</li>
          <li>Display listings and help users discover items</li>
          <li>Enable in-app chat between buyers and sellers</li>
          <li>Send important service emails (for example, security or message alerts)</li>
          <li>Moderate content, prevent abuse, and keep the marketplace safe</li>
          <li>Improve performance, reliability, and user experience</li>
          <li>Respond to support requests</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your data to process
          payments because payments happen off-platform (for example, via WhatsApp
          arrangements between users).
        </p>
      </LegalSection>

      <LegalSection title="4. Messaging and WhatsApp">
        <p>
          {BRAND_NAME} includes in-app chat so users can discuss listings. Message
          content is stored on our systems for the purpose of providing that feature.
        </p>
        <p>
          Completing a transaction may involve contacting another user on WhatsApp or
          another channel outside {BRAND_NAME}. Those third-party services have their
          own privacy practices. We are not responsible for information you share
          outside our platform.
        </p>
      </LegalSection>

      <LegalSection title="5. Google Sign-In">
        <p>
          If you choose Google Sign-In, Google provides us with basic account
          information (typically name and email) subject to Google’s terms and privacy
          policy. You can revoke access through your Google account settings. We use
          that information only to operate your {BRAND_NAME} account.
        </p>
      </LegalSection>

      <LegalSection title="6. Sharing of information">
        <p>We may share information only when necessary:</p>
        <ul>
          <li>
            <strong>With other users,</strong> as needed for marketplace features (for
            example, your public profile name, listing details, or chat messages you
            send).
          </li>
          <li>
            <strong>With service providers</strong> who help us host, authenticate,
            email, or secure the service, under appropriate confidentiality
            obligations.
          </li>
          <li>
            <strong>For legal and safety reasons,</strong> if required by law or to
            protect users, rights, or the integrity of the platform.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Data retention">
        <p>
          We keep account, listing, and message data for as long as your account is
          active and as needed to provide the service, resolve disputes, enforce our
          terms, and meet legal obligations. If you delete your account, we remove or
          anonymize personal data associated with it, except where we must retain
          limited records for security, fraud prevention, or legal compliance.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use reasonable technical and organizational measures to protect your
          information. No online service is completely secure; please use a strong
          account practice and avoid sharing sensitive payment details in chat.
        </p>
      </LegalSection>

      <LegalSection title="9. Your choices">
        <p>Depending on your account, you may:</p>
        <ul>
          <li>Update profile information from your account settings</li>
          <li>Stop using chat or delete conversations by stopping use of the feature</li>
          <li>Request account deletion through Profile → Privacy &amp; account</li>
          <li>
            Contact us at{" "}
            <a href="mailto:info@ahiaulo.ng">info@ahiaulo.ng</a> about access,
            correction, or deletion requests
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          {BRAND_NAME} is intended for users who can form a binding contract under
          applicable Nigerian law. We do not knowingly collect personal information from
          children. If you believe a child has provided us information, contact us and
          we will take appropriate steps.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised
          version on this page and update the “Last updated” date. Continued use of{" "}
          {BRAND_NAME} after changes means you accept the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Questions about privacy can be sent to{" "}
          <a href="mailto:info@ahiaulo.ng">info@ahiaulo.ng</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
