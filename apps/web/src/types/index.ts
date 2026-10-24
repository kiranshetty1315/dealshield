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

export interface ConversationRecord {
  id: string;
  filename: string;
  party_names: string[];
  message_count: number;
  uploaded_at: string;
  raw_content_path?: string;
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
  statutory_context?: string;
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
  | "superseded"
  | "declined";

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
  declined?: boolean;
  declined_at?: string;
  decline_reason?: string;
  notes?: string;
  ip_hash?: string;
}

export interface ConfirmationStatus {
  agreement_id: string;
  version_number: number;
  parties: PartyConfirmationRecord[];
  all_confirmed: boolean;
  any_declined?: boolean;
  last_updated: string;
}

export interface DocumentHashVerification {
  is_valid: boolean;
  computed_hash: string;
  expected_hash: string;
  explanation: string;
  limitations_notice: string;
}

export interface AnalysisRequest {
  chat_id: string;
  focus_areas?: string[];
}

export interface AgreementCreateRequest {
  analysis_id: string;
  parties?: string[];
  terms?: Record<string, any>[];
}

export interface ConfirmationRequest {
  agreement_id: string;
  party_name: string;
  confirmed: boolean;
  action?: "agree" | "decline";
  decline_reason?: string;
  notes?: string;
  version_number?: number;
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TokenConfirmationResponse {
  status: string;
  message: string;
  agreement_id: string;
  party_name: string;
  confirmed: boolean;
  confirmed_at?: string;
  declined?: boolean;
  declined_at?: string;
  decline_reason?: string;
  action?: "agree" | "decline";
}


export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type DashboardStatusVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "warning"
  | "success";

export interface DashboardRecentConversation {
  id: string;
  filename: string;
  party_names: string[];
  message_count: number;
  uploaded_at: string;
  analysis_id?: string | null;
  agreement_id?: string | null;
  requires_human_review?: boolean | null;
  status: string;
  status_variant: DashboardStatusVariant;
}

export interface DashboardStats {
  total_conversations: number;
  total_agreements: number;
  confirmed_agreements: number;
  pending_review_count: number;
  total_hashes: number;
  recent_conversations: DashboardRecentConversation[];
}
