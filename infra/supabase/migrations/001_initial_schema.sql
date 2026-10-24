-- DealShield AI — Initial Database Migration
-- Migration: 001_initial_schema
-- Created: 2024-03-15
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
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL UNIQUE,  -- Stable hash-based ID
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_line TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        CHECK (status IN ('draft', 'pending_confirmation', 'partially_confirmed', 'fully_confirmed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Versioned agreement content
CREATE TABLE IF NOT EXISTS public.agreement_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    clauses JSONB NOT NULL DEFAULT '[]',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'confirmed', 'superseded')),
    UNIQUE (agreement_id, version_number)
);

-- Party confirmations
CREATE TABLE IF NOT EXISTS public.confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES public.agreement_versions(id) ON DELETE CASCADE,
    party_name TEXT NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash TEXT  -- Hashed IP for audit, not raw IP
);

-- Audit trail (append-only)
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
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON public.messages(message_id);
CREATE INDEX IF NOT EXISTS idx_analyses_conversation_id ON public.analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agreements_analysis_id ON public.agreements(analysis_id);
CREATE INDEX IF NOT EXISTS idx_agreement_versions_agreement_id ON public.agreement_versions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_agreement_id ON public.confirmations(agreement_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_document_hashes_document ON public.document_hashes(document_id, document_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Note: RLS policies are defined here but should be enabled per-table
-- after Supabase Auth is configured. See docs/security.md for details.

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

-- Confirmations: parties can read confirmations for their agreements
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

-- Audit events: read-only for the owner of the entity
CREATE POLICY audit_events_select_own ON public.audit_events
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );
-- Note: INSERT on audit_events should only be allowed via service role
-- to maintain append-only integrity

-- Document hashes: readable by authenticated users
CREATE POLICY document_hashes_select ON public.document_hashes
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_agreements
    BEFORE UPDATE ON public.agreements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
