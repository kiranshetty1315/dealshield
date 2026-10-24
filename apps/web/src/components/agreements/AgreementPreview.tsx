"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CitationChip } from "@/components/analysis/CitationChip";
import { FileCheck, FileText } from "lucide-react";
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
    : "Contracting Counterparties";

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
          <div className="py-12 text-center text-slate-500 space-y-2">
            <FileText className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">
              No Contract Clauses Synthesized Yet
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Synthesize an agreement draft from an analyzed WhatsApp negotiation to populate plain-language clauses.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
