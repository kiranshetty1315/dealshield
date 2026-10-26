# DealShield AI — How It Works & System Workflow Guide

> **Hackathon Problem Statement LS-06: From Handshake to Contract**  
> *Transform informal WhatsApp business negotiations into structured, reviewable agreements with Section 7 conflict detection, two-party mutual confirmation, and tamper-evident audit records.*

---

## 1. Executive Summary: The Problem We Solve

In India and emerging markets, over **70% of MSMEs, freelancers, agencies, and independent contractors** conclude commercial transactions over **WhatsApp**. 

While fast and convenient, informal chat-based dealmaking creates severe legal and financial risks:

1. **The "Section 7" Legal Trap (Ambiguous Acceptance):**
   Under **Section 7 of the Indian Contract Act, 1872**, *"Acceptance must be absolute and unqualified"*. Informal statements like *"Sure, that works I think"*, *"depends on timeline"*, or *"let me think about it"* do **not** constitute legal acceptance. In litigation, Indian civil courts consistently treat conditional hedges as counter-proposals, meaning **no binding contract was ever formed**.

2. **The Default IP Trap (Copyright Act, 1957):**
   Under **Sections 17 & 19 of the Copyright Act, 1957**, the creator (freelancer/developer) is the first legal owner of copyright. Unless an explicit, written agreement irrevocably assigns intellectual property upon payment, the client **does not legally own** the software code, brand designs, or deliverables they paid for.

3. **The Evidentiary Admissibility Challenge (Section 65B):**
   Chat screenshots can be fabricated, cropped, or deleted. Under **Section 65B of the Indian Evidence Act, 1872** (now **Section 63 of the Bharatiya Sakshya Adhiniyam, 2023**), electronic evidence is inadmissible unless accompanied by mathematical proof of unbroken integrity and chain of custody.

4. **The Stamp Duty Warning (Indian Stamp Act, 1899):**
   Agreements in India require payment of applicable state stamp duty under Section 35 of the Indian Stamp Act, 1899 to be admissible in formal civil court enforcement proceedings.

**DealShield AI** bridges the gap between informal messaging and enforceable legal contracts through a multi-stage automated LegalTech pipeline.

---

## 2. High-Level System Workflow Diagram

```mermaid
flowchart TD
    subgraph Step1 ["Step 1: Upload & Citation Protocol (/upload)"]
        A["WhatsApp Export (.txt)"] --> B["chat_parser.py<br/>Regex Normalization"]
        B --> C{"Timestamp Check"}
        C -->|"DD/MM/YYYY Standard"| D["Deterministic Citation IDs<br/>msg_raj_001, msg_priya_002"]
        D --> E[("Supabase: conversations & messages")]
    end

    subgraph Step2 ["Step 2: Commercial Deal Qualification Gate (/analysis)"]
        E --> F{"Commercial Deal Gate"}
        F -->|"Non-Deal (Broadcast/Spam)"| G["Reject: HTTP 422<br/>is_commercial_deal = false"]
        F -->|"Valid Commercial Deal"| H["Proceed to Term Extraction"]
    end

    subgraph Step3 ["Step 3: Extraction & Legal Conflict Engine"]
        H --> I{"LLM Primary Engine<br/>Gemini 3.8 Flash"}
        I -->|"429 Rate Limit / Timeout"| J["Deterministic Regex Fallback Engine"]
        I -->|"Success"| K["Pydantic Structured Output<br/>AgreementAnalysis"]
        J --> K
        K --> L["conflict_detector.py<br/>Section 7 ICA Hedges & Price Gaps"]
        K --> M["legal_retriever.py<br/>Missing IP & Termination Safeguards"]
        L & M --> N["Interactive Resolution Drawer<br/>Parties Resolve Terms"]
    end

    subgraph Step4 ["Step 4: Agreement Synthesis (/agreements)"]
        N --> O["agreement_generator.py<br/>4 Plain-Language Legal Clauses"]
        O --> P["SHA-256 Content Fingerprint"]
        O --> Q["Statutory Legal Notice<br/>Stamp Act 1899 Section 35"]
        O --> R[("Supabase: agreements & versions")]
    end

    subgraph Step5 ["Step 5: Two-Party Assent (/confirmations & /review)"]
        R --> S["Party 1 (Initiator): Dashboard Assent"]
        R --> T["Party 2 (Counterparty): Single-Use Review URL<br/>/review?token=..."]
        T --> U["Email Verification (Blind-Index Hash)"]
        U --> V["6-Digit OTP Delivery & Verification"]
        V --> W["Session Token (X-Review-Session)"]
        W --> X["Review Draft & Enter Business KYC (GST/PAN)"]
        S & X --> Y{"Mutual Assent Status"}
        Y -->|"1 of 2 Confirmed"| Z1["partially_confirmed"]
        Y -->|"2 of 2 Confirmed"| Z2["fully_confirmed"]
        Z2 --> AA["Secret-Salted HMAC IP Hash<br/>(DPDP Act 2023)"]
    end

    subgraph Step6 ["Step 6: Evidence Vault & Admissibility (/evidence)"]
        AA --> AB[("audit_events Table<br/>Append-Only Ledger")]
        AB --> AC["Section 63 BSA 2023 / Section 65B IEA<br/>Court-Admissible Mathematical Integrity"]
        AB --> AD["Real-Time SHA-256 Tamper Verification"]
    end

    subgraph Step7 ["Step 7: Future Scope: Verified eSign & e-Stamp"]
        Z2 -.-> AE["DigiLocker OAuth Gateway<br/>Masked Aadhaar XML & PAN/UDYAM"]
        AE -.-> AF["Licensed ESP (CDAC/NSDL/eMudhra)<br/>UIDAI Aadhaar OTP / Biometric eSign"]
        AF -.-> AG["PAdES-LTA Digitally Signed PDF<br/>Section 3A & 5 IT Act 2000"]
    end
```

