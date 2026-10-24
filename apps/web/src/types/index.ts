/**
 * DealShield AI Shared TypeScript Contracts
 * Single source of truth aligned with backend Pydantic models.
 */

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  environment: string;
  timestamp: string;
  services: {
    database: string;
    openai: string;
    chat_parser: string;
    hash_service?: string;
    [key: string]: string | undefined;
  };
}

export interface Message {
  message_id: string;
  sender: string;
  content: string;
  timestamp: string;
  sequence_number: number;
  raw_line: string;
}

export interface ChatUploadResponse {
  chat_id: string;
  filename: string;
  party_names: string[];
  message_count: number;
  messages: Message[];
  status: string;
}

export type ConfidenceLevel = "high" | "medium" | "low";
export type TermStatus = "agreed" | "proposed" | "contested" | "ambiguous";
export type ConflictSeverity = "high" | "medium" | "low";
export type ImportanceLevel = "critical" | "important" | "recommended";

export interface Party {
  party_id: string;
  name: string;
  detected_role?: string;
  contact_handle?: string;
}

export interface ExtractedTerm {
  term_id: string;
  category: string;
  description: string;
  proposed_value?: string;
  accepted_value?: string;
  status: TermStatus;
  source_message_ids: string[];
  confidence: ConfidenceLevel;
}

export interface ConflictItem {
  conflict_id: string;
  term_category: string;
  description: string;
  party_positions: Record<string, string>;
  source_message_ids: string[];
  severity: ConflictSeverity;
  resolution_suggestion?: string;
}

export interface MissingTerm {
  term_id: string;
  category: string;
  description: string;
  importance: ImportanceLevel;
  recommendation: string;
}

export interface AgreementAnalysis {
  analysis_id: string;
  chat_id: string;
  parties: Party[];
  extracted_terms: ExtractedTerm[];
  conflicts: ConflictItem[];
  missing_terms: MissingTerm[];
  confidence_score: number;
  requires_human_review: boolean;
  analyzed_at: string;
}

export type AgreementStatus =
  | "draft"
  | "pending_confirmation"
  | "partially_confirmed"
  | "fully_confirmed"
  | "superseded";

export interface Clause {
  clause_id: string;
  title: string;
  body: string;
  source_term_ids: string[];
  statutory_reference?: string;
}

export interface AgreementVersion {
  version_number: number;
  clauses: Clause[];
  generated_at: string;
  status: AgreementStatus;
  content_hash?: string;
}

export interface Agreement {
  id: string;
  analysis_id: string;
  parties: string[];
  current_version: number;
  status: AgreementStatus;
  versions: AgreementVersion[];
  created_at: string;
  updated_at: string;
}

export interface PartyConfirmationRecord {
  party_name: string;
  confirmed: boolean;
  confirmed_at?: string;
  notes?: string;
  ip_hash?: string;
}

export interface ConfirmationStatus {
  agreement_id: string;
  version_number: number;
  parties: PartyConfirmationRecord[];
  all_confirmed: boolean;
  last_updated: string;
}

export interface DocumentHashVerification {
  is_valid: boolean;
  computed_hash: string;
  expected_hash: string;
  explanation: string;
  limitations_notice: string;
}
