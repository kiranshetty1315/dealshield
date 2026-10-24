# DealShield AI — Architecture & System Design

## 1. Executive Summary & Problem Context

**DealShield AI** addresses the hackathon problem statement **LS-06: From Handshake to Contract**. In emerging markets like India, millions of micro, small, and medium enterprises (MSMEs), freelancers, and independent contractors conduct high-stakes commercial negotiations entirely through informal messaging channels—most prominently **WhatsApp**.

These negotiations suffer from:
- Ambiguous acceptances ("sounds good", "let me think about it", "let's do it")
- Unclear scope, hidden ad-spend expectations, and undefined milestones
- Missing critical legal protections (intellectual property vesting, termination notice, dispute jurisdiction)
- Disagreements after work begins without verifiable evidence of what was actually agreed upon

DealShield AI bridges this gap by ingesting raw WhatsApp chat exports, parsing messages with stable deterministic IDs, extracting commercial terms, flagging conflicts and missing terms, compiling a plain-language bilingual-ready agreement, collecting mutual two-party confirmations, and recording cryptographic integrity fingerprints.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                CLIENT LAYER                                       |
|                                                                                   |
|   Next.js 14/15 App Router (TypeScript + Tailwind CSS + shadcn/ui components)     |
|   +-------------------+  +-------------------+  +-------------------------------+ |
|   | /upload           |  | /analysis         |  | /agreements & /confirmations  | |
|   | (.txt chat parser)|  | (term & conflict) |  | (plain-language + verify)     | |
|   +-------------------+  +-------------------+  +-------------------------------+ |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / JSON
                                           v
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND                                     |
|                                                                                   |
|  +------------------------------------------------------------------------------+ |
|  | Routers: /health, /chats, /analysis, /agreements, /confirmations, /evidence   | |
|  +------------------------------------------------------------------------------+ |
|        |                  |                    |                     |            |
|        v                  v                    v                     v            |
|  +--------------+  +---------------+  +------------------+  +-------------------+ |
|  | Chat Parser  |  | AI Extractor  |  | Legal Retriever  |  | Agreement & Hash  | |
|  | (Deterministic| | (Gemini 3.8   |  | (Indian Contract |  | (WeasyPrint PDF,  | |
|  |  message IDs)|  |  Structured)  |  |  Act & Templates)|  |  SHA-256 Digest)  | |
|  +--------------+  +---------------+  +------------------+  +-------------------+ |
+------------------------------------------+----------------------------------------+
                                           | Service Role / Authenticated Client
                                           v
+-----------------------------------------------------------------------------------+
|                        PERSISTENCE & STORAGE (SUPABASE)                           |
|                                                                                   |
|  - PostgreSQL 15+ (RLS Protected)                                                 |
|    `conversations`, `messages`, `analyses`, `agreements`, `confirmations`,        |
|    `audit_events`, `document_hashes`                                              |
|  - Supabase Storage: Private buckets for raw chats and generated PDF agreements   |
|  - Supabase Auth: JWT-based user authentication                                   |
+-----------------------------------------------------------------------------------+
```

---

## 3. End-to-End Data Flow

1. **Ingestion & Sanitization:**
   - User uploads WhatsApp `.txt` export file (capped at 10 MB) or pastes chat transcript.
   - FastAPI parses lines, disambiguates DD/MM vs MM/DD formats, validates timestamps without fallback to `now()`, and generates clean deterministic citation IDs (`msg_raj_001`, `msg_priya_002`).
   - Stored in Supabase private bucket and database `messages` table.

2. **Structured Legal Extraction & Section 7 Conflict Analysis (Team C):**
   - Normalized messages are passed to Google Gemini 3.8 Flash using Pydantic structured schemas.
   - Extracts: Parties, Deliverables, Proposed Pricing, Accepted Pricing, Deadlines, Payment Terms.
   - **Section 7 ICA Analysis:** Explicitly flags conditional statements ("that works I think", "depends on timeline") as qualified acceptances under Section 7 of the Indian Contract Act, 1872.
   - Detects missing provisions: Intellectual property copyright transfer, termination notice, and dispute jurisdiction.

3. **Human Review & Conflict Resolution (Team A & C):**
   - UI presents the extracted terms side-by-side with exact citation chips linking to source chat messages.
   - Contradictions are highlighted with severity tags and proposed compromise language.

4. **Agreement Synthesis & Versioning (Team D):**
   - Once terms are confirmed or resolved, a plain-language agreement is drafted based on curated Indian Contract Act templates.
   - Highlights that this is a plain-language term sheet, not an executed or stamp-duty-paid legal deed under the Indian Stamp Act, 1899.
   - Each revision increments the `version_number` and computes `content_hash` under the parent `agreement_id`.

5. **Token-Based Two-Party Confirmation (Team D):**
   - Negotiating counterparty receives a secure, signed single-use token confirmation link.
   - Counterparty reviews clauses and records acceptance or attaches objection notes without needing a prior platform account.

6. **Tamper-Evident Evidence Vault & DPDP Act 2023 Compliance:**
   - Document SHA-256 fingerprint is recorded in `document_hashes`.
   - Immutable append-only audit log records actor, salted IP hash (`hash_ip()` via `IP_HASH_SALT`), and timestamp for Section 65B Indian Evidence Act / BSA 2023 admissibility and DPDP Act 2023 data minimization.
