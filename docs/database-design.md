# DealShield AI — Database Design & Schema Architecture

## 1. Relational Entity Overview

The DealShield AI persistence layer is implemented on **PostgreSQL 15+** via Supabase, protected by Row Level Security (RLS) policies.

The core migration is located in [`infra/supabase/migrations/001_initial_schema.sql`](file:///C:/dealshield/infra/supabase/migrations/001_initial_schema.sql).

```mermaid
erDiagram
    users ||--o{ conversations : "owns"
    conversations ||--o{ messages : "contains"
    conversations ||--o{ analyses : "generates"
    analyses ||--o{ agreements : "originates"
    agreements ||--o{ agreement_versions : "has"
    agreement_versions ||--o{ confirmations : "receives"
    users ||--o{ audit_events : "triggers"
    agreements ||--o{ document_hashes : "secures"

    users {
        uuid id PK
        text email UK
        text full_name
        timestamptz created_at
        timestamptz updated_at
    }

    conversations {
        uuid id PK
        uuid user_id FK
        text filename
        text raw_content_path
        text[] party_names
        int message_count
        timestamptz uploaded_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        text message_id UK
        text sender
        text content
        timestamptz timestamp
        text raw_line
        int sequence_number
    }

    analyses {
        uuid id PK
        uuid conversation_id FK
        jsonb extracted_terms
        jsonb conflicts
        jsonb missing_terms
        jsonb parties
        double_precision confidence_score
        boolean requires_human_review
        timestamptz analyzed_at
    }

    agreements {
        uuid id PK
        uuid analysis_id FK
        text[] parties
        int current_version
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    agreement_versions {
        uuid id PK
        uuid agreement_id FK
        int version_number
        jsonb clauses
        text status
        timestamptz generated_at
    }

    confirmations {
        uuid id PK
        uuid agreement_id FK
        uuid version_id FK
        text party_name
        boolean confirmed
        text notes
        text ip_hash
        timestamptz confirmed_at
    }

    audit_events {
        uuid id PK
        text entity_type
        uuid entity_id
        text action
        uuid actor_id FK
        jsonb metadata
        timestamptz created_at
    }

    document_hashes {
        uuid id PK
        uuid document_id
        text document_type
        text hash_algorithm
        text hash_value
        timestamptz created_at
    }
```

---

## 2. Table Specifications & Foreign Keys

### `users`
Extends Supabase `auth.users` with profile metadata.
- **PK:** `id` UUID references `auth.users(id)` ON DELETE CASCADE.
- **Fields:** `email` (UNIQUE), `full_name`, `created_at`, `updated_at`.
- **Auto-Provisioning:** Trigger `on_auth_user_created` on `auth.users` automatically inserts a corresponding row in `public.users` upon signup so initial uploads never fail foreign key checks.

### `conversations`
Represents an ingested WhatsApp chat file.
- **PK:** `id` UUID (`uuid_generate_v4()`).
- **FK:** `user_id` references `public.users(id)` ON DELETE CASCADE.
- **Fields:** `filename`, `raw_content_path` (Supabase Storage reference), `party_names` (`TEXT[]`), `message_count`, `uploaded_at`.

### `messages`
Individual parsed chat lines with deterministic citation IDs.
- **PK:** `id` UUID.
- **FK:** `conversation_id` references `public.conversations(id)` ON DELETE CASCADE.
- **Fields:** `message_id` (deterministic stable ID, e.g. `msg_raj_001`), `sender`, `content`, `timestamp`, `raw_line`, `sequence_number`.
- **Constraint:** `UNIQUE (conversation_id, message_id)` (scoped per conversation to avoid cross-chat collisions).

### `analyses`
Structured output from LLM analysis.
- **PK:** `id` UUID.
- **FK:** `conversation_id` references `public.conversations(id)` ON DELETE CASCADE.
- **Fields:** `extracted_terms` (`JSONB`), `conflicts` (`JSONB`), `missing_terms` (`JSONB`), `parties` (`JSONB`), `confidence_score` (`FLOAT`), `requires_human_review` (`BOOLEAN`).

### `agreements`
Contract parent container.
- **PK:** `id` UUID.
- **FK:** `analysis_id` references `public.analyses(id)` ON DELETE CASCADE.
- **Fields:** `parties` (`TEXT[]`), `current_version` (INT), `status` (`draft`, `pending_confirmation`, `partially_confirmed`, `fully_confirmed`, `superseded`).

### `agreement_versions`
Immutable snapshot of contract clauses for each revision.
- **PK:** `id` UUID.
- **FK:** `agreement_id` references `public.agreements(id)` ON DELETE CASCADE.
- **Constraint:** `UNIQUE (agreement_id, version_number)`.
- **Fields:** `clauses` (`JSONB`), `content_hash` (TEXT, SHA-256 digest), `status`, `generated_at`.

### `confirmations`
Records party sign-off, objection notes, and token-based external access.
- **PK:** `id` UUID.
- **FK:** `agreement_id` references `public.agreements(id)` ON DELETE CASCADE.
- **FK:** `version_id` references `public.agreement_versions(id)` ON DELETE CASCADE.
- **Constraint:** `UNIQUE (agreement_id, version_id, party_name)` (prevents duplicate entries per party per version).
- **Fields:** `party_name`, `party_email`, `confirmed` (BOOLEAN), `notes`, `confirmation_token_hash` (TEXT UNIQUE, SHA-256 hash of secret link token), `token_expires_at` (TIMESTAMPTZ), `ip_hash` (anonymized IP for DPDP Act 2023), `confirmed_at`.
- **Security & Single-Use:** Input tokens are matched via `digest(p_token, 'sha256')`. Single-use is strictly enforced by checking `confirmed_at IS NULL`. Each confirmation automatically appends an immutable record to `audit_events`.
- **RPC Lockdown:** `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` ensures calls route exclusively via backend FastAPI using `service_role`.

### `audit_events`
Append-only tamper-evident event log.
- **PK:** `id` UUID.
- **FK:** `actor_id` references `public.users(id)` ON DELETE SET NULL.
- **Fields:** `entity_type`, `entity_id`, `action`, `metadata` (`JSONB`), `created_at`.
- **Integrity Rule:** `INSERT` is restricted to service role only. Immutability enforced via trigger `enforce_audit_append_only` (blocks UPDATE/DELETE with an explicit exception allowing `actor_id ON DELETE SET NULL` for DPDP Act 2023 user erasure compliance).

### `document_hashes`
Cryptographic SHA-256 fingerprints.
- **PK:** `id` UUID.
- **Fields:** `document_id`, `document_type`, `hash_algorithm` (`sha256`), `hash_value` (64-char hex), `created_at`.
- **RLS Scope:** Scoped strictly to the entity owner.

---

## 3. Database Triggers & Performance Indexes

### Auto-updating Timestamps
Tables with `updated_at` (`users`, `agreements`) trigger `public.update_updated_at()` before every update operation.

### Performance Indexes
- `idx_conversations_user_id` on `conversations(user_id)`
- `idx_messages_conversation_id` on `messages(conversation_id)`
- `idx_messages_message_id` on `messages(message_id)`
- `idx_analyses_conversation_id` on `analyses(conversation_id)`
- `idx_agreements_analysis_id` on `agreements(analysis_id)`
- `idx_agreement_versions_agreement_id` on `agreement_versions(agreement_id)`
- `idx_confirmations_agreement_id` on `confirmations(agreement_id)`
- `idx_audit_events_entity` on `audit_events(entity_type, entity_id)`
- `idx_document_hashes_document` on `document_hashes(document_id, document_type)`