---

## 3. Step-by-Step Workflow Walkthrough (With Real Example)

Let's trace the journey using the canonical sample fixture: **Raj Mehta** (Client / Startup Founder) and **Priya Sharma** (Service Provider / UI/UX Designer).

### Step 1: Upload & Chat Normalization (`/upload`)

**User Action:**
Raj exports his WhatsApp conversation with Priya as a `.txt` file (without media) and uploads it on the `/upload` page.

**Under the Hood:**
* Handled by `POST /api/v1/chats/upload` in [`apps/api/app/api/routes/chats.py`](../apps/api/app/api/routes/chats.py).
* Scans the conversation to disambiguate date conventions, defaulting to Indian standard (`DD/MM/YYYY`).
* Normalizes multi-line messages and assigns **deterministic, stable citation IDs**:
  ```
  [msg_raj_001]   12/03/24, 10:15 - Raj Mehta: Hi Priya, regarding the website project we discussed
  [msg_priya_002] 12/03/24, 10:16 - Priya Sharma: Yes, I've been thinking about it. I can handle the full redesign
  [msg_raj_003]   12/03/24, 10:18 - Raj Mehta: Great. My budget is around ₹75,000 for everything
  [msg_priya_004] 12/03/24, 10:20 - Priya Sharma: That's quite low for a full redesign. I'd normally charge ₹1,50,000
  [msg_raj_005]   12/03/24, 10:22 - Raj Mehta: Can we meet somewhere in the middle? Maybe ₹1,00,000?
  [msg_priya_006] 12/03/24, 10:25 - Priya Sharma: I could consider that, but it depends on the timeline
  [msg_raj_007]   12/03/24, 10:27 - Raj Mehta: I need it done by end of April
  [msg_priya_008] 12/03/24, 10:30 - Priya Sharma: That's tight. For ₹1,00,000 I might be able to do it, but I'd need 50% upfront
  [msg_raj_009]   12/03/24, 10:32 - Raj Mehta: Sure, that works I think. Let's go ahead
  [msg_priya_010] 12/03/24, 10:35 - Priya Sharma: Ok sounds good. I'll send over some initial mockups next week
  ```
* Saves records in Supabase tables `conversations` and `messages`, returning a persistent `chat_id`.

---

### Step 2: AI Terms Extraction & Section 7 Conflict Resolution (`/analysis`)

**User Action:**
The user clicks **"Analyze Negotiation with DealShield AI"**. The frontend calls `POST /api/v1/analysis` and redirects to `/analysis?analysis_id=...&chat_id=...`.

