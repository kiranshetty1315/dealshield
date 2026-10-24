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
  SessionResponse,
  TokenInspectResponse,
  TokenGenerateResponse,
  User,
  AuthResponse,
  DashboardStats,
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

  private getAuthHeaders(): Record<string, string> {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("dealshield_auth_token");
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      } catch {
        // Ignore localStorage access issues
      }
    }
    return {};
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

  async getMe(token?: string): Promise<User> {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("dealshield_auth_token") : null);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (activeToken) {
      headers["Authorization"] = `Bearer ${activeToken}`;
    }
    const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to fetch user profile" }));
      throw new Error(err.detail || `Failed to fetch profile (${res.status})`);
    }
    return res.json();
  }

  async updateProfile(data: { full_name?: string; organization?: string; role?: string }): Promise<User> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update profile" }));
      throw new Error(err.detail || `Failed to update profile (${res.status})`);
    }
    return res.json();
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update password" }));
      throw new Error(err.detail || `Password update failed (${res.status})`);
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
      headers: this.getAuthHeaders(),
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
      headers: {
        "Content-Type": "text/plain",
        ...this.getAuthHeaders(),
      },
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
      headers: { Accept: "application/json", ...this.getAuthHeaders() },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Analysis record not found" }));
      throw new Error(err.detail || `Failed to fetch analysis (${res.status})`);
    }
    return res.json();
  }

  async getAnalysisForChat(chatId: string): Promise<AgreementAnalysis> {
    const res = await fetch(`${this.baseUrl}/api/v1/analysis/chat/${encodeURIComponent(chatId)}`, {
      method: "GET",
      headers: { Accept: "application/json", ...this.getAuthHeaders() },
    });

    if (!res.ok) {
      return this.analyzeChat(chatId);
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
      headers: { Accept: "application/json", ...this.getAuthHeaders() },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Agreement not found" }));
      throw new Error(err.detail || `Failed to fetch agreement (${res.status})`);
    }
    return res.json();
  }

  async getAgreementForChat(chatId: string): Promise<Agreement> {
    const res = await fetch(`${this.baseUrl}/api/v1/agreements/chat/${encodeURIComponent(chatId)}`, {
      method: "GET",
      headers: { Accept: "application/json", ...this.getAuthHeaders() },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to load agreement for conversation" }));
      throw new Error(err.detail || `Agreement fetch failed (${res.status})`);
    }
    return res.json();
  }

  async createAgreementVersion(agreementId: string, analysisId: string): Promise<Agreement> {
    const res = await fetch(`${this.baseUrl}/api/v1/agreements/${encodeURIComponent(agreementId)}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeaders() },
      body: JSON.stringify({ analysis_id: analysisId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to create updated agreement version" }));
      throw new Error(err.detail || `Version creation failed (${res.status})`);
    }
    return res.json();
  }

  getAgreementPdfUrl(agreementId: string): string {
    return `${this.baseUrl}/api/v1/agreements/${encodeURIComponent(agreementId)}/pdf`;
  }

  // --- Team D: Confirmations & Single-Use Tokens ---

  async recordConfirmation(
    agreementId: string,
    partyName: string,
    confirmed: boolean,
    notes?: string
  ): Promise<ConfirmationStatus> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
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
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Confirmation status not found" }));
      throw new Error(err.detail || `Failed to fetch confirmations (${res.status})`);
    }
    return res.json();
  }

  async generatePartyToken(
    agreementId: string,
    partyName: string,
    partyEmail: string,
    hoursValid: number = 72
  ): Promise<TokenGenerateResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        agreement_id: agreementId,
        party_name: partyName,
        party_email: partyEmail,
        hours_valid: hoursValid,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to generate token" }));
      throw new Error(err.detail || `Token creation failed (${res.status})`);
    }
    return res.json();
  }

  async inspectToken(token: string, sessionToken?: string): Promise<TokenInspectResponse> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (sessionToken) {
      headers["X-Review-Session"] = sessionToken;
    }
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Invalid or expired review link" }));
      throw new Error(err.detail || `Token inspection failed (${res.status})`);
    }
    return res.json();
  }

  async emailCheck(token: string, email: string): Promise<{ status: string; message: string }> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}/email-check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "We couldn't verify this email address." }));
      throw new Error(err.detail || "Email verification failed");
    }
    return res.json();
  }

  async sendOtp(token: string): Promise<{ status: string; masked_email: string; message: string }> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}/otp/send`,
      {
        method: "POST",
        headers: { Accept: "application/json" },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to send verification code" }));
      throw new Error(err.detail || "Failed to send code");
    }
    return res.json();
  }

  async verifyOtp(token: string, otp: string): Promise<SessionResponse> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}/otp/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Invalid verification code" }));
      throw new Error(err.detail || "Verification failed");
    }
    return res.json();
  }

  async confirmByToken(
    token: string,
    notes?: string,
    action: "agree" | "decline" = "agree",
    declineReason?: string,
    sessionToken?: string
  ): Promise<TokenConfirmationResponse> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionToken) {
      headers["X-Review-Session"] = sessionToken;
    }
    const res = await fetch(`${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        notes,
        decline_reason: declineReason,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Token confirmation failed" }));
      throw new Error(err.detail || `Token execution failed (${res.status})`);
    }
    return res.json();
  }

  async downloadAgreementByToken(token: string, sessionToken?: string, filename?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (sessionToken) {
      headers["X-Review-Session"] = sessionToken;
    }
    const res = await fetch(
      `${this.baseUrl}/api/v1/confirmations/token/${encodeURIComponent(token)}/download`,
      {
        method: "GET",
        headers,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Download failed" }));
      throw new Error(err.detail || "Failed to download agreement PDF");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `DealShield_Agreement_${token.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  // --- Workspace Dashboard ---

  async getDashboardStats(userId?: string): Promise<DashboardStats> {
    const url = new URL(`${this.baseUrl}/api/v1/dashboard/stats`);
    if (userId) {
      url.searchParams.set("user_id", userId);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to fetch dashboard stats" }));
      throw new Error(err.detail || `Failed to fetch dashboard stats (${res.status})`);
    }
    return res.json();
  }
}

export const api = new ApiClient();
