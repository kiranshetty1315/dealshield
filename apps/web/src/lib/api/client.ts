import {
  HealthResponse,
  ChatUploadResponse,
  AgreementAnalysis,
  DocumentHashVerification,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
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
}

export const api = new ApiClient();