**Under the Hood:**
* Executed by [`AIExtractorService`](../apps/api/app/services/ai_extractor.py), [`ConflictDetectorService`](../apps/api/app/services/conflict_detector.py), and [`LegalRetrieverService`](../apps/api/app/services/legal_retriever.py).
* Extracts structured business terms conforming to Pydantic model [`AgreementAnalysis`](../apps/api/app/schemas/analysis.py):
  1. **Scope (`term_scope_01`):** "Full website redesign with mockups" (`agreed`, cited: `msg_raj_001`, `msg_priya_002`, `msg_priya_010`).
  2. **Pricing (`term_price_01`):** Proposed ₹75,000 / ₹1,50,000, settled at ₹1,00,000 (`ambiguous`, cited: `msg_raj_003`, `msg_priya_004`, `msg_raj_005`, `msg_priya_008`, `msg_raj_009`).
  3. **Payment Terms (`term_payment_01`):** 50% upfront advance (₹50,000) (`agreed`, cited: `msg_priya_008`, `msg_raj_009`).
  4. **Timeline (`term_timeline_01`):** Delivery deadline by end of April 2024 (`agreed`, cited: `msg_raj_007`, `msg_priya_008`).

* **Section 7 Conflict Detection:**
  * Flags message `msg_raj_009`: *"Sure, that works I think. Let's go ahead"*.
  * **Statutory Context:** Section 7 of the Indian Contract Act, 1872 requires absolute and unqualified acceptance. The phrase *"that works I think"* is equivocal.
  * **Interactive Resolution Drawer:** Allows users to pick an explicit compromise resolution: *"Formally confirm consideration at ₹1,00,000 with ₹50,000 paid upon signing."* Resolving this changes the price term status from `ambiguous` to `agreed`.

* **Missing Safeguards Detection:**
  * **Intellectual Property (`missing_ip_01` - Critical):** Under Copyright Act 1957, Priya owns the copyright until assigned. Recommendation: *"Assign IP to Client upon full receipt of consideration."*
  * **Termination (`missing_termination_01` - Important):** Under Section 73 ICA, parties need cancellation rules. Recommendation: *"Add 7-day termination notice with payment for delivered work."*

* **Commercial Deal Qualification Gate:**
  * The analysis pipeline qualifies whether the transcript represents a genuine commercial negotiation before drafting:
    1. **Multi-Party Participation:** $\ge 2$ distinct participants.
    2. **Bilateral Consideration:** A currency amount followed by responsive negotiation within 3 messages.
    3. **Commercial Scope:** Work deliverable keywords (`design`, `develop`, `campaign`, `website`, `deliver`, `project`).
  * Rejects non-commercial announcements or spam with `is_commercial_deal = false` and `HTTP 422`.
* **Rate-Limit Resilience:** In case of API rate limits (`429`) or network timeouts, retries 3 times with exponential backoff before using the deterministic regex engine with transparent UI badging (`extraction_engine: "fallback"`).

---

### Step 3: Plain-Language Agreement Synthesis (`/agreements`)

**User Action:**
The user clicks **"Synthesize Agreement Draft"**. The system calls `POST /api/v1/agreements` and navigates to `/agreements?id=...`.

**Under the Hood:**
* Handled by [`AgreementGeneratorService`](../apps/api/app/services/agreement_generator.py) in [`apps/api/app/api/routes/agreements.py`](../apps/api/app/api/routes/agreements.py).
* Converts informal chat points into structured, plain-language legal clauses:
  1. **Clause 1 (Scope):** Full website redesign services, preliminary mockups, responsive frontend layout, and final handover.
  2. **Clause 2 (Consideration & Payment):** Total fixed fee of ₹1,00,000 payable in two 50% (₹50,000) installments (upfront and upon final deliverable acceptance).
  3. **Clause 3 (Timeline):** Delivery deadline of April 30, 2024, with mockups within 7 business days of advance payment.
  4. **Clause 4 (Intellectual Property & Governing Law):** Irrevocable assignment of all copyright in designs and source code to Raj upon full payment receipt; governed by Indian law.
