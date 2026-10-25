"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
  X,
  FileCheck,
  LayoutDashboard,
  ShieldCheck,
  Calendar,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api/client";
import { ChatUploadResponse } from "@/types";

export function ChatUpload({ onUploadSuccess }: { onUploadSuccess?: (data: ChatUploadResponse) => void }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode: "file" or "paste"
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Paste state
  const [chatText, setChatText] = useState<string>("");

  // Process state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<ChatUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper: Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Validate file
  const validateFile = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Only WhatsApp exported .txt files are supported. Please ensure you export the chat without media.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds the maximum 10 MB limit. Please select a smaller export file.");
      return false;
    }
    setError(null);
    return true;
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  // Upload selected file
  const handleUploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    try {
      const data = await api.uploadChat(selectedFile);
      setResult(data);
      onUploadSuccess?.(data);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err?.message || "Failed to parse and store WhatsApp chat file.");
    } finally {
      setIsUploading(false);
    }
  };

  // Submit pasted text
  const handleTextSubmit = async () => {
    if (!chatText.trim()) return;

    setIsUploading(true);
    setError(null);
    try {
      const data = await api.uploadChatText(chatText);
      setResult(data);
      onUploadSuccess?.(data);
    } catch (err: any) {
      console.error("Parsing failed:", err);
      setError(err?.message || "Failed to parse pasted WhatsApp transcript. Please verify the timestamp format.");
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger legal AI analysis on uploaded chat
  const handleAnalyzeChat = async () => {
    if (!result?.chat_id) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await api.analyzeChat(result.chat_id);
      router.push(
        `/analysis?analysis_id=${encodeURIComponent(analysis.analysis_id)}&chat_id=${encodeURIComponent(result.chat_id)}`
      );
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err?.message || "Failed to analyze chat negotiation with AI.");
      setIsAnalyzing(false);
    }
  };

  // Reset to upload another file
  const handleReset = () => {
    setSelectedFile(null);
    setChatText("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Ingest WhatsApp Business Negotiation
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Upload your genuine WhatsApp chat export (.txt) or paste verbatim messages.
              </CardDescription>
            </div>

            {/* Input Method Toggle Tabs */}
            {!result && (
              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("file");
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeTab === "file"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Upload File (.txt)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("paste");
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeTab === "paste"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Paste Transcript
                  </span>
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Active Error Notice */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ingestion Error</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form Area (Only shown when not yet ingested) */}
          {!result && (
            <>
              {activeTab === "file" ? (
                /* File Drag and Drop Tab */
                <div className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 sm:p-10 transition-all ${
                      isDragging
                        ? "border-blue-500 bg-blue-50/70 scale-[0.99]"
                        : selectedFile
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="hidden"
                      id="whatsapp-chat-file-input"
                    />

                    {selectedFile ? (
                      /* Selected File Preview Box */
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                          <FileCheck className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm break-all">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFileSize(selectedFile.size)} • Ready to ingest
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-xs h-8"
                          >
                            Change File
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            disabled={isUploading}
                            className="text-xs h-8 text-slate-500 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Dropzone State */
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="h-14 w-14 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center">
                          <Upload className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            Drag & drop your WhatsApp chat export here
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Export chat from WhatsApp without media (.txt) • Up to 10 MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="text-xs h-8 mt-1 border-slate-300"
                        >
                          Browse Computer
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Primary Ingestion Action Button */}
                  {selectedFile && (
                    <Button
                      onClick={handleUploadFile}
                      disabled={isUploading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 text-sm gap-2 shadow-sm"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Encrypting, hashing, and parsing negotiation...
                        </>
                      ) : (
                        <>
                          Ingest & Encrypt Negotiation
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                /* Paste Text Tab */
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      disabled={isUploading}
                      placeholder={`Paste exported WhatsApp conversation lines here...&#10;&#10;Format Examples:&#10;12/03/24, 10:15 - Client: Hi, regarding the project scope&#10;12/03/24, 10:18 - Provider: Yes, ₹1,00,000 with 50% upfront`}
                      className="w-full h-52 p-4 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-slate-50/40 text-slate-800 placeholder:text-slate-400 leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {chatText ? (
                        <span>
                          {chatText.split("\n").filter((l) => l.trim()).length} lines • {chatText.length} characters
                        </span>
                      ) : (
                        "Exported WhatsApp format required"
                      )}
                    </span>
                    {chatText && (
                      <button
                        type="button"
                        onClick={() => setChatText("")}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Clear text
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={handleTextSubmit}
                    disabled={isUploading || !chatText.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 text-sm gap-2 shadow-sm"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating and parsing transcript...
                      </>
                    ) : (
                      <>
                        Parse Pasted Transcript
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Success Result View */}
          {result && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5 sm:p-6 space-y-5">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Negotiation Successfully Ingested
                    </h3>
                    <p className="text-xs text-slate-500">
                      {result.filename} • Encrypted in Supabase with SHA-256 fingerprint
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="bg-white text-[11px] font-mono text-slate-700 w-fit">
                  Chat ID: {result.chat_id.slice(0, 8)}...
                </Badge>
              </div>

              {/* Ingestion Metadata Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Users className="h-3.5 w-3.5 text-blue-600" /> Detected Counterparties
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {result.party_names.map((party) => (
                      <Badge key={party} variant="secondary" className="text-xs font-semibold">
                        {party}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Negotiation Date
                  </div>
                  <p className="text-xs font-semibold text-slate-900 pt-0.5">
                    {result.date_range ||
                      (() => {
                        if (!result.messages || result.messages.length === 0) return "Not recorded";
                        const dates = result.messages
                          .map((m) => new Date(m.timestamp))
                          .filter((d) => !isNaN(d.getTime()))
                          .sort((a, b) => a.getTime() - b.getTime());
                        if (dates.length === 0) return "Not recorded";
                        const fmt = (d: Date) =>
                          d.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          });
                        const first = dates[0];
                        const last = dates[dates.length - 1];
                        return first.toDateString() === last.toDateString()
                          ? fmt(first)
                          : `${fmt(first)} – ${fmt(last)}`;
                      })()}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Format: {result.date_format_inferred?.startsWith("MM/DD")
                      ? "MM/DD/YYYY"
                      : result.date_format_inferred?.startsWith("DD/MM")
                      ? "DD/MM/YYYY"
                      : result.date_format_inferred?.split("(")[0]?.trim() || "Standard"}
                  </p>
                  {result.is_date_ambiguous && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      Ambiguous format resolved chronologically
                    </p>
                  )}
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Verbatim Messages
                  </div>
                  <p className="text-xs font-semibold text-slate-900 pt-0.5">
                    {result.message_count} messages indexed
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Stable legal citation IDs assigned
                  </p>
                </div>
              </div>

              {/* Message Citation Stream Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Verbatim Message Citations:</span>
                  <span>Displaying all {result.messages.length} messages</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {result.messages.map((msg) => {
                    const formattedTime = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";
                    return (
                      <div
                        key={msg.message_id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex flex-col gap-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700">{msg.sender}</span>
                          <div className="flex items-center gap-2">
                            {formattedTime && (
                              <span className="text-[10px] text-slate-400">
                                {formattedTime}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {msg.message_id}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-800 leading-normal">{msg.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Primary Call-to-Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-emerald-100">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs h-9 border-slate-300"
                  >
                    Upload Another Chat
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/dashboard")}
                    className="text-xs h-9 text-slate-600 gap-1.5"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" /> Workspace Dashboard
                  </Button>
                </div>

                <Button
                  onClick={handleAnalyzeChat}
                  disabled={isAnalyzing}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-2 shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing with AI (Section 7 ICA)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Negotiation with DealShield AI
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
