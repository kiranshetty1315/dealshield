-- DealShield AI — Migration 004: Client Business Details
-- Adds GST number, Business PAN last 4 digits, and office address to confirmations

ALTER TABLE public.confirmations
    ADD COLUMN IF NOT EXISTS gst_number TEXT,
    ADD COLUMN IF NOT EXISTS pan_last_4 TEXT,
    ADD COLUMN IF NOT EXISTS office_address TEXT;

-- Index pan_last_4 for quick lookup/verification
CREATE INDEX IF NOT EXISTS idx_confirmations_pan_last_4 ON public.confirmations (pan_last_4);
