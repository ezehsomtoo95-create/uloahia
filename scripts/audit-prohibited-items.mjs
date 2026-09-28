/**
 * Screen live listings against the Prohibited Items Policy.
 * See docs/prohibited-items-policy.md.
 *
 * THIS SCRIPT IS READ-ONLY. It never writes, updates or deletes a listing.
 * Its only job is to surface candidates for a human to decide on. A clean run
 * does NOT mean a catalogue is compliant - the keyword list is a coarse
 * screen, and judgment still applies.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-prohibited-items.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Uses the service role so it can see listings that are not yet approved
 * (pending/rejected items are exactly where a bad listing often hides).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/audit-prohibited-items.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Grouped to match the policy sections. Terms are intentionally broad;
// false positives are fine, they just need a human look.
const RULE_SETS = [
  {
    policy: "3.1 Weapons and ammunition",
    terms: [
      "gun", "rifle", "pistol", "revolver", "shotgun", "smg", "ammunition",
      "ammo", "cartridge", "bullet", "gunpowder", "firearm",
    ],
  },
  {
    policy: "3.2 Law-enforcement and security equipment",
    terms: [
      "siren", "police siren", "light bar", "lightbar", "beacon",
      "police uniform", "police badge", "taser", "stun gun", "pepper spray",
      "tear gas", "handcuff", "anti-riot", "nigerian police", "nscdc",
      "immigration officer", "police pa",
    ],
  },
  {
    policy: "3.3 Controlled substances and medicines",
    terms: [
      "cannabis", "marijuana", "cocaine", "heroin", "methamphetamine", "khat",
      "tramadol", "narcotic", "shisha", "hookah", "pregabalin",
    ],
  },
  {
    policy: "3.4 Counterfeit and stolen goods",
    terms: [
      "counterfeit", "replica", "fake id", "forged", "stolen",
      "duplicate imei", "clone imei",
    ],
  },
  {
    policy: "3.5 Explosives and dangerous materials",
    terms: [
      "explosive", "detonator", "blasting wire", "firework", "dynamite",
      "grenade", "improvised explosive",
    ],
  },
];

const { data, error } = await supabase
  .from("listings")
  .select("id, title, description, category, status, price, views, created_at")
  .limit(2000);

if (error) {
  console.error(`Failed to read listings: ${error.message}`);
  process.exit(1);
}

const findings = [];

for (const row of data) {
  const haystack = `${row.title ?? ""} ${row.description ?? ""}`.toLowerCase();
  for (const { policy, terms } of RULE_SETS) {
    const hits = terms.filter((term) => haystack.includes(term));
    if (hits.length > 0) {
      findings.push({ ...row, policy, hits });
    }
  }
}

console.log(`Scanned ${data.length} listings (all statuses).`);
console.log(`Candidates needing a human decision: ${findings.length}\n`);

if (findings.length === 0) {
  console.log("No keyword matches. NOTE: a clean run is not a compliance sign-off.");
  process.exit(0);
}

for (const f of findings) {
  console.log("--------------------------------------------------");
  console.log(`  ${f.title}`);
  console.log(`  id        ${f.id}`);
  console.log(`  category  ${f.category ?? "-"}`);
  console.log(`  status    ${f.status}   price ${f.price ?? "-"}   views ${f.views ?? 0}`);
  console.log(`  created   ${f.created_at}`);
  console.log(`  policy    ${f.policy}`);
  console.log(`  matched   ${f.hits.join(", ")}`);
}

console.log("--------------------------------------------------");
console.log("Review each candidate. Reject via the admin dashboard;");
console.log("do not delete rows. See docs/prohibited-items-policy.md section 5.");