* **Interactive Citations:** Every clause displays clickable citation tags (`[msg_priya_008]`, `[msg_raj_009]`) that highlight the original chat messages in the side-by-side view.
* **SHA-256 Content Fingerprint:** Computes a SHA-256 digest of the agreement plaintext (e.g., `a591a6d4...`).
* **Stamp Duty Notice:** Prominently warns users that judicial enforcement in civil courts requires payment of state stamp duty under the Indian Stamp Act, 1899.
* **Document Export:** Plain-text and document exports available via `GET /api/v1/agreements/{id}/pdf`.

---

### Step 4: Two-Party Mutual Confirmation Workflow (`/confirmations` & `/review`)

**User Action:**
The user proceeds to `/confirmations?agreement_id=...`.

**Under the Hood:**
* Handled by [`apps/api/app/api/routes/confirmations.py`](../apps/api/app/api/routes/confirmations.py).
* **Party 1 (Raj Mehta - Initiator):** Clicks **"Confirm Agreement as Raj Mehta"** in his authenticated dashboard.
  * Agreement status updates from `draft` → `partially_confirmed` (1 of 2 confirmed).
* **Party 2 (Priya Sharma - Counterparty Review & OTP Gate):**
  1. Initiator issues a single-use review link via `POST /api/v1/confirmations/tokens`, returning `/review?token=...`.
  2. Priya opens `/review?token=...`. The draft agreement terms are completely withheld from the browser.
  3. Priya submits her registered email (`POST .../email-check`), compared using a constant-time HMAC blind index (locks after 5 failures).
  4. Priya requests and receives a 6-digit cryptographic OTP (`POST .../otp/send` & `POST .../otp/verify`).
  5. Upon OTP verification, an ephemeral 30-minute session token is issued (`X-Review-Session`).
  6. Priya inspects the draft clauses, enters optional KYC business details (GST, PAN last 4, registered office address), and clicks **"Confirm Agreement"** (`POST .../execute`).
  7. Agreement status transitions from `partially_confirmed` → `fully_confirmed` (2 of 2 confirmed).
* **DPDP Act 2023 Compliance:** Counterparty IP addresses are hashed using a secret-salted HMAC digest (`HashService.hash_ip`) before storage in the database to satisfy data minimization rules.

---

### Step 5: Section 65B Evidence Vault (`/evidence`)

**User Action:**
Once fully confirmed, the user navigates to `/evidence?entity_id=...`.

**Under the Hood:**
* Handled by `GET /api/v1/evidence/audit-log/{entity_id}` and `POST /api/v1/evidence/verify` in [`apps/api/app/api/routes/evidence.py`](../apps/api/app/api/routes/evidence.py).
* Queries the append-only `audit_events` table in Supabase:
  ```json
  [
    { "action": "conversation_uploaded", "entity_type": "conversation", "created_at": "2024-03-12T10:35:00Z" },
    { "action": "analysis_completed", "entity_type": "analysis", "created_at": "2024-03-12T10:36:12Z" },
    { "action": "agreement_draft_generated", "entity_type": "agreement", "created_at": "2024-03-12T10:37:05Z" },
    { "action": "party_confirmation_recorded", "entity_type": "confirmation", "metadata": { "party": "Raj Mehta" } },
    { "action": "counterparty_token_confirmed", "entity_type": "confirmation", "metadata": { "party": "Priya Sharma" } }
  ]
  ```
* **Tamper Verification:** Users can input any agreement text and compare its live SHA-256 hash against the database fingerprint. If a single character was altered, verification fails immediately.
* **Legal Evidentiary Standing:** Provides mathematical integrity proof admissible under Section 65B of the Indian Evidence Act / Section 63 of Bharatiya Sakshya Adhiniyam, 2023.

---

## 4. API Endpoints & Database Entity Mapping

