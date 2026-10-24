"use client";

import React, { useState, useRef } from "react";
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
  ShieldCheck,
  RefreshCw,
  GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api/client";
import { AgreementAnalysis, ConversationRecord, ChatUploadResponse, ConflictItem } from "@/types";

export interface ResolutionDiffSummary {
  resolvedConflicts: ConflictItem[];
  remainingConflicts: ConflictItem[];
  newConflicts: ConflictItem[];
}

interface UpdatedChatComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversation: ConversationRecord | null;
  currentAnalysis: AgreementAnalysis | null;
  onUpdateCompleted: (
    newChat: ChatUploadResponse,
    newAnalysis: AgreementAnalysis,
    summary: ResolutionDiffSummary
  ) => void;
}

export function UpdatedChatComparisonModal({
  isOpen,
  onClose,
  currentConversation,
  currentAnalysis,
  onUpdateCompleted,
}: UpdatedChatComparisonModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [chatText, setChatText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const previousConflicts = currentAnalysis?.conflicts || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Only WhatsApp exported .txt files are supported.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const computeDiff = (
    prevAnalysis: AgreementAnalysis | null,
    nextAnalysis: AgreementAnalysis
  ): ResolutionDiffSummary => {
    if (!prevAnalysis || !prevAnalysis.conflicts.length) {
      return {
        resolvedConflicts: [],
        remainingConflicts: nextAnalysis.conflicts,
        newConflicts: nextAnalysis.conflicts,
      };
    }

    const prevList = prevAnalysis.conflicts;
    const nextList = nextAnalysis.conflicts;

    // A previous conflict is resolved if its category / description no longer appears in next conflicts
    const remaining: ConflictItem[] = [];
    const resolved: ConflictItem[] = [];

    for (const prev of prevList) {
      const stillPresent = nextList.find(
        (n) =>
          n.conflict_id === prev.conflict_id ||
          (n.term_category === prev.term_category &&
            n.description.toLowerCase() === prev.description.toLowerCase())
      );
      if (stillPresent) {
        remaining.push(prev);
      } else {
        resolved.push(prev);
      }
    }

    const newItems = nextList.filter(
      (n) =>
        !prevList.find(
          (p) =>
            p.conflict_id === n.conflict_id ||
            p.term_category === n.term_category
        )
    );

    return {
      resolvedConflicts: resolved,
      remainingConflicts: remaining,
      newConflicts: newItems,
    };
  };

  const handleProcessUpdatedChat = async () => {
    if (activeTab === "file" && !selectedFile) return;
    if (activeTab === "paste" && !chatText.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Ingest new chat
      let uploadRes: ChatUploadResponse;
      if (activeTab === "file" && selectedFile) {
        uploadRes = await api.uploadChat(selectedFile);
      } else {
        uploadRes = await api.uploadChatText(chatText);
      }

      // 2. Run legal intelligence analysis on newly uploaded chat
      const newAnalysis = await api.analyzeChat(uploadRes.chat_id);

      // 3. Compute resolution diff against previous analysis
      const diffSummary = computeDiff(currentAnalysis, newAnalysis);

      // 4. Pass back to parent page
      onUpdateCompleted(uploadRes, newAnalysis, diffSummary);
      onClose();
    } catch (err: any) {
      console.error("Failed to process follow-up chat:", err);
      setError(err?.message || "Failed to process follow-up chat. Please check format.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Upload Updated / Follow-up Negotiation
              </h3>
              <p className="text-xs text-slate-500">
                Check whether previous remaining issues or price conflicts are now resolved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Previous Issues Context Card */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Previous Open Issues ({previousConflicts.length})
              </span>
              <span className="text-[11px] text-amber-800/80 font-mono">
                {currentConversation?.filename || "Current Chat"}
              </span>
            </div>

            {previousConflicts.length > 0 ? (
              <ul className="space-y-1.5 pt-1">
                {previousConflicts.map((c) => (
                  <li
                    key={c.conflict_id}
                    className="flex items-start gap-2 bg-white/80 p-2 rounded border border-amber-200/60 text-slate-800"
                  >
                    <span className="font-bold text-amber-800 shrink-0">
                      [{c.term_category.replace("_", " ").toUpperCase()}]:
                    </span>
                    <span className="text-[11px] leading-relaxed">
                      {c.description}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-amber-900">
                No active conflicts were detected in the previous transcript. Uploading an updated chat will verify any newly finalized terms.
              </p>
            )}
          </div>

          {/* Error Notice */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Update Error</AlertTitle>
              <AlertDescription className="text-xs mt-1">{error}</AlertDescription>
            </Alert>
          )}

          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === "file"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              Upload Follow-up .txt File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === "paste"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "hover:text-slate-900"
              }`}
            >
              Paste Follow-up Transcript
            </button>
          </div>

          {/* File Upload Zone */}
          {activeTab === "file" ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-1">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <p className="font-bold text-slate-900">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to verify
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-blue-600 underline pt-1"
                  >
                    Select different file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-7 w-7 text-blue-600" />
                  <p className="font-semibold text-slate-900">
                    Select updated WhatsApp export (.txt)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Ensure the chat includes recent follow-up messages resolving the issue.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs mt-1"
                  >
                    Browse .txt File
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Paste Text Area */
            <div className="space-y-2">
              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                disabled={isProcessing}
                placeholder="Paste latest messages where parties resolved open terms...&#10;12/03/24, 11:00 - Party A: Okay, ₹1,00,000 accepted&#10;12/03/24, 11:02 - Party B: Confirmed, let's proceed."
                className="w-full h-36 p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-500">
                Include sender names and timestamps matching WhatsApp export format.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            onClick={handleProcessUpdatedChat}
            disabled={
              isProcessing ||
              (activeTab === "file" && !selectedFile) ||
              (activeTab === "paste" && !chatText.trim())
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-2 shadow-sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comparing & Verifying Resolutions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze Updated Chat & Check Resolutions
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
