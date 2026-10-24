-- DealShield AI — Migration 002: Email-OTP Counterparty Verification
-- Adds zero-knowledge email verification, rate limiting, and session tracking to confirmations

ALTER TABLE public.confirmations
    ADD COLUMN IF NOT EXISTS party_email_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS party_email_hash TEXT,
    ADD COLUMN IF NOT EXISTS initiator_user_id TEXT,
    ADD COLUMN IF NOT EXISTS email_check_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS email_check_passed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_hash TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otp_total_failures INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otp_send_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otp_window_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS session_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS agreed_version_number INT,
    ADD COLUMN IF NOT EXISTS agreed_content_hash TEXT;

-- Index party_email_hash for zero-knowledge address lookup
CREATE INDEX IF NOT EXISTS idx_confirmations_party_email_hash ON public.confirmations (party_email_hash);

-- Index session_token_hash for counterparty review session authentication
CREATE INDEX IF NOT EXISTS idx_confirmations_session_token_hash ON public.confirmations (session_token_hash);
