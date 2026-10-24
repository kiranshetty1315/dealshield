"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CitationChip } from "@/components/analysis/CitationChip";
import { FileCheck } from "lucide-react";
import { Agreement, Clause } from "@/types";

interface AgreementPreviewProps {
  activeCitationId?: string | null;
  onCitationClick?: (citationId: string) => void;
  priceResolutionText?: string | null;
  agreement?: Agreement | null;
}

export function AgreementPreview({
  activeCitationId,
  onCitationClick,
  priceResolutionText,
  agreement,
}: AgreementPreviewProps) {
  const currentVersion = agreement?.versions?.[agreement.versions.length - 1];
  const dynamicClauses = currentVersion?.clauses;

  const partiesLabel = agreement?.parties?.length
    ? agreement.parties.join(" & ")
    : "Raj Mehta & Priya Sharma";

  const versionLabel = agreement
    ? `Draft v${currentVersion?.version_number || agreement.current_version}.0`
    : "Draft v1.0";

  return (
    <Card className="border-slate-300 shadow-sm">
      <CardHeader className="border-b bg-slate-50/70 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-600" />
              Synthesized Plain-Language Agreement ({versionLabel})
            </CardTitle>
            <CardDescription className="text-xs">
              Derived from verified WhatsApp negotiations between {partiesLabel}
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 text-xs shrink-0">
            Plain-Language Summary
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5 text-xs text-slate-800 leading-relaxed font-sans">
        {dynamicClauses && dynamicClauses.length > 0 ? (
          dynamicClauses.map((clause: Clause, idx: number) => (
            <div
              key={clause.clause_id || `clause_${idx}`}
              className={`space-y-1.5 ${idx < dynamicClauses.length - 1 ? "border-b border-slate-100 pb-3" : "pb-1"}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <h4 className="font-bold text-slate-900 text-xs">{clause.title}</h4>
                <div className="flex items-center gap-1 flex-wrap">
                  {clause.statutory_reference && (
                    <Badge variant="outline" className="text-[10px] bg-slate-50">
                      {clause.statutory_reference}
                    </Badge>
                  )}
                  {clause.source_term_ids?.map((termId) => (
                    <Badge key={termId} variant="secondary" className="text-[10px] font-mono">
                      {termId}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">{clause.body}</p>
            </div>
          ))
        ) : (
          <>
            {/* Clause 1 */}
            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  1. Scope of Work & Deliverables
                </h4>
                <div className="flex items-center gap-1">
                  <CitationChip citationId="msg_raj_001" isActive={activeCitationId === "msg_raj_001"} onClick={onCitationClick} />
                  <CitationChip citationId="msg_priya_002" isActive={activeCitationId === "msg_priya_002"} onClick={onCitationClick} />
                </div>
              </div>
              <p className="text-slate-700 text-[11px]">
                The Service Provider agrees to perform a full website redesign for the Client,
                including preliminary UI mockups, responsive frontend layout, and final asset handover.
              </p>
            </div>

            {/* Clause 2 */}
            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  2. Consideration & Payment Milestones
                </h4>
                <div className="flex items-center gap-1">
                  <CitationChip citationId="msg_priya_008" isActive={activeCitationId === "msg_priya_008"} onClick={onCitationClick} />
                  <CitationChip citationId="msg_raj_009" isActive={activeCitationId === "msg_raj_009"} onClick={onCitationClick} />
                </div>
              </div>
              <p className="text-slate-700 text-[11px]">
                {priceResolutionText ||
                  "The agreed fixed fee for the complete scope is ₹1,00,000 (Indian Rupees One Lakh only). Payment shall be executed in two equal tranches: 50% (₹50,000) payable upfront prior to commencement of design activities, and 50% (₹50,000) payable upon final delivery and acceptance."}
              </p>
            </div>

            {/* Clause 3 */}
            <div className="space-y-1.5 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  3. Project Timeline & Milestones
                </h4>
                <div className="flex items-center gap-1">
                  <CitationChip citationId="msg_raj_007" isActive={activeCitationId === "msg_raj_007"} onClick={onCitationClick} />
                  <CitationChip citationId="msg_priya_010" isActive={activeCitationId === "msg_priya_010"} onClick={onCitationClick} />
                </div>
              </div>
              <p className="text-slate-700 text-[11px]">
                All agreed deliverables must be completed and submitted for client review by April 30, 2024.
                Initial mockups shall be provided within seven (7) business days of upfront consideration receipt.
              </p>
            </div>

            {/* Clause 4 */}
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">
                  4. Intellectual Property & Governing Law
                </h4>
                <Badge variant="outline" className="text-[10px] bg-slate-50">
                  Indian Contract Act 1872
                </Badge>
              </div>
              <p className="text-slate-700 text-[11px]">
                All intellectual property rights in final deliverable assets shall vest in the Client upon 100% full payment receipt.
                Governed by the laws of India; disputes subject to amicable resolution under Section 7 and Indian conciliation principles.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
