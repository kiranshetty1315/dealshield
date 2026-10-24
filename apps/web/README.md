# DealShield AI — Web Application

Next.js 14 App Router application built with TypeScript, Tailwind CSS, and shadcn/ui components for DealShield AI (Hackathon Problem LS-06).

## Overview

The web client provides:
- **Responsive Navigation:** Dashboard, Upload, Analysis, Agreements, Confirmations, Evidence Vault
- **Live Backend Diagnostic Status:** Queries `GET /health` with automatic polling and indicator pills
- **WhatsApp Chat Ingestion:** Drag-and-drop or paste interface parsing conversations via `/api/v1/chats/upload`
- **Citation-Ready Analysis UI:** Displays extracted business terms, pricing contradictions, and missing statutory protections
- **Evidence Vault:** Verifies document integrity hashes via `/api/v1/evidence/verify`

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
