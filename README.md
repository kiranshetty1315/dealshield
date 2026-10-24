# DealShield AI 🛡️

> **Hackathon Problem Statement LS-06: From Handshake to Contract**  
> *Transform informal WhatsApp business negotiations into structured, reviewable agreements with conflict detection, two-party mutual confirmation, and tamper-evident audit records.*

[![CI — DealShield AI](https://github.com/kiranshetty1315/dealshield/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranshetty1315/dealshield/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-000000.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)

---

## 📖 Overview

In emerging markets such as India, millions of MSMEs, freelancers, and independent contractors conclude high-value commercial agreements over informal chat channels—predominantly **WhatsApp**.

These negotiations suffer from:
- **Price and scope ambiguities:** "Sounds good", "I think that works", "depending on timeline". Under Section 7 of the Indian Contract Act, 1872, acceptance must be absolute and unqualified.
- **Missing essential protections:** Absence of intellectual property assignment under the Copyright Act, 1957, milestone payment structures, or work-in-progress termination remedies under Section 73 ICA.
- **Evidentiary vulnerabilities:** Chat screenshots lack verifiable cryptographic integrity proofs and can be disputed or dismissed in court proceedings.

**DealShield AI** solves this through an end-to-end LegalTech pipeline:
1. **WhatsApp Ingestion:** Normalizes exported `.txt` transcripts and assigns deterministic, stable citation IDs (`msg_raj_001`, `msg_priya_004`).
2. **AI Terms & Conflict Extraction:** Parses contracting parties, consideration, milestones, and flags price disagreements and qualified acceptance hedges under Section 7 of the Indian Contract Act, 1872.
3. **Plain-Language Agreement Synthesis:** Generates standardized clauses adhering to Indian commercial law principles with tamper-evident citation links.
4. **Two-Party Confirmation Workflow:** Facilitates independent mutual sign-off via dashboard and single-use signed token links before contract activation.
5. **Tamper-Evident Evidence Vault:** Calculates SHA-256 integrity digests and maintains an append-only audit trail for Section 65B Indian Evidence Act / Section 63 BSA 2023 corroborative admissibility.

---

## 💻 Tech Stack

### Frontend Application
- **Framework:** Next.js 14 (App Router) with React 18
- **Language:** TypeScript 5.6+ (strict type checking)
- **Styling:** Tailwind CSS 3.4+ with `@tailwindcss/typography`
- **UI Components:** shadcn/ui component architecture with Radix UI primitives
- **Icons:** Lucide React
- **API Client:** Strongly-typed singleton client consuming backend OpenAPI contracts

### Backend API
- **Framework:** FastAPI 0.110+ (ASGI high-performance web framework)
- **Runtime:** Python 3.9+ / 3.11+
- **Data Validation & Settings:** Pydantic v2 & Pydantic-Settings (canonical single source of truth)
- **Web Server:** Uvicorn with standard workers
- **Testing:** Pytest 8.4+ & Pytest-Asyncio (34 passing unit & integration tests)

### AI & Legal Intelligence Engine
- **LLM Engine:** OpenAI API (`gpt-4o-mini`) with Pydantic structured output validation (`response_format=AgreementAnalysis`)
- **Deterministic Offline Engine:** Intelligent heuristic fallback engine guaranteeing 100% precision evaluation against legal fixtures without requiring live API keys
- **Conflict Detector:** Section 7 Indian Contract Act 1872 conflict detection engine mapping counter-proposals and qualified acceptance hedges to exact verbatim message citations
- **Legal Retriever:** Curated statutory knowledge engine (ICA 1872 Sections 2(h), 7, 10, 73; Copyright Act 1957 Sections 17 & 19; IT Act 2000 Section 10A; Indian Stamp Act 1899 Section 35)

### Database, Security & Evidence
- **Database:** Supabase (PostgreSQL 15+) with Row-Level Security (RLS) policies
- **Local Dev Engine:** In-memory PostgREST-compatible query engine supporting complete CRUD and filter chains for offline development
- **Document Integrity:** SHA-256 deterministic cryptographic hashing (`hashlib`)
- **Privacy Compliance:** Digital Personal Data Protection Act (DPDP Act 2023) compliant secret-salted HMAC IP anonymization
- **Access Control:** Single-use cryptographic token confirmation for unauthenticated counterparties
- **Audit Logging:** Append-only immutable audit trail recording all contract lifecycle events

---

## 🏗️ Repository Architecture

```
dealshield/
├── apps/
│   ├── web/                    # Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
│   │   ├── src/
│   │   │   ├── app/            # Routes: /, /upload, /analysis, /agreements, /confirmations, /evidence, /dashboard
│   │   │   ├── components/     # UI primitives, chat normalizer, conflict drawer, agreement preview
│   │   │   ├── lib/            # Typed API client, Supabase auth boundary, utility helpers
│   │   │   ├── hooks/          # React hooks (useHealthCheck with auto-polling)
│   │   │   └── types/          # TypeScript contracts synced with backend Pydantic models
│   │   ├── package.json
│   │   └── .env.example
│   └── api/                    # FastAPI backend (Python 3.9+)
│       ├── app/
│       │   ├── api/routes/     # /health, /chats, /analysis, /agreements, /confirmations, /evidence
│       │   ├── core/           # Pydantic v2 settings, CORS, and security boundaries
│       │   ├── db/             # Supabase client & repository layer (Conversation, Agreement, Confirmation, Audit)
│       │   ├── schemas/        # Canonical Pydantic schemas (single source of truth)
│       │   └── services/       # Chat parser, conflict detector, legal retriever, AI extractor, agreement generator
│       ├── tests/              # 34 unit & integration tests (100% passing)
│       ├── requirements.txt
│       └── .env.example
├── packages/
│   └── contracts/              # JSON Schema definitions & sample payloads
├── legal-knowledge/            # Curated Indian legal references (Indian Contract Act 1872) & templates
├── sample-data/                # Curated WhatsApp chat exports with price disputes & expected outputs
├── docs/                       # Architecture, API contracts, DB design, security, setup, and demo plan
├── infra/
│   ├── supabase/migrations/    # Complete versioned PostgreSQL schema with RLS policies
│   └── docker/                 # Container definitions & docker-compose.yml
└── .github/                    # CI workflow, PR template & issue templates
```

---

## ⚡ Quick Start (No Paid Keys Required)

You can clone, install, test, and run both applications **without requiring real OpenAI or Supabase keys** to run all tests, parse conversations, detect Section 7 conflicts, generate agreements, and test two-party confirmations.

### 1. Clone
```bash
git clone https://github.com/kiranshetty1315/dealshield.git
cd dealshield
```

### 2. Start Backend (Terminal 1)
```bash
cd apps/api
python3 -m venv .venv

# On Linux / macOS:
source .venv/bin/activate

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env            # Or 'Copy-Item .env.example .env' on Windows PowerShell
python -m pytest tests/ -v      # Run tests (34 passed, 100%)
uvicorn app.main:app --reload --port 8000
```
- API Health Status: [http://localhost:8000/health](http://localhost:8000/health)
- Swagger OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start Frontend (Terminal 2)
```bash
# From repository root or apps/web:
npm install
npm run build                   # Compiles all 10 static routes with zero errors
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## 🔄 End-to-End User Flow

```
[1. Upload Chat] ───► [2. AI Extraction & Section 7 Conflict Resolution] ───► [3. Synthesize Agreement] ───► [4. Two-Party Confirmation] ───► [5. Section 65B Evidence Vault]
```

1. **Upload Chat (`/upload`):** Upload an exported WhatsApp `.txt` file or paste raw negotiation messages. Normalized messages are assigned stable message citation IDs.
2. **Analysis & Section 7 Resolution (`/analysis`):** Inspect extracted business terms (scope, pricing, payment terms, timeline). Interactive conflict resolution drawer flags qualified acceptances and price disagreements under Section 7 of the Indian Contract Act, 1872 with verbatim citations.
3. **Synthesize Agreement (`/agreements`):** Plain-language synthesis generates clear commercial clauses with statutory legal notices (stamp duty disclosure, Copyright Act IP assignment).
4. **Two-Party Confirmation (`/confirmations`):** Mutual independent sign-off transitions agreement state from `draft` → `partially_confirmed` → `fully_confirmed`. Includes testable single-use signed link tokens.
5. **Evidence Vault (`/evidence`):** Query live append-only audit trail logs from Supabase and verify document integrity hashes with SHA-256 fingerprinting.

---

## 🔒 Security & Evidentiary Limitations

- **Service-Role Isolation:** The Supabase `service_role` key and `OPENAI_API_KEY` are backend-only credentials. Browser code only accesses public anon keys under strict PostgreSQL Row Level Security.
- **SHA-256 vs Statutory eSign:** A cryptographic hash mathematically proves file consistency since the digest was recorded (admissible as corroborative evidence under Section 65B of the Indian Evidence Act / Section 63 BSA 2023). It does **not** substitute for a digital signature certificate issued by a Certifying Authority (CCA) under Section 3/3A of the Information Technology Act 2000.
- **Indian Stamp Act, 1899 Compliance:** Generated agreements are plain-language term sheets and summaries. Full judicial admissibility in civil court requires assessment and payment of applicable state stamp duty.
- **Privacy & Data Minimization:** DPDP Act 2023 compliance enforced through secret-salted IP hashing and data minimization. Real personal chats must never be committed; tests use synthetic fixtures in `sample-data/whatsapp/`.

---

## 📚 Documentation Index

- [Complete Project Working & Architecture Guide](docs/how-it-works.md) (or [HOW-IT-WORKS.md](HOW-IT-WORKS.md))
- [Architecture & System Flow](docs/architecture.md)
- [API Contracts & Payload Examples](docs/api-contracts.md)
- [Database Schema & Entity Diagrams](docs/database-design.md)
- [Security, Privacy & RLS Policies](docs/security.md)
- [Local Setup & Development Guide](docs/setup.md)
- [Git Branching Strategy](docs/branching-strategy.md)
- [Hackathon Demo Plan (LS-06)](docs/demo-plan.md)

---

## 📄 License

DealShield AI is developed for the LegalTech Hackathon Problem Statement LS-06. Distributed under the MIT License.
