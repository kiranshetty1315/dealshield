# DealShield AI 🛡️

> **Hackathon Problem Statement LS-06: From Handshake to Contract**  
> *Transform informal WhatsApp business negotiations into structured, reviewable agreements with conflict detection, two-party mutual confirmation, and tamper-evident audit records.*

[![CI — DealShield AI](https://github.com/kiranshetty1315/dealshield/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranshetty1315/dealshield/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-000000.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://python.org)

---

## 📖 Overview

In emerging markets such as India, millions of MSMEs, freelancers, and independent contractors conclude high-value commercial agreements over informal chat channels—predominantly **WhatsApp**.

These negotiations suffer from:
- **Price and scope ambiguities:** "Sounds good", "I think that works", "depending on timeline".
- **Missing essential protections:** Absence of intellectual property assignment, milestone payments, or termination rights.
- **Evidentiary vulnerabilities:** Chat screenshots lack verifiable integrity proofs and can be disputed or lost.

**DealShield AI** solves this through an end-to-end LegalTech pipeline:
1. **WhatsApp Ingestion:** Normalizes exported `.txt` transcripts and assigns deterministic, stable message IDs (`msg_raj_003_...`).
2. **AI Terms & Conflict Extraction:** Parses parties, consideration, milestones, and flags price disagreements and qualified acceptances.
3. **Plain-Language Agreement Synthesis:** Generates standardized clauses adhering to Indian Contract Act 1872 principles.
4. **Two-Party Confirmation Workflow:** Facilitates independent mutual sign-off before contract activation.
5. **Tamper-Evident Evidence Vault:** Calculates SHA-256 integrity digests with append-only audit logging for corroborative Section 65B evidence.

---

## 🏗️ Repository Architecture

This monorepo is structured for parallel engineering workstreams:

```
dealshield/
├── apps/
│   ├── web/                    # Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
│   │   ├── src/
│   │   │   ├── app/            # Routes: /, /dashboard, /upload, /analysis, /agreements, /confirmations, /evidence
│   │   │   ├── components/     # UI primitives, layout, chat normalizer, analysis & agreements
│   │   │   ├── lib/            # Typed API client, Supabase auth boundary, utility helpers
│   │   │   ├── hooks/          # React hooks (useHealthCheck with auto-polling)
│   │   │   └── types/          # TypeScript contracts synced with backend Pydantic models
│   │   ├── package.json
│   │   └── .env.example
│   └── api/                    # FastAPI backend (Python 3.11+)
│       ├── app/
│       │   ├── api/routes/     # /health, /chats, /analysis, /agreements, /confirmations, /evidence
│       │   ├── core/           # Pydantic v2 settings, CORS, and security boundaries
│       │   ├── schemas/        # Canonical Pydantic schemas (single source of truth)
│       │   └── services/       # Chat parser, hash service, AI extractor, agreement generator
│       ├── tests/              # 12 unit & integration tests (100% passing)
│       ├── requirements.txt
│       └── .env.example
├── packages/
│   └── contracts/              # JSON Schema definitions & sample payloads
├── legal-knowledge/            # Curated Indian legal references (Indian Contract Act 1872) & templates
├── sample-data/                # Curated WhatsApp chat exports with price disputes & expected outputs
├── docs/                       # Architecture, API contracts, DB design, security, setup, and team tasks
├── infra/
│   ├── supabase/migrations/    # Complete versioned PostgreSQL schema with RLS policies
│   └── docker/                 # Container definitions & docker-compose.yml
└── .github/                    # CI workflow, PR template & issue templates
```

---

## ⚡ Quick Start (No Paid Keys Required)

You can clone, install, test, and run both applications **without requiring real OpenAI or Supabase keys** merely to view the scaffold, run tests, and test live parsing.

### 1. Clone
```bash
git clone https://github.com/kiranshetty1315/dealshield.git
cd dealshield
```

### 2. Start Backend (Terminal 1)
```bash
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # On Windows (or 'source .venv/bin/activate' on Unix)
pip install -r requirements.txt
Copy-Item .env.example .env     # Or 'cp .env.example .env' on Unix
python -m pytest tests/ -v      # Run tests (12 passed)
uvicorn app.main:app --reload --port 8000
```
- API Health Status: [http://localhost:8000/health](http://localhost:8000/health)
- Swagger OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start Frontend (Terminal 2)
```bash
cd apps/web
npm install
Copy-Item .env.example .env.local   # Or 'cp .env.example .env.local' on Unix
npm run lint                        # Zero lint errors
npm run build                       # Compiles all routes
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## 👥 Parallel Team Workstreams

Sprint responsibilities are documented in detail in [`docs/team-tasks.md`](file:///C:/dealshield/docs/team-tasks.md):

| Team | Focus Area | Branch Convention | Key Deliverables |
|---|---|---|---|
| **Team A** | Frontend & UX | `feature/frontend-...` | Next.js screens, message citation viewer, two-party sign-off UI |
| **Team B** | Backend & Chat Processing | `feature/chat-...` | WhatsApp ingestion, multi-line parser, storage upload |
| **Team C** | AI & Legal Intelligence | `feature/ai-...` | OpenAI structured output extraction, conflict detector, ICA 1872 validator |
| **Team D** | Agreements, DB & Security | `feature/db-...` | Supabase RLS migrations, WeasyPrint PDF compiler, SHA-256 audit log |

---

## 🔒 Security & Evidentiary Limitations

- **Service-Role Isolation:** The Supabase `service_role` key and `OPENAI_API_KEY` are backend-only credentials. Browser code only accesses public anon keys under strict PostgreSQL Row Level Security.
- **SHA-256 vs Statutory eSign:** A cryptographic hash mathematically proves file consistency since the digest was recorded (admissible as corroborative evidence under Section 65B of the Indian Evidence Act / BSA 2023). It does **not** substitute for a digital signature certificate issued by a Certifying Authority (CCA) under Section 3/3A of the Information Technology Act 2000.
- **Privacy:** Real personal chats must never be used in development. Development utilizes the fictional fixtures in `sample-data/whatsapp/`.

---

## 📚 Documentation Index

- [Architecture & System Flow](file:///C:/dealshield/docs/architecture.md)
- [API Contracts & Payload Examples](file:///C:/dealshield/docs/api-contracts.md)
- [Database Schema & Entity Diagrams](file:///C:/dealshield/docs/database-design.md)
- [Security, Privacy & RLS Policies](file:///C:/dealshield/docs/security.md)
- [Local Setup & Development Guide](file:///C:/dealshield/docs/setup.md)
- [Team Workstreams & Sprints](file:///C:/dealshield/docs/team-tasks.md)
- [Git Branching Strategy](file:///C:/dealshield/docs/branching-strategy.md)
- [Hackathon Demo Plan (LS-06)](file:///C:/dealshield/docs/demo-plan.md)

---

## 📄 License

DealShield AI is developed for the LegalTech Hackathon Problem Statement LS-06. Distributed under the MIT License.
