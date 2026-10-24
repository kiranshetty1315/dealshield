# DealShield AI — Team Workstreams & Collaboration Guide

To enable parallel execution during the hackathon and post-hackathon sprints, engineering responsibilities are divided into four independent workstreams.

---

## 1. Team Allocation Matrix

```
+------------------------------------+---------------------------------------+
| WORKSTREAM                         | PRIMARY DIRECTORIES                   |
+------------------------------------+---------------------------------------+
| TEAM A: Frontend & UX              | apps/web/src/app/, components/, lib/  |
| TEAM B: Backend & Chat Ingestion   | apps/api/app/services/chat_parser.py, |
|                                    | apps/api/app/api/routes/chats.py      |
| TEAM C: AI & Legal Intelligence    | apps/api/app/services/ai_extractor.py,|
|                                    | conflict_detector.py, legal-knowledge/|
| TEAM D: Agreements, DB & Security  | infra/supabase/, apps/api/app/db/,    |
|                                    | agreements.py, hash_service.py        |
+------------------------------------+---------------------------------------+
```

### Note on Smaller Teams:
- **2-Person Team:**
  - **Engineer 1 (Full-Stack Product):** Combines **Team A** (Frontend) + **Team B** (Backend & Chat Processing).
  - **Engineer 2 (AI, Legal & Platform):** Combines **Team C** (AI & Legal Intelligence) + **Team D** (Agreements, DB & Security).
- **3-Person Team:**
  - Person 1: Team A (Frontend & UX).
  - Person 2: Team B & D (Backend, Supabase & PDF Generation).
  - Person 3: Team C (OpenAI Extraction, Legal Retrieval & Prompt Engineering).

---

## 2. Workstream Breakdown

### TEAM A — Frontend & UX
- **Owner Role:** Senior Frontend Engineer / UX Designer
- **Assigned Directories:** `apps/web/src/` (`app/`, `components/`, `hooks/`, `lib/`)
- **Key Tasks:**
  1. Build interactive chat review interface with message bubble selection.
  2. Implement conflict resolution drawer allowing users to pick compromise terms.
  3. Create responsive side-by-side agreement diff viewer.
  4. Build two-party confirmation landing view with mobile-responsive sign-off buttons.
- **Dependencies:** Consumes backend schemas (`packages/contracts/schemas/` and `/openapi.json`).
- **Deliverables:** Polished Next.js UI pages with real-time API integrations and loading states.
- **Acceptance Criteria:**
  - All screens render without console errors or hydration mismatches.
  - Form validation blocks submission on invalid files.
  - Citation chip clicks highlight corresponding original chat messages.
- **Suggested Branch Names:**
  - `feature/frontend-dashboard`
  - `feature/conflict-resolution-ui`
  - `feature/two-party-confirmation-view`
- **Suggested GitHub Issues:**
  - `#101: Implement interactive chat message citation highlight viewer`
  - `#102: Build two-party mobile confirmation landing screen`

---

### TEAM B — Backend & Chat Processing
- **Owner Role:** Backend Engineer / API Specialist
- **Assigned Directories:** `apps/api/app/api/routes/chats.py`, `apps/api/app/services/chat_parser.py`, `apps/api/tests/`
- **Key Tasks:**
  1. Extend WhatsApp parser to handle additional regional date/time formats and edge cases.
  2. Implement sanitization for phone numbers and private user handles.
  3. Add support for multi-party group chat exports (3+ participants).
  4. Implement storage upload of raw chat transcripts to Supabase Storage with signed URL retrieval.
- **Dependencies:** Works closely with Team D for database persistence of messages.
- **Deliverables:** High-throughput chat ingestion pipeline with deterministic message IDs.
- **Acceptance Criteria:**
  - 100% of sample negotiation fixtures parsed with zero message drops.
  - Multi-line messages correctly concatenated.
  - Unit test suite covers malformed and empty files.
- **Suggested Branch Names:**
  - `feature/chat-parser-edge-cases`
  - `feature/chat-storage-integration`
- **Suggested GitHub Issues:**
  - `#103: Support iOS and Android 12-hour/24-hour WhatsApp export variations`
  - `#104: Integrate chat file persistence with Supabase Storage bucket`

---

### TEAM C — AI & Legal Intelligence
- **Owner Role:** AI Engineer / LegalTech Specialist
- **Assigned Directories:** `apps/api/app/services/ai_extractor.py`, `conflict_detector.py`, `legal_retriever.py`, `legal-knowledge/`
- **Key Tasks:**
  1. Implement OpenAI structured output extraction with Pydantic schema validation.
  2. Build conflict detection logic for price counter-proposals and ambiguous acceptances.
  3. Curate Indian Contract Act 1872 statutory rule retrieval (Sections 2, 7, 10, 73).
  4. Benchmark extraction accuracy against `sample-data/expected-results/`.
- **Dependencies:** Consumes normalized messages from Team B; supplies terms to Team D.
- **Deliverables:** Production OpenAI extraction pipeline and evaluated benchmark suite.
- **Acceptance Criteria:**
  - Extraction conforms to `agreement-analysis.schema.json`.
  - Accurately detects price mismatch (e.g. ₹75,000 vs ₹1,50,000 vs ₹1,00,000 in sample 1).
  - Flags missing IP assignment and dispute resolution clauses.
- **Suggested Branch Names:**
  - `feature/ai-extractor`
  - `feature/conflict-detection`
  - `feature/legal-knowledge-retriever`
- **Suggested GitHub Issues:**
  - `#105: Implement OpenAI structured output extraction with Pydantic`
  - `#106: Add Indian Contract Act rule validator for commercial service contracts`

---

### TEAM D — Agreements, Database & Security
- **Owner Role:** Full-Stack Architect / DevOps & Security Engineer
- **Assigned Directories:** `infra/supabase/`, `apps/api/app/db/`, `agreements.py`, `confirmations.py`, `evidence.py`, `hash_service.py`
- **Key Tasks:**
  1. Configure Supabase PostgreSQL connection pooler and run versioned migrations.
  2. Implement agreement versioning lifecycle (`v1.0`, `v1.1`, `v2.0`).
  3. Build WeasyPrint HTML-to-PDF compilation with tamper-evident SHA-256 header.
  4. Implement append-only `audit_events` and HMAC IP anonymization.
- **Dependencies:** Supplies database client and models to Teams B & C.
- **Deliverables:** End-to-end agreement persistence, PDF export, and cryptographic audit records.
- **Acceptance Criteria:**
  - Database migrations execute idempotently.
  - PDF agreements render with proper typography and verified SHA-256 stamp.
  - Audit logs are append-only; tampering is detected by verification tests.
- **Suggested Branch Names:**
  - `feature/supabase-integration`
  - `feature/weasyprint-pdf-generator`
  - `feature/evidence-vault-audit`
- **Suggested GitHub Issues:**
  - `#107: Configure Supabase database pooler and repository migrations`
  - `#108: Implement WeasyPrint PDF generator with SHA-256 audit stamp`
