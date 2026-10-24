"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Send,
  Loader2,
  Database,
  Sparkles,
  Trash2,
  Share2,
  Copy,
  Check,
  Link2,
  ChevronDown,
  Upload,
  GitCompare,
  Info,
  RefreshCw,
  Award,
  Download,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api/client";
import {
  ConfirmationStatus,
  Agreement,
  PartyConfirmationRecord,
  ConversationRecord,
  AgreementAnalysis,
  ChatUploadResponse,
} from "@/types";
import {
  UpdatedChatComparisonModal,
  ResolutionDiffSummary,
} from "@/components/analysis/UpdatedChatComparisonModal";
import { StampPaperModal } from "@/components/agreements/StampPaperModal";

function formatAssentDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Pending formal record";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
    return `${month} ${day}, ${year}, ${formattedHours}:${minutes} ${ampm} UTC`;
  } catch {
    return dateStr;
  }
}

function ConfirmationsContent() {
  const searchParams = useSearchParams();
  const agreementIdParam = searchParams.get("agreement_id");
  const chatIdParam = searchParams.get("chat_id");
  const tokenParam = searchParams.get("token");

  // Negotiations / Conversations list
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(chatIdParam);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Active Agreement & Confirmation Data
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AgreementAnalysis | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Token testing state
  const [tokenInput, setTokenInput] = useState(tokenParam || "");
  const [tokenNotes, setTokenNotes] = useState("");
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shareable link state
  const [shareableLink, setShareableLink] = useState<{ partyName: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState<string | null>(null);

  // Follow-up Chat Comparison Modal
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [resolutionBanner, setResolutionBanner] = useState<ResolutionDiffSummary | null>(null);

  // Indian Non-Judicial Stamp Paper Modal
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);

  // 1. Load all conversations on mount
  useEffect(() => {
    async function fetchConversations() {
      setIsLoadingConversations(true);
      try {
        const chats = await api.listChats();
        setConversations(chats);

        if (!selectedChatId && !agreementIdParam && chats.length > 0) {
          setSelectedChatId(chats[0].id);
        }
      } catch (err) {
        console.warn("Could not list conversations:", err);
      } finally {
        setIsLoadingConversations(false);
      }
    }
    fetchConversations();
  }, [selectedChatId, agreementIdParam]);

  // 2. Load Agreement, Confirmations & Analysis for selected negotiation
  const refreshStatus = useCallback(async (targetAgreementId: string) => {
    try {
      const [statusData, agData] = await Promise.all([
        api.getConfirmationStatus(targetAgreementId).catch(() => null),
        api.getAgreement(targetAgreementId).catch(() => null),
      ]);
      if (statusData) setConfirmationStatus(statusData);
      if (agData) {
        setAgreement(agData);
        if (agData.analysis_id) {
          api.getAnalysis(agData.analysis_id)
            .then(setCurrentAnalysis)
            .catch(() => null);
        }
      }
    } catch (e) {
      console.warn("Could not fetch confirmation status:", e);
    }
  }, []);

  const loadDataForSelection = useCallback(
    async (chatId: string | null, agreementId: string | null) => {
      setIsLoadingStatus(true);
      setErrorMessage(null);
      try {
        let activeAg: Agreement;
        if (agreementId) {
          activeAg = await api.getAgreement(agreementId);
        } else if (chatId) {
          activeAg = await api.getAgreementForChat(chatId);
        } else {
          setIsLoadingStatus(false);
          return;
        }

        setAgreement(activeAg);

        // Fetch associated confirmation records & analysis
        const [statusData, analysisData] = await Promise.all([
          api.getConfirmationStatus(activeAg.id).catch(() => null),
          activeAg.analysis_id ? api.getAnalysis(activeAg.analysis_id).catch(() => null) : null,
        ]);

        if (statusData) setConfirmationStatus(statusData);
        if (analysisData) setCurrentAnalysis(analysisData);
      } catch (err: any) {
        console.error("Failed to load confirmations for agreement:", err);
        setErrorMessage(err?.message || "Failed to load agreement confirmations from Supabase.");
        setAgreement(null);
        setConfirmationStatus(null);
      } finally {
        setIsLoadingStatus(false);
      }
    },
    []
  );

  useEffect(() => {
    if (agreementIdParam) {
      loadDataForSelection(null, agreementIdParam);
    } else if (selectedChatId) {
      loadDataForSelection(selectedChatId, null);
    } else if (!isLoadingConversations && conversations.length === 0) {
      setIsLoadingStatus(false);
    }
  }, [selectedChatId, agreementIdParam, loadDataForSelection, isLoadingConversations, conversations.length]);

  useEffect(() => {
    if (tokenParam) {
      setTokenInput(tokenParam);
    }
  }, [tokenParam]);

  // Live Auto-Polling: periodically re-checks Supabase so external counterparty assent reflects in real-time
  useEffect(() => {
    if (!agreement?.id) return;
    if (confirmationStatus?.all_confirmed) return;

    const interval = setInterval(() => {
      refreshStatus(agreement.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [agreement?.id, confirmationStatus?.all_confirmed, refreshStatus]);

  // Cross-Tab & Visibility Sync: instantly updates sender view when counterparty confirms in another tab/window
  useEffect(() => {
    const handleStorageBroadcast = (e: StorageEvent) => {
      if (e.key === "dealshield_confirmation_broadcast" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (agreement?.id && payload.agreementId === agreement.id) {
            refreshStatus(agreement.id);
            setFeedbackMessage(
              `Live assent received: ${payload.partyName} has formally ${
                payload.status === "confirmed" ? "confirmed" : "declined"
              } the agreement terms.`
            );
          }
        } catch {
          // ignore parsing error
        }
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("dealshield_confirmations");
      channel.onmessage = (event) => {
        if (
          agreement?.id &&
          event.data?.type === "CONFIRMATION_UPDATED" &&
          event.data?.agreementId === agreement.id
        ) {
          refreshStatus(agreement.id);
          setFeedbackMessage(
            `Live assent received: ${event.data.partyName} has formally ${
              event.data.status === "confirmed" ? "confirmed" : "declined"
            } the agreement terms.`
          );
        }
      };
    } catch {
      // BroadcastChannel optional fallback
    }

    window.addEventListener("storage", handleStorageBroadcast);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && agreement?.id) {
        refreshStatus(agreement.id);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorageBroadcast);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) channel.close();
    };
  }, [agreement?.id, refreshStatus]);

  // Handle switching negotiation
  const handleSelectConversation = (chatId: string) => {
    setSelectedChatId(chatId);
    setResolutionBanner(null);
    setShareableLink(null);
    setFeedbackMessage(null);
    setErrorMessage(null);

    const url = new URL(window.location.href);
    url.searchParams.set("chat_id", chatId);
    url.searchParams.delete("agreement_id");
    url.searchParams.delete("token");
    window.history.replaceState(null, "", url.toString());
  };

  // Direct confirm on behalf of party
  const handleConfirmAsParty = async (partyName: string) => {
    if (!agreement) return;
    setActionLoading(partyName);
    setFeedbackMessage(null);
    setErrorMessage(null);
    try {
      const updatedStatus = await api.submitConfirmation(
        agreement.id,
        partyName,
        true,
        `Direct dashboard confirmation by ${partyName}`
      );
      setConfirmationStatus(updatedStatus);
      await refreshStatus(agreement.id);
      setFeedbackMessage(`Successfully recorded formal assent for ${partyName} in database.`);
    } catch (err: any) {
      setErrorMessage(`Confirmation failed: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Generate single-use signed link for external counterparty
  const handleGenerateShareableToken = async (partyName: string) => {
    if (!agreement) return;
    setIsGeneratingToken(partyName);
    setCopied(false);
    setErrorMessage(null);
    try {
      const res = await api.generatePartyToken(agreement.id, partyName);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}/review?token=${res.token}&agreement_id=${encodeURIComponent(agreement.id)}`;
      setShareableLink({ partyName, url: fullUrl });
      setTokenInput(res.token);
    } catch (err: any) {
      setErrorMessage(`Failed to generate token: ${err.message || err}`);
    } finally {
      setIsGeneratingToken(null);
    }
  };

  const handleCopyLink = () => {
    if (shareableLink?.url) {
      navigator.clipboard.writeText(shareableLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Execute token confirmation directly
  const handleExecuteToken = async () => {
    if (!tokenInput.trim()) return;

    setActionLoading("token");
    setTokenResult(null);
    setTokenError(null);
    try {
      const res = await api.confirmByToken(tokenInput.trim(), tokenNotes || undefined);
      setTokenResult(`Success: Agreement confirmed by ${res.party_name}!`);
      if (res.agreement_id) {
        await refreshStatus(res.agreement_id);
      } else if (agreement) {
        await refreshStatus(agreement.id);
      }
    } catch (err: any) {
      setTokenError(err.message || "Failed to confirm via token");
    } finally {
      setActionLoading(null);
    }
  };

  // Callback when a follow-up chat is uploaded & verified
  const handleUpdateCompleted = async (
    newChat: ChatUploadResponse,
    newAnalysis: AgreementAnalysis,
    summary: ResolutionDiffSummary
  ) => {
    try {
      let updatedAgreement: Agreement;
      if (agreement) {
        updatedAgreement = await api.createAgreementVersion(agreement.id, newAnalysis.analysis_id);
      } else {
        const partyNames = newAnalysis.parties.map((p) => p.name);
        updatedAgreement = await api.createAgreement(newAnalysis.analysis_id, partyNames);
      }

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
      setCurrentAnalysis(newAnalysis);
      setResolutionBanner(summary);
      setIsComparisonModalOpen(false);

      // Refresh confirmation records for new version
      await refreshStatus(updatedAgreement.id);
    } catch (err: any) {
      console.error("Failed to update agreement version:", err);
      alert(`Could not synthesize new version: ${err.message}`);
    }
  };

  // 1. Initial Page Loading
  if (isLoadingConversations) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-700">Loading negotiations from Supabase...</p>
      </div>
    );
  }

  // 2. Empty State: No chats in workspace
  if (conversations.length === 0 && !agreement) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Card className="border-slate-200 shadow-sm text-center py-12 px-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Users className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            No Negotiated Agreements Found
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 max-w-md mx-auto mt-2 mb-6">
            Upload an exported WhatsApp negotiation to analyze mutual terms, synthesize an enforceable agreement, and collect two-party confirmations under Section 7 of the Indian Contract Act.
          </CardDescription>
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Link href="/upload">
              <Upload className="h-4 w-4" /> Upload First Negotiation
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Deduplicate and assemble parties from confirmationStatus or agreement
  const rawParties = confirmationStatus?.parties && confirmationStatus.parties.length > 0
    ? confirmationStatus.parties
    : (agreement?.parties || []).map((name) => ({
        party_name: name,
        confirmed: false,
      }));

  const partiesMap = new Map<string, PartyConfirmationRecord>();
  for (const p of rawParties) {
    if (!partiesMap.has(p.party_name) || (p.confirmed && !partiesMap.get(p.party_name)?.confirmed)) {
      partiesMap.set(p.party_name, p);
    }
  }
  const partiesList = Array.from(partiesMap.values());

  const isAllConfirmed = confirmationStatus
    ? confirmationStatus.all_confirmed
    : partiesList.length > 0 && partiesList.every((p) => p.confirmed);

  const confirmedCount = partiesList.filter((p) => p.confirmed).length;
  const totalCount = partiesList.length;
  const unconfirmedParty = partiesList.find((p) => !p.confirmed);

  const currentConversation = conversations.find((c) => c.id === selectedChatId) || null;
  const latestVersion = agreement?.versions?.[agreement.versions.length - 1];

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      {/* Top Header & Negotiation Selector */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-extrabold text-slate-900">Two-Party Agreement Confirmation</h1>
            {agreement && (
              <Badge
                variant="outline"
                className="border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-1 text-xs"
              >
                <Database className="h-3 w-3" />
                Live Agreement ({agreement.id.slice(0, 8)}...)
              </Badge>
            )}
            {agreement && !isAllConfirmed && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live sync active (auto-checks every 3s)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Both negotiating parties must independently review and formally assent to synthesize an enforceable commercial contract under Section 7 of the Indian Contract Act, 1872.
          </p>
        </div>

        {/* Negotiation Selection Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <label htmlFor="confirmations-chat-select" className="text-xs font-bold text-slate-700 shrink-0">
              Select Negotiation:
            </label>
            <div className="relative flex-1 max-w-md">
              <select
                id="confirmations-chat-select"
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
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => agreement?.id && refreshStatus(agreement.id)}
              disabled={isLoadingStatus || !agreement?.id}
              className="gap-1.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              title="Force re-fetch confirmation status from database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingStatus ? "animate-spin" : ""}`} />
              <span>Refresh Status</span>
            </Button>

            {agreement && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStampModalOpen(true)}
                className="gap-1.5 text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                title="Preview authentic Indian Non-Judicial Stamp Paper contract"
              >
                <Award className="h-3.5 w-3.5 text-amber-600" />
                <span>e-Stamp Contract</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComparisonModalOpen(true)}
              disabled={isLoadingStatus}
              className="gap-2 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              title="Upload updated chat to check if previous open issues are resolved and update confirmations"
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
      </div>

      {/* Resolution Diff Banner from Follow-up Chat */}
      {resolutionBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-emerald-950 text-sm">
                Follow-up Chat Verified: Agreement Draft Updated to v{latestVersion?.version_number || agreement?.current_version}.0
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

      {/* External Counterparty Review Banner if arriving via token */}
      {tokenParam && (
        <Card className="border-blue-300 bg-blue-50/80 shadow-md animate-in fade-in duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950">
                    External Counterparty Review Mode
                  </h3>
                  <p className="text-xs text-blue-800">
                    You are reviewing this agreement via a secure, single-use signed link. No account creation is required.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-blue-400 bg-white text-blue-900 text-[11px] font-semibold">
                Single-Use Token Active
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-xs text-blue-900 font-medium">
                Clicking confirm records your assent with a tamper-evident audit timestamp.
              </span>
              <Button
                size="sm"
                onClick={handleExecuteToken}
                disabled={actionLoading === "token" || isAllConfirmed}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                {actionLoading === "token" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Recording Assent...
                  </>
                ) : isAllConfirmed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Agreement Already Confirmed
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    I Agree & Confirm Agreement
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Status Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Mutual Assent Status (Section 7 ICA, 1872)
              </CardTitle>
              <CardDescription className="text-xs">
                Under Indian contract law, acceptance must be absolute and unqualified to create a legally binding agreement.
              </CardDescription>
            </div>

            <Badge
              variant={isAllConfirmed ? "default" : "outline"}
              className={isAllConfirmed ? "bg-emerald-600 text-white text-xs" : "border-amber-400 bg-amber-50 text-amber-800 text-xs font-bold"}
            >
              {isAllConfirmed ? "100% Fully Confirmed" : `${confirmedCount}/${totalCount} Parties Assented`}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {isLoadingStatus && (
            <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Loading party confirmation records...
            </div>
          )}

          {feedbackMessage && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{feedbackMessage}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive" className="text-xs">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Parties Confirmation Grid */}
          {!isLoadingStatus && partiesList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl">
              No parties identified for this agreement yet. Please generate a draft agreement from the Agreements tab.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partiesList.map((party, idx) => {
                const isDeclined = Boolean(party.declined);
                const isConfirmed = Boolean(party.confirmed);

                return (
                  <div
                    key={`${party.party_name}-${idx}`}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isConfirmed
                        ? "border-emerald-200 bg-emerald-50/50"
                        : isDeclined
                        ? "border-rose-200 bg-rose-50/50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isConfirmed
                              ? "bg-emerald-600 text-white"
                              : isDeclined
                              ? "bg-rose-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {party.party_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{party.party_name}</p>
                          <p className="text-[10px] text-slate-500">
                            {isConfirmed
                              ? "Assent Formally Recorded"
                              : isDeclined
                              ? "Terms Declined by Party"
                              : "Awaiting Acceptance"}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={isConfirmed ? "default" : isDeclined ? "destructive" : "outline"}
                        className={
                          isConfirmed
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                            : isDeclined
                            ? "bg-rose-100 text-rose-800 border-rose-300 text-[10px]"
                            : "text-slate-500 text-[10px]"
                        }
                      >
                        {isConfirmed ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Confirmed
                          </span>
                        ) : isDeclined ? (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Declined
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Awaiting Assent
                          </span>
                        )}
                      </Badge>
                    </div>

                    <p suppressHydrationWarning className="text-xs text-slate-600">
                      {isConfirmed
                        ? `Confirmed terms on ${formatAssentDate(party.confirmed_at)}.`
                        : isDeclined
                        ? `Declined terms on ${formatAssentDate(party.declined_at)}.`
                        : "Review link ready. Waiting for formal counterparty acceptance."}
                    </p>

                    {party.decline_reason && (
                      <div className="bg-rose-100/60 p-2.5 rounded border border-rose-200 text-xs text-rose-900 space-y-0.5">
                        <span className="font-bold block text-[10px] uppercase text-rose-800">
                          Reason for Decline:
                        </span>
                        <p className="italic">&ldquo;{party.decline_reason}&rdquo;</p>
                      </div>
                    )}

                    {party.notes && !party.decline_reason && (
                      <p className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded border border-slate-200">
                        &ldquo;{party.notes}&rdquo;
                      </p>
                    )}

                    {/* Actions when party has NOT confirmed */}
                    {!party.confirmed ? (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirmAsParty(party.party_name)}
                            disabled={actionLoading !== null}
                            className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                          >
                            {actionLoading === party.party_name ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Recording...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Direct Confirm
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateShareableToken(party.party_name)}
                            disabled={isGeneratingToken !== null}
                            className="w-full text-xs font-semibold border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5"
                          >
                            {isGeneratingToken === party.party_name ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Share2 className="h-3.5 w-3.5" />
                                Share Token Link
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Expandable Shareable Token Box */}
                        {shareableLink?.partyName === party.party_name && (
                          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg space-y-2 animate-in fade-in duration-150 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-blue-950 flex items-center gap-1">
                                <Link2 className="h-3.5 w-3.5 text-blue-700" />
                                Shareable Counterparty Link
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyLink}
                                className="h-6 text-[10px] px-2.5 bg-white gap-1 border-blue-300 text-blue-800 hover:bg-blue-100"
                              >
                                {copied ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                            </div>
                            <Input
                              readOnly
                              value={shareableLink.url}
                              className="text-[10px] font-mono h-7 bg-white text-slate-800"
                            />
                            <p className="text-[10px] text-blue-800 leading-normal">
                              Share this link with {party.party_name} via WhatsApp or email. They can review and click &ldquo;Agree&rdquo; in 1 click without creating an account.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1 pt-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Assent Cryptographically Logged in Audit Trail
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Fully Confirmed Celebration Banner */}
          {isAllConfirmed && (
            <div className="space-y-3">
              <div className="border border-emerald-300 bg-emerald-50 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold text-emerald-950 text-sm">
                      Agreement Fully Confirmed by Both Parties!
                    </span>
                  </div>
                  {agreement && (
                    <Link href={`/evidence?entity_id=${encodeURIComponent(agreement.id)}`}>
                      <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Inspect Section 65B Evidence Vault
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-xs text-emerald-800">
                  Both parties have unconditionally assented under Section 7 of the Indian Contract Act. An immutable SHA-256 digital certificate is preserved in the evidence repository.
                </p>
              </div>

              {/* Official Non-Judicial e-Stamp Download & Client Sharing Banner */}
              {agreement && (
                <div className="border border-amber-300 bg-amber-50/90 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Award className="h-4 w-4 text-amber-700 shrink-0" />
                      <span className="font-bold text-amber-950 text-sm">
                        Official Non-Judicial e-Stamp Contract (PDF)
                      </span>
                      <Badge className="bg-amber-200 text-amber-900 border-amber-400 text-[10px] font-semibold">
                        ₹ 100 Non-Judicial e-Stamp
                      </Badge>
                    </div>
                    <p className="text-amber-900 text-[11px] leading-relaxed">
                      The commercial contract is finalized with two-party mutual assent under Section 10A IT Act, 2000. Download the official Indian Stamp Paper PDF format to share directly with your client or counterparty.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsStampModalOpen(true)}
                      className="text-xs gap-1.5 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
                    >
                      <Eye className="h-3.5 w-3.5 text-amber-700" />
                      <span>Preview Stamp Deed</span>
                    </Button>

                    <Button
                      size="sm"
                      asChild
                      className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs"
                    >
                      <a href={api.getAgreementPdfUrl(agreement.id)} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Stamp PDF</span>
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {/* DPDP Act Message Erasure Option */}
              <div className="border border-blue-200 bg-blue-50/70 p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4 text-blue-700" />
                    Agreement Finalized? Exercise DPDP Act Right to Erasure
                  </span>
                  <p className="text-blue-800 text-[11px]">
                    Now that all obligations are formalized into the executed agreement, you can permanently erase underlying WhatsApp chat messages from the database.
                  </p>
                </div>
                <Link href="/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    Manage & Erase Messages
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="border-t pt-4 text-xs text-slate-500">
            <strong>Rule:</strong> The agreement becomes effective only once both parties record mutual, unqualified assent without pending objections.
          </div>
        </CardContent>
      </Card>

      {/* Testable Single-Use Token Confirmation Box */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <KeyRound className="h-4 w-4 text-blue-600" />
                Test Counterparty Single-Use Signed Token Link
              </CardTitle>
              <CardDescription className="text-xs">
                External counterparties receive a unique token link to confirm without creating an account. Test token execution live below.
              </CardDescription>
            </div>

            {unconfirmedParty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateShareableToken(unconfirmedParty.party_name)}
                className="text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Generate Token for {unconfirmedParty.party_name}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5">
          {/* Architectural Explanation Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-slate-800">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              How Counterparty Confirmation Works
            </div>
            <p className="text-[11px] leading-relaxed">
              1. <strong>Share Link:</strong> The contract drafter generates a single-use signed token link and shares it with the external party via WhatsApp/email.
              <br />
              2. <strong>No Account Needed:</strong> The counterparty opens the link, reviews the synthesized clauses, and clicks &ldquo;I Agree & Confirm&rdquo;.
              <br />
              3. <strong>Immediate Finalization:</strong> The single-use token executes, stamps the counterparty&apos;s assent into the audit trail, and marks the agreement as <code>fully_confirmed</code> under Section 7 of the Indian Contract Act.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Paste raw confirmation token..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="text-xs font-mono"
            />
            <Input
              placeholder="Optional confirmation remarks / notes..."
              value={tokenNotes}
              onChange={(e) => setTokenNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <Button
            size="sm"
            onClick={handleExecuteToken}
            disabled={actionLoading === "token" || !tokenInput.trim()}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            {actionLoading === "token" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Executing Token...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Execute Token Confirmation via API
              </>
            )}
          </Button>

          {tokenResult && (
            <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{tokenResult}</AlertDescription>
            </Alert>
          )}

          {tokenError && (
            <Alert variant="destructive" className="text-xs">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Follow-up Chat Comparison Modal */}
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

export default function ConfirmationsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700">Loading Confirmations View...</p>
        </div>
      }
    >
      <ConfirmationsContent />
    </Suspense>
  );
}
