# DealShield AI — Web Application

Next.js 14 App Router application built with TypeScript, Tailwind CSS, and shadcn/ui components for DealShield AI (Hackathon Problem LS-06).

## Overview

The web client provides:
- **Responsive Dynamic Navigation:** Authenticated profile dropdown, dynamic auth actions ("Log In" / "Sign Up" vs. user avatar initials), and core modules (Dashboard, Upload, Analysis, Agreements, Confirmations, Evidence Vault).
- **Authentication & User Management (`/login`, `/signup`, `/profile`, `/settings`):** Secure PBKDF2 authentication, Bearer JWT session management, two-sided settings with Section 12 DPDP WhatsApp history erasure and password change modal.
- **Dedicated Counterparty Review Portal (`/review`):** Distraction-free external review portal for counterparties receiving single-use signed token links, featuring formal contract presentation, "I Agree & Confirm" assent execution, and conditional decline feedback.
- **Live Backend Diagnostic Status:** Queries `GET /health` with automatic polling and indicator pills.
- **WhatsApp Chat Ingestion (`/upload`):** Drag-and-drop or paste interface parsing conversations via `/api/v1/chats/upload`.
- **Citation-Ready Analysis UI (`/analysis`):** Displays extracted business terms, pricing contradictions, and Section 7 ICA missing statutory protections.
- **Evidence Vault (`/evidence`):** Verifies document integrity hashes via `/api/v1/evidence/verify` and audits immutable event logs.

## Getting Started

### 1. Prerequisites
- Node.js 18+ or Node.js 20+
- npm 9+

### 2. Install Dependencies

```bash
cd apps/web
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env.local
```
*(Defaults to connecting to FastAPI at `http://localhost:8000`)*

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Linting and Type Checking

```bash
npm run lint
npm run typecheck
npm run build
```
