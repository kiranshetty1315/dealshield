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
|  | (Deterministic| | (OpenAI       |  | (Indian Contract |  | (WeasyPrint PDF,  | |
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
   - User uploads WhatsApp `.txt` export file or pastes chat transcript.
   - FastAPI parses lines, identifies timestamps and senders, and generates deterministic IDs (`msg_raj_001_abc123`).
   - Stored in Supabase private bucket and database `messages` table.

2. **Structured Legal Extraction (Team C):**
   - Normalized messages are passed to OpenAI using Pydantic structured schemas.
   - Extracts: Parties, Deliverables, Proposed Pricing, Accepted Pricing, Deadlines, Payment Terms.
   - Detects: Price contradictions, ambiguous acceptances, and missing legal provisions (IP, termination).

3. **Human Review & Conflict Resolution (Team A & C):**
   - UI presents the extracted terms side-by-side with exact citation chips linking to source chat messages.
   - Contradictions are highlighted with severity tags and proposed compromise language.

4. **Agreement Synthesis & Versioning (Team D):**
   - Once terms are confirmed or resolved, a plain-language agreement is drafted based on curated Indian Contract Act templates.
   - Each revision increments the `version_number` under the parent `agreement_id`.

5. **Two-Party Confirmation (Team D):**
   - Each negotiating party receives a confirmation link.
   - Parties review clauses and record acceptance or attach objection notes.

6. **Tamper-Evident Evidence Vault:**
   - Document SHA-256 fingerprint is recorded in `document_hashes`.
   - Immutable audit log records actor, IP hash, and timestamp.
