# Prohibited Items Policy — AhiaUlo (ahiaulo.ng)

**Status:** active
**Adopted:** 28 September 2026
**Owner:** platform moderation
**Public version:** https://ahiaulo.ng/prohibited-items
**Enforcement:** listing rejection, progressive account restriction, removal

---

## 1. Purpose

AhiaUlo is a marketplace for ordinary people buying and selling real goods —
primarily cars and car parts, with other categories live. A listing that sells
weapons, law-enforcement equipment, controlled substances or counterfeit goods
is not merely "a bad listing": it exposes the platform and, more importantly,
the person browsing it, to real physical and legal risk. It also destroys the
one asset this business is trying to build, which is that a listing on AhiaUlo
can be trusted.

This policy exists so that the line is written down, is the same for every
seller, and can be pointed at when a listing is rejected.

## 2. The rule

AhiaUlo is a marketplace for **lawful goods and lawful services only**. Sellers
are responsible for holding whatever licence or permit their item requires.
AhiaUlo does not verify that a seller holds one.

## 3. Never permitted, in any category, at any price

These are hard blocks. A listing matching any of these is rejected on sight
and the account is reviewed.

### 3.1 Weapons and ammunition
- Firearms of any kind: pistols, revolvers, rifles, shotguns, submachine
  guns, imitation/replica firearms that are not clearly and permanently
  non-firing toys
- Ammunition, cartridges, bullets, gunpowder, primers
- Weapon parts intended to convert, repair or improve a firearm
  (barrels, triggers, magazines, bolt carriers)

### 3.2 Law-enforcement and security equipment
- **Police sirens, beacons, light bars and PA systems** — including
  "Police Siren", "traffic siren", "emergency siren" and similar
- Police/Fire Service uniforms, badges, epaulettes, rank insignia, ID cards
- Taser, stun gun, pepper spray, tear gas, riot control equipment
- Anti-riot shields, batons, handcuffs sold as police kit
- Anything marketed as being for the "Nigerian Police", "NSCDC", "Army",
  "Navy", "Air Force", "Immigration" or "EFCC" that would let a private
  buyer impersonate an officer

> A car alarm or a plain horn is fine. Anything sold *because* it is a
> police siren is not.

### 3.3 Controlled substances and medicines
- Recreational drugs and controlled substances: cannabis/marijuana, cocaine,
  heroin, methamphetamine, khat, tramadol, codeine-containing products sold as
  narcotics, shisha/hookah tobacco
- Prescription-only medicines sold without a prescription
- Unregistered or counterfeit pharmaceuticals
- Raw or unlabelled chemicals intended for production

### 3.4 Counterfeit and stolen goods
- Counterfeit or replica designer goods intended to pass as genuine
- Replica/stub ID cards, passports, driver's licences, national identity
  numbers, SIM cards
- Stolen goods, or goods a seller admits were not lawfully acquired
- "Second-hand" phones/laptops sold as new without disclosure

### 3.5 Explosives and dangerous materials
- Explosives, detonators, blasting wire, fireworks of any class
- Industrial chemicals sold without safety qualification
- Radioactive, chemical or biological materials of any kind

## 4. Permitted, with conditions

These are allowed but carry a duty on the seller to declare them.

- **Firearms for licensed collectors, dealers and licensed security
  companies** — permitted only where the seller sets out their licence in
  the description and is verified. Contact support before listing.
- **Second-hand vehicles and car parts** — permitted. Parts must be
  described accurately and not represented as belonging to a live police
  or government fleet.
- **Knives, tools and hunting equipment** — permitted as ordinary tools.
  Not permitted when sold as weapons.
- **Used phones and electronics** — permitted. Condition and IMEI lock status
  must be stated honestly.
- **Alcohol and tobacco** — permitted for sellers who are licensed to sell
  them.
- **Services** — permitted, with the seller's qualifications stated.

## 5. How a listing is actioned

1. **Rejected.** The listing is set to `rejected` and stops appearing on home,
   browse, category, store and search immediately. The seller is shown the
   reason and can relist a compliant item.
2. **Reviewed.** Suspicious but not clearly prohibited content is left up and
   queued for a human decision. The automated scorer in
   `supabase/migrations/0049_safety_moderation.sql` handles this.
3. **Restricted.** Repeat offenders accumulate strikes in
   `user_moderation_state` and get progressively restricted.

Rejected listings are **not hard-deleted** by default. The record is kept so
the decision is auditable and reversible, and so the seller has been told why
rather than silently losing a listing.

## 6. Reporting

Any user can report a listing, post, reply or comment from the report sheet on
the item. Reports go to `content_reports` and appear in the admin dashboard at
`/admin#admin-reports`. The dedicated moderation queue is scheduled for
Phase 2.

## 7. Review cadence

This policy is reviewed quarterly and after any change in Nigerian law that
affects what may be sold. The audit script keyword list in
`scripts/audit-prohibited-items.mjs` is a **screening aid only** — it is how
Phase 1 found the siren listing, and a clean run does not mean a catalogue is
compliant. Judgment still applies.
