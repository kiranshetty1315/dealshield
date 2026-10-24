-- DealShield AI — Initial Database Migration
-- Migration: 001_initial_schema
-- Created: 2024-03-15 (Updated with security, token confirmation, and append-only audits)
-- Description: Create core tables for conversations, analysis, agreements, and audit

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations (uploaded chat files)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    raw_content_path TEXT,  -- Path in Supabase Storage
    party_names TEXT[] NOT NULL DEFAULT '{}',
    message_count INTEGER NOT NULL DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual messages parsed from conversations
-- NOTE: message_id is scoped per conversation_id to avoid cross-chat collision
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,  -- Standard citation ID (e.g. msg_raj_001)
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_line TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, message_id)
);

-- Analysis results
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    extracted_terms JSONB NOT NULL DEFAULT '[]',
    conflicts JSONB NOT NULL DEFAULT '[]',
    missing_terms JSONB NOT NULL DEFAULT '[]',
    parties JSONB NOT NULL DEFAULT '[]',
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    requires_human_review BOOLEAN NOT NULL DEFAULT TRUE,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agreements generated from analyses
CREATE TABLE IF NOT EXISTS public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    parties TEXT[] NOT NULL DEFAULT '{}',
    current_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_confirmation', 'partially_confirmed', 'fully_confirmed', 'superseded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Versioned agreement content
CREATE TABLE IF NOT EXISTS public.agreement_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    clauses JSONB NOT NULL DEFAULT '[]',
    content_hash TEXT,  -- SHA-256 fingerprint of plaintext agreement
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'confirmed', 'superseded')),
    UNIQUE (agreement_id, version_number)
);

-- Party confirmations (Supports token-based single-use link access for unauthenticated counterparties)
CREATE TABLE IF NOT EXISTS public.confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.agreement_versions(id) ON DELETE CASCADE,
    party_name TEXT NOT NULL,
    party_email TEXT,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    confirmation_token TEXT UNIQUE,  -- Cryptographic token for external counterparty access
    token_expires_at TIMESTAMPTZ,    -- Expiration timestamp for security
    confirmed_at TIMESTAMPTZ,
    ip_hash TEXT,                    -- HMAC-SHA256 anonymized IP for DPDP Act 2023 compliance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit trail (append-only, immutable)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,  -- 'conversation', 'analysis', 'agreement', etc.
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,       -- 'created', 'updated', 'confirmed', 'exported', etc.
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document hashes for integrity verification
CREATE TABLE IF NOT EXISTS public.document_hashes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    document_type TEXT NOT NULL,  -- 'agreement_pdf', 'conversation_export', etc.
    hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
    hash_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_msg_id ON public.messages(conversation_id, message_id);
CREATE INDEX IF NOT EXISTS idx_analyses_conversation_id ON public.analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agreements_analysis_id ON public.agreements(analysis_id);
CREATE INDEX IF NOT EXISTS idx_agreement_versions_agreement_id ON public.agreement_versions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_agreement_id ON public.confirmations(agreement_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_token ON public.confirmations(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_document_hashes_document ON public.document_hashes(document_id, document_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_hashes ENABLE ROW LEVEL SECURITY;

-- Users: can read and update own profile
CREATE POLICY users_select_own ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Conversations: owner has full access
CREATE POLICY conversations_select_own ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY conversations_insert_own ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY conversations_update_own ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY conversations_delete_own ON public.conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages: accessible if user owns the conversation
CREATE POLICY messages_select_own ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Analyses: accessible if user owns the source conversation
CREATE POLICY analyses_select_own ON public.analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = analyses.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Agreements: accessible via conversation ownership chain
CREATE POLICY agreements_select_own ON public.agreements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analyses
            JOIN public.conversations ON conversations.id = analyses.conversation_id
            WHERE analyses.id = agreements.analysis_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Agreement versions: accessible via agreement ownership
CREATE POLICY agreement_versions_select_own ON public.agreement_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agreements
            JOIN public.analyses ON analyses.id = agreements.analysis_id
            JOIN public.conversations ON conversations.id = analyses.conversation_id
            WHERE agreements.id = agreement_versions.agreement_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Confirmations: owner of agreement can view confirmations
CREATE POLICY confirmations_select_own ON public.confirmations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agreements
            JOIN public.analyses ON analyses.id = agreements.analysis_id
            JOIN public.conversations ON conversations.id = analyses.conversation_id
            WHERE agreements.id = confirmations.agreement_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Audit events: strictly scoped to the entity owner or actor (fixes RLS leak)
CREATE POLICY audit_events_select_own ON public.audit_events
    FOR SELECT USING (
        actor_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = audit_events.entity_id
            AND conversations.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.agreements
            JOIN public.analyses ON analyses.id = agreements.analysis_id
            JOIN public.conversations ON conversations.id = analyses.conversation_id
            WHERE agreements.id = audit_events.entity_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Document hashes: strictly scoped to owner of the hashed document (fixes RLS leak)
CREATE POLICY document_hashes_select_own ON public.document_hashes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = document_hashes.document_id
            AND conversations.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.agreements
            JOIN public.analyses ON analyses.id = agreements.analysis_id
            JOIN public.conversations ON conversations.id = analyses.conversation_id
            WHERE agreements.id = document_hashes.document_id
            AND conversations.user_id = auth.uid()
        )
    );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_agreements
    BEFORE UPDATE ON public.agreements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enforce append-only integrity on audit_events (blocks UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only. UPDATE and DELETE operations are strictly forbidden.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_append_only
    BEFORE UPDATE OR DELETE ON public.audit_events
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_modification();

-- Token-based counterparty confirmation access functions
-- Allows external party to review agreement without an existing platform account
CREATE OR REPLACE FUNCTION public.get_agreement_by_confirmation_token(p_token TEXT)
RETURNS TABLE (
    confirmation_id UUID,
    agreement_id UUID,
    version_number INTEGER,
    party_name TEXT,
    confirmed BOOLEAN,
    clauses JSONB,
    content_hash TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS confirmation_id,
        c.agreement_id,
        av.version_number,
        c.party_name,
        c.confirmed,
        av.clauses,
        av.content_hash
    FROM public.confirmations c
    JOIN public.agreement_versions av ON av.id = c.version_id
    WHERE c.confirmation_token = p_token
      AND (c.token_expires_at IS NULL OR c.token_expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.submit_confirmation_by_token(
    p_token TEXT,
    p_confirmed BOOLEAN,
    p_notes TEXT,
    p_ip_hash TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conf_id UUID;
BEGIN
    SELECT id INTO v_conf_id
    FROM public.confirmations
    WHERE confirmation_token = p_token
      AND (token_expires_at IS NULL OR token_expires_at > NOW());

    IF v_conf_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired confirmation token';
    END IF;

    UPDATE public.confirmations
    SET
        confirmed = p_confirmed,
        notes = p_notes,
        ip_hash = p_ip_hash,
        confirmed_at = NOW()
    WHERE id = v_conf_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