| Lifecycle Stage | HTTP Method & Route | Backend Service | Primary Database Table(s) |
|---|---|---|---|
| **1. Chat Ingestion** | `POST /api/v1/chats/upload` | `chat_parser.py` | `conversations`, `messages`, `document_hashes` |
| **2. Chat Retrieval** | `GET /api/v1/chats/{chat_id}` | `ConversationRepository` | `conversations`, `messages` |
| **3. Trigger Analysis** | `POST /api/v1/analysis` | `ai_extractor.py`, `conflict_detector.py` | `analyses`, `audit_events` |
| **4. Get Analysis** | `GET /api/v1/analysis/{analysis_id}` | `AnalysisRepository` | `analyses` |
| **5. Create Agreement** | `POST /api/v1/agreements` | `agreement_generator.py` | `agreements`, `agreement_versions`, `confirmations` |
| **6. Get Agreement** | `GET /api/v1/agreements/{agreement_id}` | `AgreementRepository` | `agreements`, `agreement_versions` |
| **7. Export Document** | `GET /api/v1/agreements/{id}/pdf` | `agreement_generator.py` | `agreements` (SHA-256 header) |
| **8. Direct Assent** | `POST /api/v1/confirmations` | `ConfirmationRepository` | `confirmations`, `agreements`, `audit_events` |
| **9. Issue Review Token**| `POST /api/v1/confirmations/tokens` | `ConfirmationRepository` | `confirmations`, `audit_events` |
| **10. Inspect Token** | `GET /api/v1/confirmations/token/{token}` | `ConfirmationRepository` | `confirmations` (Session gated) |
| **11. Check Email** | `POST /api/v1/confirmations/token/{token}/email-check` | `ConfirmationRepository` | `confirmations` (Blind-index hash match) |
| **12. Send OTP** | `POST /api/v1/confirmations/token/{token}/otp/send` | `email_sender.py` | `confirmations` (Rate-limited, 10m TTL) |
| **13. Verify OTP** | `POST /api/v1/confirmations/token/{token}/otp/verify` | `ConfirmationRepository` | `confirmations` (Issues `X-Review-Session`) |
| **14. Execute Assent**| `POST /api/v1/confirmations/token/{token}/execute` | `ConfirmationRepository` | `confirmations`, `agreements`, `audit_events` |
| **15. Audit Trail** | `GET /api/v1/evidence/audit-log/{id}` | `AuditRepository` | `audit_events` |
| **16. Verify Hash** | `POST /api/v1/evidence/verify` | `hash_service.py` | In-memory SHA-256 computation |

---

## 5. How to Run & Verify the Live Flow

### 1. Start Backend API
```bash
cd apps/api
source .venv/bin/activate    # Or .\.venv\Scripts\Activate.ps1 on Windows
python -m pytest tests/ -v  # Run 72 unit & integration tests
uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend Application
```bash
# In another terminal from repository root or apps/web:
npm run dev
```

### 3. Experience the Live Walkthrough
1. Open [http://localhost:3000/upload](http://localhost:3000/upload).
2. Click **"Load Sample Negotiation (Raj vs Priya)"** and click **"Parse Pasted Transcript"**.
3. Click **"Analyze Negotiation with DealShield AI"**.
4. On `/analysis`, inspect the detected Section 7 conflict on `msg_raj_009` and resolve it in the drawer.
5. Click **"Synthesize Agreement Draft"**.
6. On `/agreements`, review the 4 synthesized clauses with citation tags and the SHA-256 fingerprint.
7. Click **"Proceed to Two-Party Confirmation"**.
8. On `/confirmations`, click **"Confirm Agreement as Raj Mehta"** to record Party 1 assent.
9. Generate the Party 2 link, open `/review?token=...`, complete email-OTP verification, enter business details, and confirm.
10. Once fully confirmed, click **"Inspect Section 65B Evidence Vault"** to query the live immutable audit trail.

---

## 6. Future Scope & Statutory Roadmap

1. **DigiLocker Identity Verification:**
   * Integrate DigiLocker OAuth 2.0 to fetch authenticated Aadhaar e-KYC XML (masked to last 4 digits `XXXXXXXX1234`), PAN cards, and MSME UDYAM registration certificates directly from official government repositories.
   * Completely eliminates party impersonation and complies with the **Digital Personal Data Protection Act, 2023 (DPDP)**.
2. **UIDAI Aadhaar eSign (Section 3A & 5 of the IT Act, 2000):**
   * Partner with licensed eSign Service Providers (ESPs) such as CDAC, NSDL, or eMudhra operating under CCA eSign 3.0 standards.
   * Enables legally indisputable digital execution with ephemeral X.509 digital certificates and PAdES-LTA PDF embedding, eliminating counterparty repudiation risks.
3. **Digital e-Stamping (NeSL / SHCIL Integration):**
   * Automate state-specific stamp duty calculation and online certificate attachment to satisfy Section 35 of the Indian Stamp Act, 1899 for seamless trial admissibility in Indian courts.
