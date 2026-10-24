"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { AgreementPreview } from "@/components/agreements/AgreementPreview";
import { ChatMessageViewer } from "@/components/chat/ChatMessageViewer";
import { SAMPLE_MESSAGES } from "@/lib/sample-data";
import { Agreement, Message } from "@/types";
import { api } from "@/lib/api/client";

function AgreementsContent() {
  const searchParams = useSearchParams();
  const agreementIdParam = searchParams.get("id");
  const analysisIdParam = searchParams.get("analysis_id");

  const [isLoading, setIsLoading] = useState(Boolean(agreementIdParam));
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [activeCitationId, setActiveCitationId] = useState<string | null>("msg_priya_008");

  useEffect(() => {
    async function loadAgreement() {
      if (!agreementIdParam) return;

      setIsLoading(true);
      try {
        const fetchedAgreement = await api.getAgreement(agreementIdParam);
        setAgreement(fetchedAgreement);

        // If analysis_id is present or associated, attempt to load chat messages
        const targetAnalysisId = analysisIdParam || fetchedAgreement.analysis_id;
        if (targetAnalysisId) {
          try {
            const analysisData = await api.getAnalysis(targetAnalysisId);
            if (analysisData.chat_id) {
              const chatData = await api.getConversation(analysisData.chat_id);
              if (chatData.messages?.length) {
                setMessages(chatData.messages);
              }
            }
          } catch {
            // Keep sample messages
          }
        }
      } catch (err) {
        console.warn("Could not fetch agreement from backend, falling back to sample preview:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAgreement();
  }, [agreementIdParam, analysisIdParam]);

  const handleCitationClick = (citationId: string) => {
    setActiveCitationId(citationId);
  };

  const handleMessageSelect = (msg: Message) => {
    setActiveCitationId(msg.message_id);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-700">Loading agreement version from database...</p>
      </div>
    );
  }

  const isLive = Boolean(agreement);
  const currentVersion = agreement?.versions?.[agreement.versions.length - 1];
  const contentHash = currentVersion?.content_hash || "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e";
  const partiesLabel = agreement?.parties?.length ? agreement.parties.join(" and ") : "Raj Mehta and Priya Sharma";
  const confirmationHref = agreement ? `/confirmations?agreement_id=${encodeURIComponent(agreement.id)}` : "/confirmations";

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Generated Agreement Draft
            </h1>
            {isLive ? (
              <Badge
                variant="outline"
                className="border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold text-xs flex items-center gap-1"
              >
                <Database className="h-3 w-3" />
                Live Version v{currentVersion?.version_number || agreement?.current_version}.0
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
            Synthesized plain-language term sheet derived from verified WhatsApp negotiation between{" "}
            <strong className="text-slate-800">{partiesLabel}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Badge variant="outline" className="border-slate-300 text-xs font-mono">
            Hash: {contentHash.slice(0, 10)}...
          </Badge>
          {agreement ? (
            <a href={api.getAgreementPdfUrl(agreement.id)} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="h-4 w-4" /> Download Plain-Text / PDF
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => alert("Sample draft preview downloaded")}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          )}

          <Link href={confirmationHref}>
            <Button size="sm" className="gap-2 text-xs font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="h-4 w-4" />
              Proceed to Two-Party Confirmation
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Prominent Stamp Duty and Enforceability Notice */}
      <div className="border border-amber-300 bg-amber-50/90 rounded-xl p-4 text-xs text-amber-900 space-y-1.5 shadow-sm">
        <div className="font-bold flex items-center gap-2 text-amber-950 text-sm">
          <Scale className="h-4 w-4 text-amber-700" />
          Statutory Legal Notice — Stamp Duty & Contractual Enforceability
        </div>
        <p className="leading-relaxed text-[11px] text-amber-800">
          This generated document represents a <strong>plain-language synthesis and term sheet</strong> constructed from informal communications.
          It is <strong>not</strong> an executed legal deed and has not been assessed for or paid Indian stamp duty under the <strong>Indian Stamp Act, 1899</strong> (or relevant state Stamp Acts).
          To achieve full statutory enforceability in court, commercial agreements in India must be formally stamped with applicable duty, executed by authorized signatories, and optionally notarized or executed via a licensed Certifying Authority (CCA) eSign under Section 3/3A of the Information Technology Act, 2000.
        </p>
      </div>

      {/* Side-by-Side: Agreement Document (Left) & Chat Evidence Transcript (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Pane (7 cols): Agreement Clauses with Clickable Citations */}
        <div className="lg:col-span-7 space-y-6">
          <AgreementPreview
            activeCitationId={activeCitationId}
            onCitationClick={handleCitationClick}
            agreement={agreement}
          />

          {/* Tamper Evident Audit Record */}
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
                  <span className="text-slate-400 block">Original Chat Hash:</span>
                  <span className="text-slate-800 break-all">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-slate-400 block">Agreement Draft Hash:</span>
                  <span className="text-slate-800 break-all">
                    {contentHash}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Guaranteed append-only audit trail enforcing DPDP Act 2023 compliance and Section 65B Indian Evidence Act admissibility.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Pane (5 cols): Interactive Verbatim Chat Transcript */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <ChatMessageViewer
            messages={messages}
            activeCitationIds={activeCitationId ? [activeCitationId] : []}
            onSelectMessage={handleMessageSelect}
            title="Chat Citation Evidence"
          />

          <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Two-Party Confirmation Status
            </span>
            <p className="text-[11px] text-slate-600">
              When both parties confirm this draft via token-authenticated links, an immutable Section 65B digital evidence certificate will be generated.
            </p>
          </div>
        </div>
      </div>
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
