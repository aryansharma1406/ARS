# Admin UPI reporting

Apply `supabase/migrations/202609230002_upi_admin_search.sql` after the original
manual-UPI migration. This adds read-only admin reporting functions and indexes;
it does not alter payment review, expiry, reservation or fulfillment functions.
It has not been applied to the hosted database by this task.

## Interface

- Admin > UPI Verification opens Pending Approval, sorted by nearest hold expiry.
- Approved, Rejected, Expired and All tabs have filter-aware counts.
- Compact tables have 25/50/100-row server-side pagination.
- Search matches UTR, Order ID, name, email, phone, event name or ticket ID.
- Filters include venue, event, amount bounds and reviewer.
- Today/7D/30D/90D count IST calendar days including today; Custom is inclusive
  of both dates. All date filters use UTR submission time.
- Sort by Newest, Oldest, Highest Amount, Lowest Amount, Recently Approved or
  Expiring Soon. Recently Approved prioritizes verified/refunded approvals.
- Click a customer, row or Review button to open payment details, guest-entry
  status and immutable payment audit records. Only pending payments have review
  controls. The existing server-side review RPC remains the final authority.
- Hold-duration settings remain available in the collapsible settings section.
- CSV exports all matching pages from one database snapshot, excluding QR
  credentials. Exports above 10,000 rows require narrower filters; they are not
  silently truncated. Formula-like CSV values are escaped.

The customer payment page is unchanged. All new read endpoints require admin
authentication; the SQL functions independently check admin identity. New SQL
functions do not grant owners, staff or customers access to administrative data.

## Validation status

No typecheck, automated tests, migration execution, performance benchmark or
browser validation was run for this update. Before deployment, apply migrations
to a test database and exercise >500 test submissions, pagination and exports,
every filter/sort, cross-role denial, drawer approval/rejection and stale expiry.
Do not use real payments to validate the interface.
