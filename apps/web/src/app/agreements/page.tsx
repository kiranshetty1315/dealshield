"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Award,
  UserCheck,
  Building2,
} from "lucide-react";
import { AgreementPreview } from "@/components/agreements/AgreementPreview";
import { ChatMessageViewer } from "@/components/chat/ChatMessageViewer";
import {
  UpdatedChatComparisonModal,
  ResolutionDiffSummary,
} from "@/components/analysis/UpdatedChatComparisonModal";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { StampPaperModal } from "@/components/agreements/StampPaperModal";
import { NegotiationSelector } from "@/components/chat/NegotiationSelector";
import { Agreement, Message, ConversationRecord, AgreementAnalysis, ChatUploadResponse, ConfirmationStatus } from "@/types";
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
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(null);
  const [isLoadingAgreement, setIsLoadingAgreement] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive citation highlight
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);

  // Follow-up comparison state
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [resolutionBanner, setResolutionBanner] = useState<ResolutionDiffSummary | null>(null);

  // Indian Non-Judicial Stamp Paper Modal
  const [isStampModalOpen, setIsStampModalOpen] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const { user } = useAuth();

  // Contracting Legal Parties state
  const [initiatorName, setInitiatorName] = useState<string>("");
  const [initiatorCompany, setInitiatorCompany] = useState<string>("");
  const [clientLegalName, setClientLegalName] = useState<string>("");
  const [clientCompany, setClientCompany] = useState<string>("");
  const [isSavingParties, setIsSavingParties] = useState<boolean>(false);
  const [partySaveFeedback, setPartySaveFeedback] = useState<string | null>(null);
  const [partySaveError, setPartySaveError] = useState<string | null>(null);

  // Sync initial user info from auth if empty
  useEffect(() => {
    if (user?.full_name && !initiatorName) {
      setInitiatorName(user.full_name);
      if (user.organization && !initiatorCompany) {
        setInitiatorCompany(user.organization);
      }
    }
  }, [user, initiatorName, initiatorCompany]);

  const handleDownloadPdf = async () => {
    if (!agreement?.id) return;
    setIsDownloadingPdf(true);
    try {
      await api.downloadAgreementPdf(agreement.id);
    } catch (err: any) {
      alert(err?.message || "Failed to download agreement PDF");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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

      // Populate legal parties inputs from agreement or user signup
      if (fetchedAgreement.parties && fetchedAgreement.parties.length > 0) {
        const rawP1 = fetchedAgreement.parties[0];
        if (rawP1 && !["you", "user", "me", "client", "first party (initiator)"].includes(rawP1.trim().toLowerCase())) {
          const match = rawP1.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            setInitiatorName(match[1].trim());
            setInitiatorCompany(match[2].trim());
          } else {
            setInitiatorName(rawP1.trim());
          }
        } else if (user?.full_name) {
          setInitiatorName(user.full_name);
          if (user.organization) setInitiatorCompany(user.organization);
        }

        if (fetchedAgreement.parties.length > 1) {
          const rawP2 = fetchedAgreement.parties[1];
          if (rawP2 && !["counterparty", "second party (counterparty)"].includes(rawP2.trim().toLowerCase())) {
            const match2 = rawP2.match(/^(.*?)\s*\((.*?)\)$/);
            if (match2) {
              setClientLegalName(match2[1].trim());
              setClientCompany(match2[2].trim());
            } else {
              setClientLegalName(rawP2.trim());
            }
          }
        }
      } else if (user?.full_name) {
        setInitiatorName(user.full_name);
        if (user.organization) setInitiatorCompany(user.organization);
      }

      // Load confirmation status
      api.getConfirmationStatus(fetchedAgreement.id)
        .then(setConfirmationStatus)
        .catch(() => null);

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
      setError(err?.message || "Failed to load agreement. Please try again.");
      setAgreement(null);
      setMessages([]);
      setConfirmationStatus(null);
    } finally {
      setIsLoadingAgreement(false);
    }
  }, [user?.full_name, user?.organization]);

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

      api.getConfirmationStatus(updatedAgreement.id)
        .then(setConfirmationStatus)
        .catch(() => null);

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


  const handleSaveParties = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!agreement?.id) return;
    if (!initiatorName.trim()) {
      setPartySaveError("Please enter the Initiator Legal Name.");
      return;
    }
    if (!clientLegalName.trim()) {
      setPartySaveError("Please enter the Client Legal Name (same as Aadhaar).");
      return;
    }

    setIsSavingParties(true);
    setPartySaveError(null);
    setPartySaveFeedback(null);

    try {
      const updatedAgreement = await api.updateAgreementParties(agreement.id, {
        initiator_name: initiatorName.trim(),
        initiator_company: initiatorCompany.trim() || undefined,
        client_legal_name: clientLegalName.trim(),
        client_company: clientCompany.trim() || undefined,
      });

      setAgreement(updatedAgreement);
      setPartySaveFeedback("Legal contracting parties updated successfully! Plain-language clauses, confirmation links, and PDF have been updated with verified names.");
      api.getConfirmationStatus(updatedAgreement.id)
        .then(setConfirmationStatus)
        .catch(() => null);

      setTimeout(() => setPartySaveFeedback(null), 6000);
    } catch (err: any) {
      console.error("Failed to update parties:", err);
      setPartySaveError(err?.message || "Failed to update legal parties.");
    } finally {
      setIsSavingParties(false);
    }
  };

  // Current selected conversation record
  const currentConversation = conversations.find((c) => c.id === selectedChatId) || null;

  // 1. Initial Page Loading
  if (isLoadingConversations) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-700">Loading agreements. Please wait...</p>
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
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <NegotiationSelector
          conversations={conversations}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectConversation}
          isLoading={isLoadingConversations}
        />

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

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStampModalOpen(true)}
                className="gap-2 text-xs h-9 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
              >
                <Award className="h-4 w-4 text-amber-600" /> Preview Agreement
              </Button>

              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="gap-2 text-xs h-9 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> Download Agreement PDF
                  </>
                )}
              </Button>

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

          {/* Decline Warning Alert */}
          {confirmationStatus?.parties?.some((p) => p.declined) && (
            <div className="bg-rose-50 border border-rose-300 p-4 rounded-xl space-y-2">
              <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Agreement Terms Declined by Counterparty
              </span>
              {confirmationStatus.parties
                .filter((p) => p.declined)
                .map((p) => (
                  <div key={p.party_name} className="text-xs text-rose-800 space-y-1">
                    <p>
                      <strong>{p.party_name}</strong> declined to confirm this commercial agreement.
                    </p>
                    {p.decline_reason && (
                      <p className="italic bg-white/80 p-2.5 rounded border border-rose-200 text-rose-950">
                        <strong>Reason for Decline:</strong> &ldquo;{p.decline_reason}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Contracting Legal Parties & Signatories Form Card */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 shadow-xs">
            <CardHeader className="pb-3 border-b border-blue-100/70">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                      Contracting Legal Parties &amp; Signatories
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Specify verified legal identity as per Aadhaar &amp; business entities. Replaces informal chat aliases (&quot;You&quot;) across all contract clauses, confirmation review links, and the final PDF.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 text-xs font-semibold self-start sm:self-auto shrink-0">
                  Aadhaar &amp; Legal Entity Alignment
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleSaveParties} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 1: Initiator (First Party / You) */}
                  <div className="p-3.5 rounded-xl border border-blue-200/80 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        First Party (Initiator / You)
                      </span>
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                        From User Signup
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="initiator-legal-name" className="text-[11px] font-semibold text-slate-700">
                        Initiator Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="initiator-legal-name"
                        type="text"
                        required
                        placeholder="Your full legal name as given at signup"
                        value={initiatorName}
                        onChange={(e) => setInitiatorName(e.target.value)}
                        className="h-9 text-xs font-medium"
                      />
                      <p className="text-[10px] text-slate-400">Prefilled from your account profile. Used in place of &quot;You&quot;.</p>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="initiator-company" className="text-[11px] font-semibold text-slate-700">
                        Company / Business Entity (Optional)
                      </label>
                      <Input
                        id="initiator-company"
                        type="text"
                        placeholder="e.g. Acme Tech Solutions"
                        value={initiatorCompany}
                        onChange={(e) => setInitiatorCompany(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Column 2: Counterparty (Client / Second Party) */}
                  <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-indigo-600" />
                        Second Party (Client / Counterparty)
                      </span>
                      <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Aadhaar &amp; Company
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="client-legal-name" className="text-[11px] font-semibold text-slate-700">
                        Client Legal Name (same as Aadhaar) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        id="client-legal-name"
                        type="text"
                        required
                        placeholder="e.g. Rajesh Kumar (as per Aadhaar)"
                        value={clientLegalName}
                        onChange={(e) => setClientLegalName(e.target.value)}
                        className="h-9 text-xs font-medium"
                      />
                      <p className="text-[10px] text-slate-400">Exact legal name for statutory contract validity under Indian law.</p>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="client-company" className="text-[11px] font-semibold text-slate-700">
                        Client Company Name (Optional)
                      </label>
                      <Input
                        id="client-company"
                        type="text"
                        placeholder="e.g. TechCorp Solutions Pvt Ltd"
                        value={clientCompany}
                        onChange={(e) => setClientCompany(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Feedback Messages */}
                {partySaveFeedback && (
                  <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{partySaveFeedback}</span>
                  </div>
                )}
                {partySaveError && (
                  <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 text-xs text-rose-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{partySaveError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isSavingParties || !initiatorName.trim() || !clientLegalName.trim()}
                    className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 shadow-xs"
                  >
                    {isSavingParties ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Parties...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> Save &amp; Apply Legal Names
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Split Pane: Agreement Document (Left) & Chat Evidence Transcript (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Pane (7 cols): Agreement Clauses */}
            <div className="lg:col-span-7 space-y-6">
              <AgreementPreview
                activeCitationId={activeCitationId}
                onCitationClick={handleCitationClick}
                agreement={agreement}
                confirmationStatus={confirmationStatus}
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
                      <span className="text-slate-400 block">Conversation ID:</span>
                      <span className="text-slate-800 break-all font-semibold">
                        {currentConversation?.id || selectedChatId || "Recorded & Verified"}
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
                    Guaranteed append-only audit trail enforcing DPDP Act 2023 compliance and cryptographic tamper-evident integrity.
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
                  When both counterparties confirm this draft via email-OTP authenticated review links, an immutable cryptographic Certificate of Assent will be recorded.
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

      {/* Indian Non-Judicial Stamp Paper Modal */}
      {agreement && (
        <StampPaperModal
          isOpen={isStampModalOpen}
          onClose={() => setIsStampModalOpen(false)}
          agreement={agreement}
          confirmationStatus={confirmationStatus}
        />
      )}
    </div>
  );
}

export default function AgreementsPage() {
  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
