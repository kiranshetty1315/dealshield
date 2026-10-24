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

## 3. Current Live Functionality vs Roadmap

| Capability | Current Scaffold Status | Final Hackathon Target |
|---|---|---|
| **WhatsApp Chat Parser** | Live (Deterministic IDs) | Extended multi-format support |
| **API Health & Diagnostic Status** | Live & Polled | Multi-service health monitoring |
| **SHA-256 Hash Verification** | Live & Functional | Supabase Storage integrated |
| **UI Components & Responsive Layout** | Live (Tailwind + shadcn) | Full interactive resolution modal |
| **OpenAI Structured Extraction** | Interface defined (501) | Live GPT-4o-mini extraction |
| **Two-Party Confirmation Auth** | UI Scaffolded (501) | Supabase Auth magic link tokens |
| **PDF Generation** | Contract defined (501) | WeasyPrint HTML to PDF export |
