"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { ChatMessageViewer } from "@/components/chat/ChatMessageViewer";
import {
  ConflictResolutionDrawer,
  ResolvedConflictState,
} from "@/components/analysis/ConflictResolutionDrawer";
import { TermCard } from "@/components/analysis/TermCard";
import { CitationChip } from "@/components/analysis/CitationChip";
import { SAMPLE_MESSAGES, SAMPLE_ANALYSIS } from "@/lib/sample-data";
import { ExtractedTerm, Message } from "@/types";

export default function AnalysisPage() {
  const [messages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [activeCitationId, setActiveCitationId] = useState<string | null>("msg_raj_009");
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, ResolvedConflictState>>({});

  // When conflict is resolved, dynamically update the ambiguous price term to agreed
  const terms: ExtractedTerm[] = SAMPLE_ANALYSIS.extracted_terms.map((term) => {
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
    SAMPLE_ANALYSIS.conflicts.length > 0 &&
    SAMPLE_ANALYSIS.conflicts.every((c) => Boolean(resolvedConflicts[c.conflict_id]));

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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Agreement Analysis & Verification
            </h1>
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-800 font-semibold text-xs"
            >
              Sample Demo Data
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Verified WhatsApp negotiation between{" "}
            <strong className="text-slate-800">Raj Mehta</strong> (Client) and{" "}
            <strong className="text-slate-800">Priya Sharma</strong> (Service Provider)
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
              Requires Human Review (1 Conflict)
            </Badge>
          )}

          <Link href="/agreements">
            <Button
              className="gap-2 text-xs font-semibold shadow-sm"
              variant={isAllResolved ? "default" : "secondary"}
            >
              <FileText className="h-4 w-4" />
              Review Synthesized Agreement
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
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
              {SAMPLE_ANALYSIS.parties.map((party, idx) => (
                <div
                  key={party.party_id}
                  className="p-3 border border-slate-200 rounded-lg bg-white space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{party.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {party.detected_role}
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
          <ConflictResolutionDrawer
            conflicts={SAMPLE_ANALYSIS.conflicts}
            activeCitationId={activeCitationId}
            onCitationClick={handleCitationClick}
            onConflictResolved={handleConflictResolved}
            onConflictReopened={handleConflictReopened}
            resolvedConflicts={resolvedConflicts}
          />

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
              {SAMPLE_ANALYSIS.missing_terms.map((missing) => (
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
              Every extracted term and conflict is tied to an immutable 1-based citation ID (e.g.,{" "}
              <code className="font-mono bg-blue-100 text-blue-900 px-1 py-0.5 rounded">msg_raj_003</code>).
              Section 65B Indian Evidence Act compliant hashing ensures the original chat export is cryptographically matched with each generated agreement clause.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
