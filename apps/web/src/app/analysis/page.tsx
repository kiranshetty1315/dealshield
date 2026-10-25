"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Scale,
  Sparkles,
  FileText,
  ExternalLink,
  Loader2,
  Database,
  Upload,
  MessageSquare,
  GitCompare,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ChatMessageViewer } from "@/components/chat/ChatMessageViewer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  ConflictResolutionDrawer,
  ResolvedConflictState,
} from "@/components/analysis/ConflictResolutionDrawer";
import { TermCard } from "@/components/analysis/TermCard";
import {
  UpdatedChatComparisonModal,
  ResolutionDiffSummary,
} from "@/components/analysis/UpdatedChatComparisonModal";
import {
  AgreementAnalysis,
  ExtractedTerm,
  Message,
  ConversationRecord,
  ChatUploadResponse,
} from "@/types";
import { api } from "@/lib/api/client";

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get("analysis_id");
  const chatIdParam = searchParams.get("chat_id");

  // Conversation selection state
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatIdParam);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);

  // Analysis & Messages state (real data from database)
  const [analysis, setAnalysis] = useState<AgreementAnalysis | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive UI state
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, ResolvedConflictState>>({});

  // Follow-up comparison modal state
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [resolutionBanner, setResolutionBanner] = useState<ResolutionDiffSummary | null>(null);

  // Fetch list of all previously uploaded conversations in workspace
  const loadConversationsList = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const chatList = await api.listChats();
      setConversations(chatList);

      // Determine initial selected conversation
      if (!selectedChatId && chatList.length > 0) {
        if (chatIdParam) {
          setSelectedChatId(chatIdParam);
        } else {
          setSelectedChatId(chatList[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load chat conversations list:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [chatIdParam, selectedChatId]);

  useEffect(() => {
    loadConversationsList();
  }, [loadConversationsList]);

  // Load analysis and messages for the selected chat or analysis ID
  const loadChatAnalysis = useCallback(async (chatId: string, analysisId?: string | null) => {
    setIsLoadingAnalysis(true);
    setError(null);
    setResolvedConflicts({});

    try {
      let fetchedAnalysis: AgreementAnalysis;

      if (analysisId) {
        fetchedAnalysis = await api.getAnalysis(analysisId);
      } else {
        fetchedAnalysis = await api.getAnalysisForChat(chatId);
      }

      setAnalysis(fetchedAnalysis);

      // Fetch verbatim chat messages
      const targetChatId = chatId || fetchedAnalysis.chat_id;
      if (targetChatId) {
        try {
          const chatData = await api.getConversation(targetChatId);
          if (chatData.messages) {
            setMessages(chatData.messages);
          }
        } catch (msgErr) {
          console.warn("Could not load message transcript:", msgErr);
        }
      }

      // Default active citation to first conflict
      if (fetchedAnalysis.conflicts && fetchedAnalysis.conflicts.length > 0) {
        const firstCitations = fetchedAnalysis.conflicts[0].source_message_ids;
        if (firstCitations && firstCitations.length > 0) {
          setActiveCitationId(firstCitations[firstCitations.length - 1]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load analysis for chat:", err);
      setError(err?.message || "Failed to load legal analysis. Please try again.");
      setAnalysis(null);
      setMessages([]);
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, []);

  // Trigger analysis load whenever selectedChatId changes
  useEffect(() => {
    if (selectedChatId) {
      loadChatAnalysis(selectedChatId, analysisIdParam);
    } else if (!isLoadingConversations && conversations.length === 0) {
      setIsLoadingAnalysis(false);
    }
  }, [selectedChatId, analysisIdParam, loadChatAnalysis, isLoadingConversations, conversations.length]);

  // Handle dropdown chat selection change
  const handleSelectConversation = (newChatId: string) => {
    setSelectedChatId(newChatId);
    setResolutionBanner(null);
    // Update URL query parameters cleanly
    const url = new URL(window.location.href);
    url.searchParams.set("chat_id", newChatId);
    url.searchParams.delete("analysis_id");
    window.history.replaceState(null, "", url.toString());
  };

  // Callback when a follow-up chat is uploaded & analyzed
  const handleUpdateCompleted = (
    newChat: ChatUploadResponse,
    newAnalysis: AgreementAnalysis,
    summary: ResolutionDiffSummary
  ) => {
    // Add new chat to conversations list if not present
    setConversations((prev) => [
      {
        id: newChat.chat_id,
        filename: newChat.filename,
        party_names: newChat.party_names,
        message_count: newChat.message_count,
        uploaded_at: new Date().toISOString(),
      },
      ...prev.filter((c) => c.id !== newChat.chat_id),
    ]);

    // Select the new chat
    setSelectedChatId(newChat.chat_id);
    setAnalysis(newAnalysis);
    setMessages(newChat.messages);
    setResolutionBanner(summary);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("chat_id", newChat.chat_id);
    url.searchParams.set("analysis_id", newAnalysis.analysis_id);
    window.history.replaceState(null, "", url.toString());
  };

  // Dynamically update terms when user manually marks conflicts as resolved
  const terms: ExtractedTerm[] = analysis
    ? analysis.extracted_terms.map((term) => {
        const matchingConflictId = Object.keys(resolvedConflicts).find((cId) => {
          const conflict = analysis.conflicts.find((c) => c.conflict_id === cId);
          return (
            cId === term.term_id ||
            (conflict && conflict.term_category === term.category)
          );
        });

        if (matchingConflictId && resolvedConflicts[matchingConflictId]) {
          const res = resolvedConflicts[matchingConflictId];
          return {
            ...term,
            status: "agreed" as const,
            accepted_value: res.resolutionText,
            description: `${term.description} (Resolved via consensus: ${res.resolutionText})`,
          };
        }
        return term;
      })
    : [];

  const isAllResolved =
    !analysis ||
    analysis.conflicts.length === 0 ||
    analysis.conflicts.every((c) => Boolean(resolvedConflicts[c.conflict_id]));

  const handleConflictResolved = (resolution: ResolvedConflictState) => {
    setResolvedConflicts((prev) => ({
      ...prev,
      [resolution.conflict_id]: resolution,
    }));
  };

  const handleConflictReopened = (conflictId: string) => {
    setResolvedConflicts((prev) => {
      const copy = { ...prev };
      delete copy[conflictId];
      return copy;
    });
  };

  const handleCitationClick = (citationId: string) => {
    setActiveCitationId(citationId);
  };

  const handleMessageSelect = (msg: Message) => {
    setActiveCitationId(msg.message_id);
  };

  // Synthesize contract agreement
  const handleGenerateAgreement = async () => {
    if (!analysis) return;
    setIsGenerating(true);
    try {
      const partyNames = analysis.parties.map((p) => p.name);
      const agreement = await api.createAgreement(analysis.analysis_id, partyNames);
      router.push(
        `/agreements?agreement_id=${encodeURIComponent(agreement.id)}&analysis_id=${encodeURIComponent(analysis.analysis_id)}`
      );
    } catch (err: any) {
      alert(`Agreement generation failed: ${err.message || err}`);
      setIsGenerating(false);
    }
  };

  // Current selected conversation record
  const currentConversation = conversations.find((c) => c.id === selectedChatId) || null;

  // 1. Initial Full Page Loading
  if (isLoadingConversations) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-700">Loading negotiations. Please wait...</p>
      </div>
    );
  }

  // 2. Empty State: No chats uploaded in workspace yet
  if (conversations.length === 0 && !selectedChatId) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card className="border-slate-200 shadow-sm text-center py-12 px-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            No WhatsApp Negotiations Ingested Yet
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 max-w-md mx-auto mt-2 mb-6">
            Upload an exported WhatsApp negotiation (.txt) to automatically extract agreed terms, identify unresolved contradictions, and synthesize formal commercial contracts.
          </CardDescription>
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Link href="/upload">
              <Upload className="h-4 w-4" /> Ingest Your First Negotiation
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const p1 = analysis?.parties[0]?.name || "Party 1";
  const p2 = analysis?.parties[1]?.name || "Party 2";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-7xl">
      {/* Top Negotiation Selection Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <label htmlFor="chat-select" className="text-xs font-bold text-slate-700 shrink-0">
            Select Negotiation:
          </label>
          <div className="relative flex-1 max-w-md">
            <select
              id="chat-select"
              value={selectedChatId || ""}
              onChange={(e) => handleSelectConversation(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none truncate"
            >
              {conversations.map((conv) => {
                const partiesLabel =
                  conv.party_names && conv.party_names.length > 0
                    ? conv.party_names.join(" & ")
                    : "Unassigned Parties";
                return (
                  <option key={conv.id} value={conv.id}>
                    {partiesLabel} — {conv.filename} ({conv.message_count} msgs)
                  </option>
                );
              })}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <Badge variant="outline" className="text-[11px] font-mono text-slate-500 shrink-0 hidden sm:inline-flex">
            {conversations.length} {conversations.length === 1 ? "Chat" : "Chats"} Available
          </Badge>
        </div>

        {/* Action Controls: Follow-up Upload & Ingest New */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(true)}
            disabled={!analysis || isLoadingAnalysis}
            className="gap-2 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
            title="Upload updated chat to check if previous open issues are resolved"
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>Check Follow-up Chat</span>
          </Button>

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs border-slate-300">
            <Link href="/upload">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload New Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Resolution Diff Banner (Shown when updated chat was verified) */}
      {resolutionBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-emerald-950 text-sm">
                Follow-up Chat Analyzed: {resolutionBanner.resolvedConflicts.length} Previous Issue(s) Resolved!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setResolutionBanner(null)}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-medium"
            >
              Dismiss
            </button>
          </div>

          {resolutionBanner.resolvedConflicts.length > 0 && (
            <div className="text-xs text-emerald-900 space-y-1 pl-7">
              <p className="font-semibold">Successfully Resolved Contradictions:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {resolutionBanner.resolvedConflicts.map((c) => (
                  <li key={c.conflict_id}>
                    <strong>[{c.term_category.toUpperCase()}]:</strong> {c.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolutionBanner.remainingConflicts.length > 0 && (
            <div className="text-xs text-amber-900 space-y-1 pl-7 pt-1">
              <p className="font-semibold text-amber-950">Remaining Open Issues to Address:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {resolutionBanner.remainingConflicts.map((c) => (
                  <li key={c.conflict_id}>
                    <strong>[{c.term_category.toUpperCase()}]:</strong> {c.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          {selectedChatId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadChatAnalysis(selectedChatId)}
              className="border-red-300 text-red-800 text-xs h-8"
            >
              Retry Analysis
            </Button>
          )}
        </div>
      )}

      {/* Analysis Loading Skeleton */}
      {isLoadingAnalysis ? (
        <div className="space-y-6 py-6 animate-pulse">
          <div className="h-10 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-32 bg-slate-100 rounded-xl" />
              <div className="h-48 bg-slate-100 rounded-xl" />
              <div className="h-48 bg-slate-100 rounded-xl" />
            </div>
            <div className="lg:col-span-5 h-96 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ) : analysis ? (
        <>
          {/* Main Analysis Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Agreement Analysis & Legal Intelligence
                </h1>
                <Badge
                  variant="outline"
                  className="border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold text-xs flex items-center gap-1"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verified & Secured ({analysis.analysis_id.slice(0, 8)}...)
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Verified WhatsApp negotiation between{" "}
                <strong className="text-slate-800">{p1}</strong> ({analysis.parties[0]?.detected_role || "Participant"}) and{" "}
                <strong className="text-slate-800">{p2}</strong> ({analysis.parties[1]?.detected_role || "Participant"})
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {isAllResolved ? (
                <Badge variant="success" className="gap-1.5 py-1 px-3 text-xs bg-emerald-600 text-white font-medium">
                  <CheckCircle className="h-3.5 w-3.5" />
                  All Conflicts Resolved
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1.5 py-1 px-3 text-xs font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Requires Human Review ({analysis.conflicts.length} Conflict{analysis.conflicts.length > 1 ? "s" : ""})
                </Badge>
              )}

              <Button
                onClick={handleGenerateAgreement}
                disabled={isGenerating}
                className="gap-2 text-xs font-semibold shadow-sm"
                variant={isAllResolved ? "default" : "secondary"}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Synthesizing Agreement Draft...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Synthesize Agreement Draft
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Split Pane: Analysis & Resolution (Left) vs. Verbatim Chat Evidence (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Pane (7 cols): Analysis, Conflicts, Terms, Legal Safeguards */}
            <div className="lg:col-span-7 space-y-6">
              {/* Identified Contracting Parties */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    Identified Contracting Parties
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.parties.map((party) => (
                    <div
                      key={party.party_id}
                      className="p-3 border border-slate-200 rounded-lg bg-white space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{party.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {party.detected_role || "Participant"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ID: {party.party_id}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Section 7 Conflict Resolution Drawer */}
              {analysis.conflicts && analysis.conflicts.length > 0 ? (
                <ConflictResolutionDrawer
                  conflicts={analysis.conflicts}
                  activeCitationId={activeCitationId}
                  onCitationClick={handleCitationClick}
                  onConflictResolved={handleConflictResolved}
                  onConflictReopened={handleConflictReopened}
                  resolvedConflicts={resolvedConflicts}
                />
              ) : (
                <Card className="border-emerald-200 bg-emerald-50/40">
                  <CardContent className="p-4 flex items-center gap-3 text-xs text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">No Conflicting Positions Detected</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Acceptance appears absolute and unqualified under Section 7 of the Indian Contract Act.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Extracted Terms with Citations */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Extracted Business Terms & Citations
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px]">
                      {terms.length} Terms Extracted
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Click any citation tag below to highlight the exact original message in the chat viewer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {terms.length > 0 ? (
                    terms.map((term) => (
                      <TermCard
                        key={term.term_id}
                        term={term}
                        activeCitationId={activeCitationId}
                        onCitationClick={handleCitationClick}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No structured terms detected yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Missing Legal Safeguards */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                    <ShieldAlert className="h-4 w-4 text-blue-600" />
                    Missing Legal Safeguards (Indian Commercial Standards)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Provisions missing in informal WhatsApp chat that must be formalized before contract execution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {analysis.missing_terms.map((missing) => (
                    <div
                      key={missing.term_id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/60 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 capitalize">
                          {missing.category.replace("_", " ")}: {missing.description}
                        </span>
                        <Badge
                          variant={missing.importance === "critical" ? "destructive" : "warning"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {missing.importance}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        <strong className="text-slate-700">Recommended Clause:</strong>{" "}
                        {missing.recommendation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Pane (5 cols): Interactive Verbatim WhatsApp Transcript */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
              <ChatMessageViewer
                messages={messages}
                activeCitationIds={activeCitationId ? [activeCitationId] : []}
                onSelectMessage={handleMessageSelect}
                title={`Verbatim WhatsApp Transcript (${currentConversation?.filename || "Source Chat"})`}
              />

              {/* Citation Guidance Tip */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1.5 shadow-sm">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Tamper-Evident Citation Linking
                </div>
                <p className="leading-relaxed text-[11px] text-blue-800">
                  Every extracted term and conflict is tied to an immutable citation ID (e.g.,{" "}
                  <code className="font-mono bg-blue-100 text-blue-900 px-1 py-0.5 rounded">msg_...</code>).
                  Tamper-evident digital verification ensures the original chat export is matched with each generated agreement clause.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Follow-up / Updated Chat Ingestion & Resolution Comparison Modal */}
      <UpdatedChatComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        currentConversation={currentConversation}
        currentAnalysis={analysis}
        onUpdateCompleted={handleUpdateCompleted}
      />
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-700">Initializing Analysis View...</p>
          </div>
        }
      >
        <AnalysisContent />
      </Suspense>
    </AuthGuard>
  );
}
