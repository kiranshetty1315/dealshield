import {
  HealthResponse,
  ChatUploadResponse,
  ConversationRecord,
  AgreementAnalysis,
  Agreement,
  ConfirmationStatus,
  DocumentHashVerification,
  AuditEvent,
  TokenConfirmationResponse,
  User,
  AuthResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async checkHealth(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/health`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return res.json();
  }

  // --- Authentication ---

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || `Login failed (${res.status})`);
    }
    return res.json();
  }

  async signup(data: {
    email: string;
    password: string;
    full_name?: string;
    organization?: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Signup failed" }));
      throw new Error(err.detail || `Signup failed (${res.status})`);
    }
    return res.json();
  }

  async getMe(token: string): Promise<User> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to fetch user profile" }));
      throw new Error(err.detail || `Failed to fetch profile (${res.status})`);
    }
    return res.json();
  }

  async logout(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
      method: "POST",
    }).catch(() => {});
  }

  // --- Team B: Chat Ingestion ---

  async uploadChat(file: File): Promise<ChatUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${this.baseUrl}/api/v1/chats/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || `Upload failed with status: ${res.status}`);
    }
    return res.json();
  }

  async uploadChatText(text: string): Promise<ChatUploadResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/chats/upload`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: text,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Parsing failed" }));
      throw new Error(err.detail || `Parsing failed with status: ${res.status}`);
    }
    return res.json();
  }

  async getConversation(chatId: string): Promise<ChatUploadResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/chats/${encodeURIComponent(chatId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Conversation not found" }));
      throw new Error(err.detail || `Failed to fetch conversation (${res.status})`);
    }
    return res.json();
  }

  async listChats(): Promise<ConversationRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/chats`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to list conversations (${res.status})`);
    }
    return res.json();
  }

  async deleteChat(chatId: string): Promise<{ status: string; chat_id: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/chats/${encodeURIComponent(chatId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to delete chat" }));
      throw new Error(err.detail || `Failed to delete conversation (${res.status})`);
    }
    return res.json();
  }

  async deleteAllChats(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/chats`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to erase message history" }));
      throw new Error(err.detail || `Failed to erase message history (${res.status})`);
    }
    return res.json();
  }

  // --- Team C: Analysis ---

  async runAnalysis(chatId: string, focusAreas?: string[]): Promise<AgreementAnalysis> {
    const res = await fetch(`${this.baseUrl}/api/v1/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, focus_areas: focusAreas }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
      throw new Error(err.detail || `Analysis failed with status: ${res.status}`);
    }
    return res.json();
  }

  async analyzeChat(chatId: string, focusAreas?: string[]): Promise<AgreementAnalysis> {
    return this.runAnalysis(chatId, focusAreas);
  }

  async getAnalysis(analysisId: string): Promise<AgreementAnalysis> {
    const res = await fetch(`${this.baseUrl}/api/v1/analysis/${encodeURIComponent(analysisId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Analysis record not found" }));
      throw new Error(err.detail || `Failed to fetch analysis (${res.status})`);
    }
    return res.json();
  }

  // --- Team A / Team D: Agreements ---

  async createAgreement(analysisId: string, parties?: string[], terms?: Record<string, any>[]): Promise<Agreement> {
    const res = await fetch(`${this.baseUrl}/api/v1/agreements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis_id: analysisId, parties, terms }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Agreement creation failed" }));
      throw new Error(err.detail || `Failed to create agreement (${res.status})`);
    }
    return res.json();
  }

  async getAgreement(agreementId: string): Promise<Agreement> {
    const res = await fetch(`${this.baseUrl}/api/v1/agreements/${encodeURIComponent(agreementId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Agreement not found" }));
      throw new Error(err.detail || `Failed to fetch agreement (${res.status})`);
    }
    return res.json();
  }

  getAgreementPdfUrl(agreementId: string): string {
    return `${this.baseUrl}/api/v1/agreements/${encodeURIComponent(agreementId)}/pdf`;
  }

  // --- Team D: Confirmations & Single-Use Tokens ---

  async recordConfirmation(agreementId: string, partyName: string, confirmed: boolean, notes?: string): Promise<ConfirmationStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agreement_id: agreementId,
        party_name: partyName,
        confirmed,
        notes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to record confirmation" }));
      throw new Error(err.detail || `Confirmation failed (${res.status})`);
    }
    return res.json();
  }

  async submitConfirmation(
    agreementId: string,
    partyName: string,
    confirmed: boolean,
    notes?: string,
    versionNumber: number = 1
  ): Promise<ConfirmationStatus> {
    return this.recordConfirmation(agreementId, partyName, confirmed, notes);
  }

  async getConfirmationStatus(agreementId: string): Promise<ConfirmationStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/${encodeURIComponent(agreementId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Confirmation status not found" }));
      throw new Error(err.detail || `Failed to fetch confirmations (${res.status})`);
    }
    return res.json();
  }

  async generatePartyToken(agreementId: string, partyName: string): Promise<{ token: string; raw_token: string; confirmation_url: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreement_id: agreementId, party_name: partyName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to generate token" }));
      throw new Error(err.detail || `Token creation failed (${res.status})`);
    }
    return res.json();
  }

  async inspectToken(token: string): Promise<{
    token: string;
    agreement_id: string;
    party_name: string;
    confirmed: boolean;
    confirmed_at?: string;
    declined: boolean;
    declined_at?: string;
    decline_reason?: string;
    expires_at?: string;
    agreement?: Agreement | null;
  }> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Invalid or expired review link" }));
      throw new Error(err.detail || `Token inspection failed (${res.status})`);
    }
    return res.json();
  }

  async confirmByToken(
    token: string,
    notes?: string,
    action: "agree" | "decline" = "agree",
    declineReason?: string
  ): Promise<TokenConfirmationResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/tokens/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        notes,
        action,
        decline_reason: declineReason,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Token confirmation failed" }));
      throw new Error(err.detail || `Token execution failed (${res.status})`);
    }
    return res.json();
  }

  // --- Team D: Evidence Vault ---

  async verifyDocumentHash(content: string, expectedHash: string): Promise<DocumentHashVerification> {
    const res = await fetch(`${this.baseUrl}/api/v1/evidence/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, expected_hash: expectedHash }),
    });

    if (!res.ok) {
      throw new Error(`Verification failed with status: ${res.status}`);
    }
    return res.json();
  }

  async verifyHash(content: string, expectedHash: string): Promise<DocumentHashVerification> {
    return this.verifyDocumentHash(content, expectedHash);
  }

  async getAuditTrail(entityId: string): Promise<AuditEvent[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/evidence/audit-log/${encodeURIComponent(entityId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Audit trail not found" }));
      throw new Error(err.detail || `Failed to fetch audit log (${res.status})`);
    }
    return res.json();
  }
}

export const api = new ApiClient();
