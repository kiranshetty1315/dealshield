-- Migration: 003_analysis_deal_gate.sql
-- Description: Add deal qualification gate columns and extraction engine metadata

ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS is_commercial_deal BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deal_rationale TEXT,
ADD COLUMN IF NOT EXISTS extraction_engine TEXT NOT NULL DEFAULT 'llm';

COMMENT ON COLUMN public.analyses.is_commercial_deal IS 'Whether this conversation represents a commercial deal';
COMMENT ON COLUMN public.analyses.deal_rationale IS 'One-sentence explanation of deal classification';
COMMENT ON COLUMN public.analyses.extraction_engine IS 'Engine used: llm or fallback';
