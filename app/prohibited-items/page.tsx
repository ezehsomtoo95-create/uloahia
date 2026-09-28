import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { BRAND_NAME, DOMAIN } from "@/lib/constants/brand";

export const metadata: Metadata = {
  title: "Prohibited Items",
  description: `Items that may not be listed on ${BRAND_NAME}, and how we handle listings that break this policy.`,
  keywords: ["prohibited items", "listing policy", "marketplace rules", "not allowed"],
  alternates: {
    canonical: "/prohibited-items",
  },
};

const UPDATED = "28 September 2026";

export default function ProhibitedItemsPage() {
  return (
    <LegalPageShell
      title="Prohibited Items"
      description={`${BRAND_NAME} is a marketplace for lawful goods and lawful services only. Some items may never be listed here, regardless of category or price.`}
      updated={UPDATED}
    >
      <LegalSection title="1. The rule">
        <p>
          {BRAND_NAME} is a marketplace for lawful goods and lawful services only.
          Sellers are responsible for holding whatever licence or permit their item
          requires. {BRAND_NAME} does not verify that a seller holds one.
        </p>
        <p>
          These rules apply in every category, including cars and car parts. If you
          are unsure whether something is allowed, ask us before you list it.
        </p>
      </LegalSection>

      <LegalSection title="2. Never permitted">
        <p>
          <strong>Weapons and ammunition.</strong> Firearms of any kind, imitation
          firearms that are not clearly and permanently non-firing, ammunition,
          cartridges, bullets, and parts intended to convert or improve a firearm.
        </p>
        <p>
          <strong>Police sirens and law-enforcement equipment.</strong> Sirens,
          beacons, light bars and PA systems sold as police equipment; police or
          military uniforms, badges and rank insignia; tasers, stun guns, pepper
          spray and tear gas; anti-riot gear. This includes anything sold in a way
          that would let a private buyer impersonate an officer.
        </p>
        <p>
          A car alarm or an ordinary horn is fine. Anything sold{" "}
          <em>because</em> it is a police siren is not.
        </p>
        <p>
          <strong>Controlled substances and medicines.</strong> Recreational drugs
          and controlled substances, prescription-only medicines sold without a
          prescription, and unregistered or counterfeit pharmaceuticals.
        </p>
        <p>
          <strong>Counterfeit and stolen goods.</strong> Counterfeit or replica
          goods intended to pass as genuine, replica identity documents, stolen
          goods, and second-hand devices sold as new without disclosure.
        </p>
        <p>
          <strong>Explosives and dangerous materials.</strong> Explosives,
          detonators, blasting wire, fireworks of any class, and radioactive,
          chemical or biological materials.
        </p>
      </LegalSection>

      <LegalSection title="3. Allowed, with conditions">
        <p>
          <strong>Firearms</strong> may be listed by licensed collectors, licensed
          dealers and licensed security companies, provided the seller states their
          licence in the listing and has been verified. Contact us first.
        </p>
        <p>
          <strong>Second-hand vehicles and car parts</strong> are allowed, and are
          a core category. Parts must be described accurately and not presented as
          belonging to a police or government fleet.
        </p>
        <p>
          <strong>Knives, tools and hunting equipment</strong> are allowed as
          ordinary tools, but not when sold as weapons.
        </p>
        <p>
          <strong>Used phones and electronics</strong> are allowed; condition and
          IMEI lock status must be stated honestly.
        </p>
        <p>
          <strong>Alcohol, tobacco and services</strong> are allowed where the
          seller is licensed or qualified, and says so.
        </p>
      </LegalSection>

      <LegalSection title="4. What happens to a prohibited listing">
        <p>
          A prohibited listing is rejected and stops appearing in search, browse,
          categories and the seller&apos;s store immediately. The seller is told why
          and can list a compliant item instead.
        </p>
        <p>
          Content that is suspicious but not clearly prohibited may stay up briefly
          while it is reviewed by a person. Repeat offenders are progressively
          restricted.
        </p>
        <p>
          Rejected listings are not silently deleted. Keeping the record means the
          decision can be explained, reviewed and reversed if it was wrong.
        </p>
      </LegalSection>

      <LegalSection title="5. Reporting a listing">
        <p>
          If you see something that should not be here, use the{" "}
          <strong>Report</strong> option on the post, comment or chat. Reports go
          straight to our moderators.
        </p>
        <p>
          See also our <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>, or email us at{" "}
          <a href={`mailto:info@${DOMAIN}`}>info@{DOMAIN}</a>.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
