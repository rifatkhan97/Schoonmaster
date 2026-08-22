# Schoonmaster Operations Automation & Commercial Platform

Enterprise-grade operations automation platform and commercial e-commerce portal built for **Schoonmaster BV** — digitizing distributed cleaning workforce operations, site scheduling, incident management, material supply fulfillment, and service bookings.

---

## 🌟 Architecture & Key Features

### 🏢 Operations Architecture
- **Multi-Tenant Foundation**: PostgreSQL schema isolation via `tenant_id` partitioning and Supabase Row Level Security (RLS).
- **Role-Based Access Control (RBAC)**: Enforced via Next.js 16 proxy middleware (`proxy.ts`) and Supabase RLS JWT claims:
  - `ADM`: Full System Administrator
  - `MGR`: Operations Manager / Supervisor
  - `CLN`: Field Technician / Cleaner
  - `AUD`: Compliance Auditor
- **Offline-First PWA**: Progressive Web App capabilities (`next-pwa` + Workbox) with IndexedDB client queue (`schoonmaster-offline`) and background sync for low-connectivity environments.

### 🧹 Field Cleaner Portal (`/cleaner/*`)
- **Dashboard**: Active shift banner with live pulse indicator, Google Maps deep-link navigation, unread announcement alert, KPI statistics, and quick-action shortcuts.
- **My Schedule**: 2-week chronological shift timeline grouped by day.
- **Task Checklists**: Offline-first task checklists with client-side timestamp reconciliation (last write wins) and animated completion progress.
- **Supply Requests**: Catalog grid with quantity controls, notes, and per-line-item approval tracking (`PARTIALLY_APPROVED` support).
- **Incident Reporting**: Structured category chips, photo upload (JPEG/PNG up to 10MB) with preview, and GDPR image retention policies.
- **SOPs**: Site-specific cleaning protocols, safety guidelines, and Do's & Don'ts (`revalidate = 0`).
- **Announcements**: Accordion updates with immutable read-receipt POSTing.
- **Who's on Duty**: Privacy-preserving peer view showing technicians on overlapping shift windows.

### 🛡️ Admin Operations Center (`/admin/*`)
- **Real-Time KPIs**: Active projects, total staff, pending supply requests, and unresolved incidents.
- **Operations Feeds**: Live feeds for field incidents, supply orders, and system audit logs.

### 🛍️ Commercial Storefront & E-Commerce (`/store`)
- **Services & Products Catalog**: Publicly accessible booking for commercial cleaning services and supply store.
- **Mollie Payment Integration**: Zod-validated order creation, Dutch 21% BTW tax calculation, iDEAL and credit card processing.
- **SendGrid Email Notifications**: Automated transactional emails on payment confirmation.

### 🔒 GDPR Compliance API (`/api/gdpr/export/*`)
- **Data Portability**: Downloadable structured JSON export of user profile, shifts, checklist completions, requests, and incidents.
- **Right to Erasure**: Full profile anonymisation, incident storage image purging, auth account deletion, and audit logging.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 / 16 (App Router + Turbopack)
- **Language**: TypeScript
- **Styling**: Custom Vanilla CSS Tokens & Design System (`/app/globals.css`)
- **Backend & Database**: Supabase (Auth, PostgreSQL, Storage, Realtime, RLS)
- **Payment Gateway**: Mollie (iDEAL, Credit Card)
- **Email Service**: SendGrid
- **Offline & PWA**: `@ducanh2912/next-pwa`, Workbox, IndexedDB

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18.x or 20.x

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rifatkhan97/Schoonmaster.git
   cd Schoonmaster
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase, Mollie, and SendGrid keys.

4. **Database Setup**:
   Execute the migration script `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Vercel

This repository is optimized for 1-click zero-configuration Vercel deployment:
1. Import the repository `rifatkhan97/Schoonmaster` on Vercel.
2. Add the environment variables from `.env.example` to your Vercel Project Settings.
3. Deploy!

---

## 📄 License & Ownership

Prepared for **Schoonmaster BV**. All rights reserved.
