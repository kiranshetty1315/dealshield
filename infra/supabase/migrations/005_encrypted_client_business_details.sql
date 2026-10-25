-- DealShield AI — Migration 005: Encrypted Client & Business Details at Rest
-- Ensures client legal name, company name, GST, PAN, and office address are protected with application-level encryption

ALTER TABLE public.confirmations
    ADD COLUMN IF NOT EXISTS client_name_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS company_name_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS gst_number_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS pan_last_4_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS office_address_encrypted TEXT;
