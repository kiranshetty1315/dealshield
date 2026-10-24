# DealShield AI — Hackathon Demonstration Roadmap (Problem LS-06)

This document provides the presentation script and live demonstration plan for DealShield AI during hackathon judging and team reviews.

---

## 1. Hackathon Narrative & Pitch (2 Minutes)

- **The Problem:** In India, over 60 million MSMEs and freelancers conduct high-value deals over WhatsApp. Agreements are struck via informal messages like &ldquo;sure, works for me&rdquo; without formal scope definitions, payment milestone protections, or IP assignment clauses. When payment disputes arise, informal messages are difficult to enforce or interpret.
- **The Solution:** DealShield AI converts informal chat exports into structured, verified contracts. It parses conversations, extracts agreed terms, catches contradictions and ambiguous acceptances, generates plain-language contracts, enables mutual two-party sign-off, and timestamps SHA-256 integrity proofs.

---

## 2. Live Demo Walkthrough (3 Minutes)

### Step 1: Live Ingestion & Deterministic Citation
- **Screen:** Home / `/upload`
- **Action:** Click **"Load Sample Negotiation (Raj vs Priya)"** and submit.
- **Talking Point:** &ldquo;Notice how DealShield parses 10 distinct messages, extracts participants Raj Mehta and Priya Sharma, and assigns deterministic, stable citation IDs (`msg_raj_...`) so every single contract term can be cited verbatim back to the conversation.&rdquo;

### Step 2: AI Terms Extraction & Conflict Resolution
- **Screen:** `/analysis`
- **Action:** Showcase detected contradictions.
- **Talking Point:** &ldquo;Here, our AI detected a critical contradiction: Raj offered ₹75,000, Priya demanded ₹1,50,000, and they compromised at ₹1,00,000 with 50% upfront. However, Raj&apos;s acceptance &lsquo;I think that works&rsquo; is ambiguous. DealShield flags this with a High Severity warning and provides a concrete compromise recommendation.&rdquo;

### Step 3: Plain-Language Agreement Synthesis
- **Screen:** `/agreements`
- **Action:** Review the synthesized 4-clause agreement.
- **Talking Point:** &ldquo;DealShield synthesizes plain-language legal clauses aligned with the Indian Contract Act 1872: Scope of Work, Consideration & 50% Milestone, Timeline (April 30), and an essential Intellectual Property transfer clause that was missing from the chat.&rdquo;

### Step 4: Two-Party Confirmation Workflow
- **Screen:** `/confirmations`
- **Action:** Show the dual-party status cards.
- **Talking Point:** &ldquo;A contract requires mutual assent. DealShield sends independent confirmation links to each party. Here, Raj has confirmed, while Priya&apos;s sign-off is pending.&rdquo;

### Step 5: Evidence Vault & Cryptographic Tamper-Proofing
- **Screen:** `/evidence`
- **Action:** Run the live SHA-256 hash verifier.
- **Talking Point:** &ldquo;DealShield calculates a 256-bit cryptographic digest. If any party modifies a single character of the agreement after mutual sign-off, the hash verification immediately alerts users. We pair this with an append-only audit trail for corroborative Section 65B evidence.&rdquo;

---

## 3. Current Live Functionality Status

| Capability | Current Status | Architecture / Implementation Notes |
|---|---|---|
| **WhatsApp Chat Parser** | Live (Deterministic IDs) | Normalizes messages with verbatim IDs (`msg_raj_...`) and resolves date ambiguity |
| **API Health & Diagnostic Status** | Live & Polled | Multi-service health monitoring across database, AI, and parser |
| **SHA-256 Hash Verification** | Live & Functional | Cryptographic digest computation & Section 65B tamper verification |
| **UI Components & Responsive Layout** | Live (Tailwind + shadcn) | Interactive conflict resolution drawer, citation viewer, and agreement preview |
| **Gemini 3.8 Flash Extraction** | Live & Functional | Gemini 3.8 Flash structured outputs with deterministic fallback (34/34 tests passing) |
| **Section 7 Conflict Detector** | Live & Functional | Flags ambiguous acceptance hedges and price counter-proposals with citations |
| **Two-Party Confirmation Auth** | Live & Functional | Dashboard sign-off + single-use signed token links with DPDP-compliant IP hashing |
| **Plain-Language Agreement Generation** | Live & Functional | Transforms chat terms into 4 formal legal clauses with SHA-256 hash |
| **Append-Only Evidence Audit Vault** | Live & Functional | Supabase-backed immutable audit trail for Section 65B Indian Evidence Act admissibility |
