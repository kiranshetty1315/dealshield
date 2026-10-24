import {
  HealthResponse,
  ChatUploadResponse,
  AgreementAnalysis,
  Agreement,
  ConfirmationStatus,
  DocumentHashVerification,
  AuditEvent,
  TokenConfirmationResponse,
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

  // --- Team C: AI Extraction & Section 7 Intelligence ---

  async analyzeChat(chatId: string, focusAreas?: string[]): Promise<AgreementAnalysis> {
    const res = await fetch(`${this.baseUrl}/api/v1/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, focus_areas: focusAreas }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
      throw new Error(err.detail || `Analysis request failed with status: ${res.status}`);
    }
    return res.json();
  }

  async getAnalysis(analysisId: string): Promise<AgreementAnalysis> {
    const res = await fetch(`${this.baseUrl}/api/v1/analysis/${encodeURIComponent(analysisId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Analysis not found" }));
      throw new Error(err.detail || `Failed to fetch analysis (${res.status})`);
    }
    return res.json();
  }

  // --- Team D: Agreement Generation & Versions ---

  async createAgreement(analysisId: string, parties?: string[]): Promise<Agreement> {
    const res = await fetch(`${this.baseUrl}/api/v1/agreements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis_id: analysisId, parties: parties }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Agreement generation failed" }));
      throw new Error(err.detail || `Failed to generate agreement (${res.status})`);
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

  // --- Team D: Two-Party Confirmations ---

  async submitConfirmation(
    agreementId: string,
    partyName: string,
    confirmed: boolean,
    notes?: string,
    versionNumber: number = 1
  ): Promise<ConfirmationStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agreement_id: agreementId,
        party_name: partyName,
        confirmed: confirmed,
        notes: notes,
        version_number: versionNumber,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Confirmation failed" }));
      throw new Error(err.detail || `Failed to record confirmation (${res.status})`);
    }
    return res.json();
  }

  async getConfirmationStatus(agreementId: string): Promise<ConfirmationStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/${encodeURIComponent(agreementId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Confirmation status not found" }));
      throw new Error(err.detail || `Failed to fetch confirmation status (${res.status})`);
    }
    return res.json();
  }

  async confirmByToken(token: string, notes?: string): Promise<TokenConfirmationResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Token confirmation failed" }));
      throw new Error(err.detail || `Single-use token confirmation failed (${res.status})`);
    }
    return res.json();
  }

  // --- Evidence & Audit Trail ---

  async verifyHash(content: string, expectedHash: string): Promise<DocumentHashVerification> {
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
