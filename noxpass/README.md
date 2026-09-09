# NoxPass - Nightlife & Event Ticketing Infrastructure

NoxPass is a high-performance, mobile-first nightlife event ticketing platform built for nightclubs, promoters, and partygoers, starting with launch venue **Club Xtreme, Tito's Lane, Goa**.

Designed with clean architecture and multi-venue scalability to onboard additional venues (e.g. Club ABC, Club XYZ) seamlessly.

---

## 🌟 Key Features

1. **Customer Web Application**:
   - Premium Nightlife Aesthetics (Glassmorphism, dark Obsidian theme, neon accents).
   - Event Directory with date, venue, category, and price filters.
   - Event Detail view with age restriction warnings, ticket quantity selection, and promoter referral code capture (`?source=XYZ-ARYAN`).
   - Mobile-optimized Checkout with 256-bit server verified **Razorpay** payments.
   - Encrypted Digital QR Pass (`/ticket/[ticketId]`) with status badges (`VALID`, `USED`, `PAYMENT_FAILED`, `REFUNDED`) and downloadable ticket card.

2. **Staff QR Entry Portal (`/staff/scanner`)**:
   - Door terminal authentication & venue assignment.
   - Camera QR scanner & manual Ticket ID search input.
   - Real-time entry status validation (`VALID` -> `USED` transition, `⚠ ALREADY USED` duplicate prevention warning, and `✕ INVALID TICKET` alert).
   - Live audit feed of today's door entries.

3. **Admin & Commission Dashboard (`/admin`)**:
   - Real-time Analytics (Gross ticket revenue, tickets sold vs door scanned, attendance %, top promoters leaderboard).
   - Multi-Venue Management (`/admin/venues`) - CRUD + configurable commercial split % (e.g. 20% for Club Xtreme).
   - Events & Pricing Management (`/admin/events`) - Create, edit, publish/unpublish, set dates, prices, and capacities.
   - Ticket & Order Log (`/admin/tickets`).
   - **Source / Promoter Attribution (`/admin/promoters`)** - Full referral code tracking (`XYZ-ARYAN`) showing tickets sold, entry revenue, and 20% commission payable. Enforces rule: *Commission is calculated strictly on ticket/entry revenue*.
   - **Club Settlement Reports (`/admin/settlements`)** - Automated commercial split reports (Gross Revenue - Platform Commission = Net Venue Payout).
   - CSV Exports for Ticket Sales, Entry Attendance, Source Performance, and Settlement Reports.

---

## 🚀 Quick Setup Instructions

### 1. Local Development Setup

```bash
# 1. Navigate to project directory
cd /Users/aryansharma/.gemini/antigravity/scratch/noxpass

# 2. Install dependencies (if not already installed)
npm install

# 3. Launch local dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials (Optional: Built-in local mock store falls back smoothly if empty)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Razorpay Configuration (Indian Payments)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_noxpass12345
RAZORPAY_KEY_SECRET=noxpass_secret_key_67890
```

> **Note**: NoxPass features a built-in mock/demo store fallback mode. If Supabase or Razorpay credentials are not provided, the entire flow (checkout, payment simulation, QR scanning, promoter attribution, and CSV exports) works out of the box for testing!

---

### 3. Supabase Setup Instructions

1. Log into your [Supabase Dashboard](https://supabase.com) and create a new PostgreSQL project.
2. Navigate to **SQL Editor** in Supabase.
3. Run the schema creation script from `supabase/schema.sql`.
4. Run the initial seed script from `supabase/seed.sql`.
5. Copy your project URL and keys (`anon` key and `service_role` key) into `.env.local`.

---

### 4. Razorpay Setup Instructions

1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Account & Settings** -> **API Keys** -> Generate **Test Key ID** & **Secret**.
3. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env.local` or Vercel Environment Variables.
4. Add your webhook URL `https://your-domain.com/api/webhooks/razorpay` in Razorpay Webhook settings for `order.paid` events.

---

### 5. Vercel Deployment Instructions

1. Push this repository to GitHub/GitLab.
2. Import the project into your [Vercel Dashboard](https://vercel.com).
3. Set Environment Variables in Vercel project settings (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Click **Deploy**.

---

## 🔁 Complete Operational Test Flow

1. **Promoter Link Entry**: Visit an event via a promoter referral link:
   `http://localhost:3000/events/evt-xtreme-neon-01?source=XYZ-ARYAN`
2. **Customer Checkout**: Select ticket quantity, fill guest details, click **Pay Now via Razorpay** (runs verified server payment handshake).
3. **Digital Pass Issued**: Customer receives unique pass at `/ticket/[ticketId]` with status `VALID` and downloadable QR pass card.
4. **Staff Door Entry**: Door staff accesses `/staff/scanner`, scans/inputs `NOX-XTREME-ROHAN-001`. Status updates to `USED`, door entry log records timestamp. Duplicate scan attempt shows **⚠ TICKET ALREADY USED**.
5. **Admin Promoter Commission**: Check `/admin/promoters` to see source `XYZ-ARYAN` credited with tickets sold, entry revenue, and 20% commission payable.
6. **Settlement Report**: Check `/admin/settlements` for Club Xtreme settlement report and click **Export Settlement CSV**.
