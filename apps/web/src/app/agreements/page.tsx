"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  ShieldAlert,
  Scale,
  Send,
  ArrowRight,
  ShieldCheck,
  Hash,
  Database,
  Loader2,
  ChevronDown,
  GitCompare,
  Upload,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { AgreementPreview } from "@/components/agreements/AgreementPreview";
import { ChatMessageViewer } from "@/components/chat/ChatMessageViewer";
import {
  UpdatedChatComparisonModal,
  ResolutionDiffSummary,
} from "@/components/analysis/UpdatedChatComparisonModal";
import { Agreement, Message, ConversationRecord, AgreementAnalysis, ChatUploadResponse } from "@/types";
import { api } from "@/lib/api/client";

function AgreementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agreementIdParam = searchParams.get("agreement_id") || searchParams.get("id");
  const chatIdParam = searchParams.get("chat_id");
  const analysisIdParam = searchParams.get("analysis_id");

  // Conversation & Agreement selection state
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatIdParam);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);

  // Real Agreement & Messages data
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AgreementAnalysis | null>(null);
  const [isLoadingAgreement, setIsLoadingAgreement] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive citation highlight
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);

  // Follow-up comparison state
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [resolutionBanner, setResolutionBanner] = useState<ResolutionDiffSummary | null>(null);

  // 1. Fetch conversations list
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const chatList = await api.listChats();
      setConversations(chatList);

      if (!selectedChatId && chatList.length > 0) {
        if (chatIdParam) {
          setSelectedChatId(chatIdParam);
        } else {
          setSelectedChatId(chatList[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [chatIdParam, selectedChatId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Fetch agreement and messages for selected conversation or direct agreement ID
  const loadAgreementData = useCallback(async (chatId?: string | null, agreementId?: string | null) => {
    setIsLoadingAgreement(true);
    setError(null);

    try {
      let fetchedAgreement: Agreement;

      if (agreementId) {
        fetchedAgreement = await api.getAgreement(agreementId);
      } else if (chatId) {
        fetchedAgreement = await api.getAgreementForChat(chatId);
      } else {
        setIsLoadingAgreement(false);
        return;
      }

      setAgreement(fetchedAgreement);

      // Load associated analysis
      if (fetchedAgreement.analysis_id) {
        try {
          const anData = await api.getAnalysis(fetchedAgreement.analysis_id);
          setCurrentAnalysis(anData);

          const targetChat = chatId || anData.chat_id;
          if (targetChat) {
            const chatData = await api.getConversation(targetChat);
            if (chatData.messages) {
              setMessages(chatData.messages);
            }
          }
        } catch (anErr) {
          console.warn("Could not load associated analysis details:", anErr);
        }
      }

      // Default active citation to first clause source term
      const latestVer = fetchedAgreement.versions?.[fetchedAgreement.versions.length - 1];
      if (latestVer?.clauses?.length) {
        for (const cl of latestVer.clauses) {
          if (cl.source_term_ids?.length) {
            setActiveCitationId(cl.source_term_ids[0]);
            break;
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load agreement:", err);
      setError(err?.message || "Failed to load agreement from Supabase database.");
      setAgreement(null);
      setMessages([]);
    } finally {
      setIsLoadingAgreement(false);
    }
  }, []);

  useEffect(() => {
    if (agreementIdParam) {
      loadAgreementData(null, agreementIdParam);
    } else if (selectedChatId) {
      loadAgreementData(selectedChatId, null);
    } else if (!isLoadingConversations && conversations.length === 0) {
      setIsLoadingAgreement(false);
    }
  }, [selectedChatId, agreementIdParam, loadAgreementData, isLoadingConversations, conversations.length]);

  // Handle dropdown selection change
  const handleSelectConversation = (newChatId: string) => {
    setSelectedChatId(newChatId);
    setResolutionBanner(null);

    const url = new URL(window.location.href);
    url.searchParams.set("chat_id", newChatId);
    url.searchParams.delete("agreement_id");
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url.toString());
  };

  // Callback when a follow-up chat is uploaded & verified
  const handleUpdateCompleted = async (
    newChat: ChatUploadResponse,
    newAnalysis: AgreementAnalysis,
    summary: ResolutionDiffSummary
  ) => {
    try {
      // If agreement exists, create updated version (e.g. v2.0)
      let updatedAgreement: Agreement;
      if (agreement) {
        updatedAgreement = await api.createAgreementVersion(agreement.id, newAnalysis.analysis_id);
      } else {
        const partyNames = newAnalysis.parties.map((p) => p.name);
        updatedAgreement = await api.createAgreement(newAnalysis.analysis_id, partyNames);
      }

      // Add to conversations list
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

      setSelectedChatId(newChat.chat_id);
      setAgreement(updatedAgreement);
      setMessages(newChat.messages);
      setCurrentAnalysis(newAnalysis);
      setResolutionBanner(summary);

      const url = new URL(window.location.href);
      url.searchParams.set("chat_id", newChat.chat_id);
      url.searchParams.set("agreement_id", updatedAgreement.id);
      window.history.replaceState(null, "", url.toString());
    } catch (err: any) {
      console.error("Failed to update agreement version:", err);
      alert(`Could not synthesize new version: ${err.message}`);
    }
  };

  const handleCitationClick = (citationId: string) => {
    setActiveCitationId(citationId);
  };

  const handleMessageSelect = (msg: Message) => {
    setActiveCitationId(msg.message_id);
  };

  // Current selected conversation record
  const currentConversation = conversations.find((c) => c.id === selectedChatId) || null;

  // 1. Initial Page Loading
  if (isLoadingConversations) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-700">Loading agreements from Supabase...</p>
      </div>
    );
  }

  // 2. Empty State: No chats in workspace
  if (conversations.length === 0 && !agreement) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card className="border-slate-200 shadow-sm text-center py-12 px-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            No Contract Agreements Synthesized Yet
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 max-w-md mx-auto mt-2 mb-6">
            Upload an exported WhatsApp business negotiation to analyze commercial terms and generate an enforceable draft contract with two-party confirmation.
          </CardDescription>
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Link href="/upload">
              <Upload className="h-4 w-4" /> Ingest WhatsApp Negotiation
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const currentVersion = agreement?.versions?.[agreement.versions.length - 1];
  const contentHash = currentVersion?.content_hash || "";
  const partiesLabel = agreement?.parties?.length ? agreement.parties.join(" and ") : "Contracting Counterparties";
  const confirmationHref = agreement
    ? `/confirmations?agreement_id=${encodeURIComponent(agreement.id)}`
    : "/confirmations";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 max-w-7xl">
      {/* Top Negotiation Selection Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <label htmlFor="agreements-chat-select" className="text-xs font-bold text-slate-700 shrink-0">
            Select Negotiation:
          </label>
          <div className="relative flex-1 max-w-md">
            <select
              id="agreements-chat-select"
              value={selectedChatId || ""}
              onChange={(e) => handleSelectConversation(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none truncate"
            >
              {conversations.map((conv) => {
                const partiesText =
                  conv.party_names && conv.party_names.length > 0
                    ? conv.party_names.join(" & ")
                    : "Unassigned Counterparties";
                return (
                  <option key={conv.id} value={conv.id}>
                    {partiesText} — {conv.filename} ({conv.message_count} msgs)
                  </option>
                );
              })}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <Badge variant="outline" className="text-[11px] font-mono text-slate-500 shrink-0 hidden sm:inline-flex">
            {conversations.length} {conversations.length === 1 ? "Record" : "Records"}
          </Badge>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(true)}
            disabled={isLoadingAgreement}
            className="gap-2 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
            title="Upload updated chat to check if previous open issues are resolved and create new version"
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

      {/* Resolution Diff Banner */}
      {resolutionBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-emerald-950 text-sm">
                Follow-up Chat Verified: Agreement Draft Updated to v{currentVersion?.version_number || agreement?.current_version}.0
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
              <p className="font-semibold">Resolved in this updated version:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {resolutionBanner.resolvedConflicts.map((c) => (
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
              onClick={() => loadAgreementData(selectedChatId)}
              className="border-red-300 text-red-800 text-xs h-8"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingAgreement ? (
        <div className="space-y-6 py-6 animate-pulse">
          <div className="h-10 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-64 bg-slate-100 rounded-xl" />
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
            <div className="lg:col-span-5 h-96 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ) : agreement ? (
        <>
          {/* Main Agreement Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Generated Agreement Draft
                </h1>
                <Badge
                  variant="outline"
                  className="border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold text-xs flex items-center gap-1"
                >
                  <Database className="h-3 w-3" />
                  Live Version v{currentVersion?.version_number || agreement.current_version}.0
                </Badge>
                {agreement.versions.length > 1 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {agreement.versions.length} Versions Recorded
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Synthesized plain-language term sheet derived from verified WhatsApp negotiation between{" "}
                <strong className="text-slate-800">{partiesLabel}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {contentHash && (
                <Badge variant="outline" className="border-slate-300 text-xs font-mono">
                  Hash: {contentHash.slice(0, 10)}...
                </Badge>
              )}

              <a href={api.getAgreementPdfUrl(agreement.id)} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2 text-xs h-9">
                  <Download className="h-4 w-4" /> Export Plain-Text / PDF
                </Button>
              </a>

              <Link href={confirmationHref}>
                <Button size="sm" className="gap-2 text-xs font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 text-white h-9">
                  <Send className="h-4 w-4" />
                  Proceed to Two-Party Confirmation
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stamp Duty Notice */}
          <div className="border border-amber-300 bg-amber-50/90 rounded-xl p-4 text-xs text-amber-900 space-y-1.5 shadow-sm">
            <div className="font-bold flex items-center gap-2 text-amber-950 text-sm">
              <Scale className="h-4 w-4 text-amber-700" />
              Statutory Legal Notice — Stamp Duty & Contractual Enforceability
            </div>
            <p className="leading-relaxed text-[11px] text-amber-800">
              This generated document represents a <strong>plain-language synthesis and term sheet</strong> constructed from informal communications.
              It is <strong>not</strong> an executed legal deed and has not paid Indian stamp duty under the <strong>Indian Stamp Act, 1899</strong>.
              To achieve full statutory enforceability in court, commercial agreements in India must be formally stamped with applicable duty, executed by authorized signatories, and optionally notarized or executed via a licensed Certifying Authority (CCA) eSign under Section 3/3A of the Information Technology Act, 2000.
            </p>
          </div>

          {/* Split Pane: Agreement Document (Left) & Chat Evidence Transcript (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Pane (7 cols): Agreement Clauses */}
            <div className="lg:col-span-7 space-y-6">
              <AgreementPreview
                activeCitationId={activeCitationId}
                onCitationClick={handleCitationClick}
                agreement={agreement}
              />

              {/* Cryptographic Audit Record Card */}
              <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-blue-600" />
                    Cryptographic Audit Record & Tamper Evidence
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 text-[11px] text-slate-600 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block">Conversation UUID:</span>
                      <span className="text-slate-800 break-all font-semibold">
                        {currentConversation?.id || selectedChatId || "Recorded in Supabase"}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-slate-400 block">Agreement Draft Hash:</span>
                      <span className="text-slate-800 break-all font-semibold">
                        {contentHash || "Computed upon finalization"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Guaranteed append-only audit trail enforcing DPDP Act 2023 compliance and Section 65B Indian Evidence Act admissibility.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Pane (5 cols): Verbatim WhatsApp Transcript */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
              <ChatMessageViewer
                messages={messages}
                activeCitationIds={activeCitationId ? [activeCitationId] : []}
                onSelectMessage={handleMessageSelect}
                title={`Chat Citation Evidence (${currentConversation?.filename || "Source Chat"})`}
              />

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1.5 shadow-2xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Two-Party Confirmation Status
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  When both counterparties confirm this draft via token-authenticated review links, an immutable Section 65B digital evidence certificate will be generated and signed.
                </p>
                <div className="pt-1">
                  <Button variant="outline" size="sm" asChild className="w-full text-xs h-8 text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100">
                    <Link href={confirmationHref}>
                      Manage Counterparty Confirmation Links
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Follow-up / Updated Chat Verification Modal */}
      <UpdatedChatComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        currentConversation={currentConversation}
        currentAnalysis={currentAnalysis}
        onUpdateCompleted={handleUpdateCompleted}
      />
    </div>
  );
}

export default function AgreementsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700">Loading Agreement Draft...</p>
        </div>
      }
    >
      <AgreementsContent />
    </Suspense>
  );
}
