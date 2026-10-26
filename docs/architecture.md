# DealShield AI — Architecture & System Design

## 1. Executive Summary & Problem Context

**DealShield AI** addresses the hackathon problem statement **LS-06: From Handshake to Contract**. In emerging markets like India, millions of micro, small, and medium enterprises (MSMEs), freelancers, and independent contractors conduct high-stakes commercial negotiations entirely through informal messaging channels—most prominently **WhatsApp**.

These negotiations suffer from:
- Ambiguous acceptances ("sounds good", "let me think about it", "let's do it")
- Unclear scope, hidden ad-spend expectations, and undefined milestones
- Missing critical legal protections (intellectual property vesting, termination notice, dispute jurisdiction)
- Disagreements after work begins without verifiable evidence of what was actually agreed upon

DealShield AI bridges this gap by ingesting raw WhatsApp chat exports, parsing messages with stable deterministic IDs, screening for bilateral commercial intent, extracting terms via AI with deterministic fallback, flagging Section 7 conflicts and missing statutory terms, compiling a plain-language agreement, collecting mutual two-party confirmations via session-gated OTP, and recording cryptographic integrity fingerprints.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                CLIENT LAYER                                       |
|                                                                                   |
|   Next.js 14 App Router (TypeScript + Tailwind CSS + shadcn/ui components)        |
|   +-------------------+  +-------------------+  +-------------------------------+ |
|   | /upload           |  | /analysis         |  | /agreements & /confirmations  | |
|   | (.txt chat parser)|  | (term & conflict) |  | (plain-language + verify)     | |
|   +-------------------+  +-------------------+  +-------------------------------+ |
|   | /review?token=... (Counterparty Email-OTP Session & Business Details KYC)   | |
|   +-----------------------------------------------------------------------------+ |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / JSON (JWT & X-Review-Session)
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
|  | Chat Parser  |  | Deal Gate &   |  | Legal Retriever  |  | Agreement & Hash  | |
|  | (Deterministic| | AI Extractor |  | (Indian Contract |  | (Plain-text &     | |
|  |  message IDs)|  | (Gemini 3.8 / |  |  Act & Templates)|  |  SHA-256 Digest)  | |
|  |              |  |  Regex Engine)|  |                  |  |                   | |
|  +--------------+  +---------------+  +------------------+  +-------------------+ |
+------------------------------------------+----------------------------------------+
                                           | Service Role / Authenticated Client
                                           v
+-----------------------------------------------------------------------------------+
|                        PERSISTENCE & STORAGE (SUPABASE)                           |
|                                                                                   |
|  - PostgreSQL 15+ (RLS Protected)                                                 |
|    `conversations`, `messages`, `analyses`, `agreements`, `agreement_versions`,   |
|    `confirmations`, `audit_events`, `document_hashes`                             |
|  - Supabase Storage: Private buckets for raw chats and agreement documents        |
|  - Supabase Auth: JWT-based user authentication                                   |
+-----------------------------------------------------------------------------------+
```

---

## 3. End-to-End Data Flow

1. **Ingestion & Sanitization (`/upload`):**
   - User uploads WhatsApp `.txt` export file (capped at 10 MB) or pastes chat transcript.
   - FastAPI parses lines, disambiguates DD/MM vs MM/DD formats, validates timestamps without fallback to `now()`, and generates clean deterministic citation IDs (`msg_raj_001`, `msg_priya_002`).
   - Stored in database `conversations` and `messages` tables.

2. **Commercial Deal Qualification Gate (`/analysis`):**
   - Pre-extraction gate requiring multi-party participation ($\ge 2$ senders), commercial scope keywords (`design`, `develop`, `campaign`, `website`, `deliver`, `project`), and bilateral price consideration before extracting clauses.
   - Rejects non-commercial announcements, prize spam, or general banter with `HTTP 422` (`is_commercial_deal: false`).

3. **Structured Legal Extraction & Section 7 Conflict Analysis (`/analysis`):**
   - Normalized messages are passed to Google Gemini 3.8 Flash using Pydantic structured schemas.
   - **Resilience:** Implements 3 retries with exponential backoff on `429` rate limits before falling back to the deterministic regex engine (`extraction_engine: "fallback"`).
   - Extracts: Parties, Scope, Consideration, Payment Milestones, Delivery Deadlines.
   - **Section 7 ICA Analysis:** Explicitly flags conditional statements ("that works I think", "depends on timeline") as qualified acceptances under Section 7 of the Indian Contract Act, 1872.
   - Detects missing statutory safeguards: Intellectual property assignment (Copyright Act 1957) and termination notice (Section 73 ICA).

4. **Human Review & Conflict Resolution (`/analysis`):**
   - UI presents the extracted terms side-by-side with exact citation chips linking to source chat messages.
   - Ambiguities are surfaced in an interactive resolution drawer for human consensus before drafting.

5. **Agreement Synthesis & Versioning (`/agreements`):**
   - Synthesizes 4 formal, plain-language legal clauses based on curated Indian Contract Act templates.
   - Computes an immutable SHA-256 fingerprint for document integrity.
   - Displays statutory Stamp Act Section 35 notice for judicial enforceability awareness.

6. **Two-Party Assent with Email-OTP Session Security (`/confirmations` & `/review`):**
   - **Party 1 (Initiator):** Assents via authenticated dashboard.
   - **Party 2 (Counterparty):** Assents via unguessable single-use review URL (`/review?token=...`).
   - Draft clauses are shielded behind an `X-Review-Session` header. Counterparty enters registered email (matched via blind-index HMAC hash) and completes 6-digit OTP verification.
   - Supports optional business KYC (encrypted GST, PAN last 4, and registered office address).

7. **Tamper-Evident Evidence Vault & DPDP Act 2023 Compliance (`/evidence`):**
   - SHA-256 content fingerprint stored in `document_hashes`.
   - Immutable append-only audit log records actor, salted IP hash (`hash_ip()` via `IP_HASH_SALT`), and timestamp for Section 65B Indian Evidence Act / Section 63 BSA 2023 admissibility and DPDP Act 2023 data minimization.

---

## 4. Target Future Architecture: DigiLocker & Aadhaar eSign

To eliminate counterparty repudiation risks and achieve full trial admissibility:

1. **DigiLocker Identity Verification (OAuth 2.0):**
   - Counterparty completes DigiLocker OAuth 2.0 consent to verify legal identity directly from official government repositories (Aadhaar XML, PAN verification, MSME UDYAM registration).
   - In compliance with the **DPDP Act 2023**, raw 12-digit Aadhaar numbers are never stored (only masked `XXXXXXXX1234`).
2. **UIDAI Aadhaar OTP / Biometric eSign (Section 3A & 5, IT Act 2000):**
   - Integration with a licensed eSign Service Provider (ESP) (e.g. CDAC, NSDL, eMudhra) operating under CCA eSign 3.0 standards.
   - Generates an ephemeral X.509 digital certificate and embeds a **PAdES-LTA** (Long Term Validation) signature and RFC 3161 timestamp directly into the contract PDF.
3. **Digital e-Stamping (NeSL / SHCIL Integration):**
   - Automated state stamp duty calculation and online certificate attachment to satisfy Section 35 of the Indian Stamp Act, 1899.
