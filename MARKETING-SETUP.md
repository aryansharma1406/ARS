# ARS customer CRM and marketing

## Enable the module

Apply only `supabase/migrations/202609130001_customer_marketing.sql` in the connected project's Supabase SQL Editor. This migration has not been applied by the code changes. It creates separate marketing tables and consent policies. Do not rerun the full database setup against existing data.

Admin: `/admin/marketing`. Customer consent: `/account/marketing` (also linked in account navigation).

Registration remains in `public.users`; purchases, issued tickets and scans remain in their existing tables. No duplicate CRM profile or external spreadsheet is created. The marketing module reads current data on page load. Refresh the page to obtain newer records. Legacy orders without a customer account ID are not matched by guest-supplied email, to avoid incorrectly linking someone else's history.

Customers without a preferences row are opted out of all marketing. Preferences are optional and independent of transactional messages. Only authenticated customers can write their own preferences through the consent RPC. Each save records a timestamped consent snapshot and notice version. Admins can read consent, but cannot grant it on a customer's behalf. Changing a phone clears phone-channel selections in the form; the customer must choose them again. Email consent is eligible only while the saved email matches the current account email. City is self-reported.

Exports are user-requested CSV files compatible with Excel. They contain personal information, not QR credentials. No automatic spreadsheet syncing or external customer database is introduced. Saved audiences contain filter definitions and are dynamically evaluated, not copies of contacts.

## Campaign sending is not implemented or enabled

The module saves drafts for WhatsApp, email and SMS. The delivery-events table and reporting are preparation for a provider integration, not a functioning delivery pipeline. There is no Send action, scheduler, webhook endpoint or background sender in this change. No real delivery metrics are invented. Revenue attribution to campaigns is not implemented.

A production provider integration must add:

- Server-only provider credentials and channel configuration, with approved WhatsApp templates where required.
- A durable recipient queue, retry/backoff and idempotency keys; audience re-evaluation and deduplicated recipient selection.
- Immediate pre-send checks for active customer accounts, current destination, channel-specific consent and suppression state. Never trust a draft audience count or exported CSV as consent.
- Provider-signed webhook validation, replay protection and server-recorded delivery events with unique provider IDs. Do not accept unauthenticated browser delivery events.
- A working unsubscribe link and inbound STOP/opt-out handling that revokes preferences before acknowledging the opt-out. Account preferences alone do not replace provider unsubscribe requirements.
- Cancellation and frequency controls; no sending until all of these controls are available.
- Recipient retention/deletion policy, restricted exports, and operational audit/monitoring.

The event table counts distinct customer/event outcomes per campaign. Read/click support varies by channel. Add attribution deliberately before reporting campaign purchases or revenue.

No tests, schema execution, provider sends or migrations were run as part of this implementation.
