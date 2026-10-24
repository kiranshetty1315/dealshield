# DealShield AI — Working of the Project & Architecture Guide

For the full detailed documentation with Mermaid diagrams, statutory frameworks, and API mappings, see **[`docs/how-it-works.md`](docs/how-it-works.md)**.

---

## ⚡ Quick Summary of How DealShield AI Works

DealShield AI converts informal WhatsApp commercial negotiations into structured, verifiable agreements across 5 sequential stages:

```
[1. Upload Chat] ───► [2. AI Extraction & Section 7 Conflict Resolution] ───► [3. Synthesize Agreement] ───► [4. Two-Party Confirmation] ───► [5. Section 65B Evidence Vault]
```

### 1. Upload & Ingestion (`/upload`)
* Parses exported WhatsApp `.txt` transcripts.
* Resolves timestamp ambiguity using Indian `DD/MM/YYYY` standards.
* Assigns **verbatim citation IDs** (`msg_raj_001`, `msg_priya_004`) to every line for downstream legal citation.

### 2. AI Extraction & Section 7 Conflict Resolution (`/analysis`)
* **AI Extraction:** Uses OpenAI `gpt-4o-mini` with Pydantic structured output validation ([`AgreementAnalysis`](apps/api/app/schemas/analysis.py)) to extract terms: scope, pricing, payment terms, and timeline.
* **Section 7 Conflict Detector:** Enforces Section 7 of the Indian Contract Act, 1872 (*"Acceptance must be absolute and unqualified"*). Flags hedged statements (e.g. *"Sure, that works I think"*, *"depends on timeline"*) and price disputes.
* **Legal Knowledge Retriever:** Flags missing statutory protections under the **Copyright Act, 1957** (IP assignment upon full payment) and **Section 73 ICA 1872** (cancellation remedies & 7-day termination notice).
* **Interactive Drawer:** Parties can select compromise terms to turn ambiguous proposals into unconditional agreements.

### 3. Plain-Language Agreement Synthesis (`/agreements`)
* Synthesizes 4 formal, plain-language legal clauses aligned with Indian commercial law.
* Links every clause back to the original conversation with clickable citation chips.
* Computes an immutable **SHA-256 cryptographic digest** of the contract text.
* Displays statutory legal notice regarding stamp duty under the **Indian Stamp Act, 1899**.

### 4. Two-Party Mutual Confirmation (`/confirmations`)
* Requires mutual assent before activation:
  * **Party 1 (Initiator):** Assents via authenticated dashboard.
  * **Party 2 (Counterparty):** Assents via email-OTP verified review link (/review?token=...) without needing a platform account.
* Email-OTP verification ensures draft terms are disclosed only to the verified counterparty.
* Database state transitions: `draft` → `partially_confirmed` → `fully_confirmed`.
* Anonymizes IP addresses using secret-salted HMAC for **DPDP Act 2023** compliance.

### 5. Section 65B Evidence Vault (`/evidence`)
* Maintains an immutable, append-only audit trail (`audit_events` table).
* Allows any party or court to verify document integrity using SHA-256 hashing.
* Provides mathematical proof of non-tampering admissible under **Section 65B of the Indian Evidence Act, 1872 / Section 63 of the Bharatiya Sakshya Adhiniyam, 2023**.

---

## 📖 Complete Documentation Links

* [Complete System Workflow Guide](docs/how-it-works.md)
* [System Architecture](docs/architecture.md)
* [API Contracts & Payload Examples](docs/api-contracts.md)
* [Database Design & Schema](docs/database-design.md)
* [Security & DPDP Compliance](docs/security.md)
* [Hackathon Demonstration Plan](docs/demo-plan.md)
