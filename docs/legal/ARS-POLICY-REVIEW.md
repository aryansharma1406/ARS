# ARS draft policies: release checklist

Version: Draft 2026-09-24. Not legal advice, compliance certification or an approved launch policy set.

## Scope and routes

Public index `/legal`; pages `/legal/terms`, `/legal/privacy`, `/legal/cancellation-refunds`, `/legal/ticket-event-terms`, `/legal/payments`, `/legal/venue-rules`, `/legal/marketing-consent`, `/legal/contact-support`.

All copy lives in `lib/legal-policies.ts`. The public pages display a draft warning and noindex metadata until reviewed. Noindex is not access control. Remove draft/noindex status only after approving final content and resolving placeholders.

## Existing wording aligned

- Checkout, payment status and review flow: payment is manually verified after UTR submission, not confirmed by an app launch or transfer screenshot.
- Inventory holds default to 60 minutes but are configurable. Displayed order deadlines govern; rejected/expired holds do not automatically refund bank transfers.
- Checkout copy now describes one group QR for multiple guests rather than promising separate QR passes.
- Existing MarketingPreferences starts optional channel choices unchecked, requires Save, and clears phone-channel choices when the phone number changes.
- Existing footer/partnership email is hello@ars.events. This draft reuses it but does not verify ownership, delivery, monitoring or grievance-officer appointment.

## Required manual decisions/placeholders

1. Legal operating entity, business/registered/postal address, applicable registration and tax disclosures; do not invent identifiers or licences.
2. Merchant of record, organiser identification, contracting party and allocation of event/refund responsibility.
3. Final effective date/version, change-notification process and legally reviewed dispute terms.
4. Customer cancellation cut-offs, partial group cancellation, transfers/name corrections, re-entry and fee/tax treatment.
5. Organiser cancellation/postponement procedures, customer remedies, refund decision/initiation times, refund destination verification and bank timing communications.
6. Verified support mailbox, hours, phone/accessibility alternatives if offered, designated grievance officer and escalation/contact details, complaint tracking and applicable statutory response deadlines.
7. Privacy responsible entity/contact, data inventory, processors, locations/transfers, legal grounds, cookie names/lifetimes/controls, retention/deletion/backups and incident procedures.
8. Child-data/age-assurance requirements and which Indian data-protection provisions apply at release, accounting for phased commencement.
9. Marketing sender/provider/frequency, sharing scope, opt-out processing and channel-specific consent evidence/retention.
10. Venue-specific safety, accessibility, prohibited-item, age/ID and admission rules.

Do not launch unresolved draft refund/grievance terms as final policies. A disclaimer cannot replace mandatory disclosures or consumer rights.

## Checkout acknowledgement boundary

A separate required unchecked UI checkbox and submission guard were added. Links open in new tabs to preserve form progress. Privacy is acknowledged, not presented as blanket consent to all processing; marketing is not bundled in. Payment payloads, APIs, database schema, authentication, issuance and scans are untouched.

This acknowledgement is client-side only and is NOT persisted as a versioned legal acceptance record. It can be bypassed outside the UI. A legally reviewed server-enforced/versioned acceptance audit requires separately scoped backend work; no claim of durable consent evidence is made here. Existing marketing storage is unchanged.

## Review references

Primary sources for counsel to check applicability and current commencement, not claims of ARS compliance:

- Department of Consumer Affairs, Consumer Protection / E-Commerce framework: https://consumeraffairs.gov.in/pages/consumer-protection-acts
- MeitY, Digital Personal Data Protection Rules and enforcement timeline: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa

Automated typecheck/lint/tests/build do not verify legal sufficiency, mailbox delivery or policy acceptance persistence. Physical/mobile browser accessibility testing is a separate release check.
