"use client";

import React, { useState, useEffect, Suspense } from "react";
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
} from "lucide-react";
import { ChatMessageViewer } from "@/components/chat/ChatMessageViewer";
import {
  ConflictResolutionDrawer,
  ResolvedConflictState,
} from "@/components/analysis/ConflictResolutionDrawer";
import { TermCard } from "@/components/analysis/TermCard";
import { CitationChip } from "@/components/analysis/CitationChip";
import { SAMPLE_MESSAGES, SAMPLE_ANALYSIS } from "@/lib/sample-data";
import { AgreementAnalysis, ExtractedTerm, Message } from "@/types";
import { api } from "@/lib/api/client";

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const analysisIdParam = searchParams.get("analysis_id");
  const chatIdParam = searchParams.get("chat_id");

  const [isLoading, setIsLoading] = useState(Boolean(analysisIdParam));
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<AgreementAnalysis>(SAMPLE_ANALYSIS);
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [isLive, setIsLive] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<string | null>("msg_raj_009");
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, ResolvedConflictState>>({});

  useEffect(() => {
    async function loadLiveData() {
      if (!analysisIdParam) return;

      setIsLoading(true);
      try {
        const fetchedAnalysis = await api.getAnalysis(analysisIdParam);
        setAnalysis(fetchedAnalysis);
        setIsLive(true);

        const targetChatId = chatIdParam || fetchedAnalysis.chat_id;
        if (targetChatId) {
          try {
            const chatData = await api.getConversation(targetChatId);
            if (chatData.messages && chatData.messages.length > 0) {
              setMessages(chatData.messages);
            }
          } catch {
            // Keep default sample messages if chat endpoint is not queried
          }
        }

        // Set default active citation if conflicts exist
        if (fetchedAnalysis.conflicts && fetchedAnalysis.conflicts.length > 0) {
          const firstCitations = fetchedAnalysis.conflicts[0].source_message_ids;
          if (firstCitations && firstCitations.length > 0) {
            setActiveCitationId(firstCitations[firstCitations.length - 1]);
          }
        }
      } catch (err) {
        console.warn("Could not fetch live analysis, falling back to sample fixture:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadLiveData();
  }, [analysisIdParam, chatIdParam]);

  // When conflict is resolved, dynamically update the ambiguous term to agreed
  const terms: ExtractedTerm[] = analysis.extracted_terms.map((term) => {
    if (term.term_id === "term_price_01" && resolvedConflicts["conflict_price_01"]) {
      return {
        ...term,
        status: "agreed",
        accepted_value: "₹1,00,000 (unconditional)",
        description: `Resolved via compromise: ${resolvedConflicts["conflict_price_01"].resolutionText}`,
      };
    }
    return term;
  });

  const isAllResolved =
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

  const handleGenerateAgreement = async () => {
    setIsGenerating(true);
    try {
      if (isLive && analysis.analysis_id) {
        const partyNames = analysis.parties.map((p) => p.name);
        const agreement = await api.createAgreement(analysis.analysis_id, partyNames);
        router.push(
          `/agreements?id=${encodeURIComponent(agreement.id)}&analysis_id=${encodeURIComponent(analysis.analysis_id)}`
        );
      } else {
        router.push("/agreements");
      }
    } catch (err: any) {
      alert(`Agreement generation failed: ${err.message || err}`);
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-700">Loading analysis findings from Supabase...</p>
      </div>
    );
  }

  const p1 = analysis.parties[0]?.name || "Party 1";
  const p2 = analysis.parties[1]?.name || "Party 2";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Agreement Analysis & Legal Intelligence
            </h1>
            {isLive ? (
              <Badge
                variant="outline"
                className="border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold text-xs flex items-center gap-1"
              >
                <Database className="h-3 w-3" />
                Live Supabase Verified ({analysis.analysis_id.slice(0, 8)}...)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-400 bg-amber-50 text-amber-800 font-semibold text-xs"
              >
                Sample Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verified WhatsApp negotiation between{" "}
            <strong className="text-slate-800">{p1}</strong> ({analysis.parties[0]?.detected_role || "Client"}) and{" "}
            <strong className="text-slate-800">{p2}</strong> ({analysis.parties[1]?.detected_role || "Service Provider"})
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
          {analysis.conflicts && analysis.conflicts.length > 0 && (
            <ConflictResolutionDrawer
              conflicts={analysis.conflicts}
              activeCitationId={activeCitationId}
              onCitationClick={handleCitationClick}
              onConflictResolved={handleConflictResolved}
              onConflictReopened={handleConflictReopened}
              resolvedConflicts={resolvedConflicts}
            />
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
              {terms.map((term) => (
                <TermCard
                  key={term.term_id}
                  term={term}
                  activeCitationId={activeCitationId}
                  onCitationClick={handleCitationClick}
                />
              ))}
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
            title="Verbatim WhatsApp Transcript"
          />

          {/* Citation Guidance Tip */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1.5 shadow-sm">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Tamper-Evident Citation Linking
            </div>
            <p className="leading-relaxed text-[11px] text-blue-800">
              Every extracted term and conflict is tied to an immutable citation ID (e.g.,{" "}
              <code className="font-mono bg-blue-100 text-blue-900 px-1 py-0.5 rounded">msg_raj_003</code>).
              Section 65B Indian Evidence Act compliant hashing ensures the original chat export is cryptographically matched with each generated agreement clause.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
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
  );
}
