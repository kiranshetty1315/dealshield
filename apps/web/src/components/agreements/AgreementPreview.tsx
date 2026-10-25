"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, FileText } from "lucide-react";
import { Agreement, Clause, ConfirmationStatus } from "@/types";

interface AgreementPreviewProps {
  activeCitationId?: string | null;
  onCitationClick?: (citationId: string) => void;
  priceResolutionText?: string | null;
  agreement?: Agreement | null;
  confirmationStatus?: ConfirmationStatus | null;
}

export function AgreementPreview({
  activeCitationId,
  onCitationClick,
  priceResolutionText,
  agreement,
  confirmationStatus,
}: AgreementPreviewProps) {
  const currentVersion = agreement?.versions?.[agreement.versions.length - 1];
  const dynamicClauses = currentVersion?.clauses;

  const firstParty = agreement?.parties?.[0] || "First Party (Initiator)";
  const secondParty = agreement?.parties?.[1] || "Second Party (Counterparty)";

  const p1Record = confirmationStatus?.parties?.find(
    (p) => p.party_name.trim().toLowerCase() === firstParty.trim().toLowerCase()
  );
  const p2Record = confirmationStatus?.parties?.find(
    (p) => p.party_name.trim().toLowerCase() === secondParty.trim().toLowerCase()
  );

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
          <>
            {dynamicClauses.map((clause: Clause, idx: number) => (
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
            ))}

            {/* Last Detail Part: Commercial Entity Registration & Office Locations */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Commercial Entity Registration &amp; Office Locations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">First Party (Initiator)</span>
                  <p className="font-bold text-slate-900">{firstParty}</p>
                  <p className="text-[11px] text-slate-600"><strong>Role:</strong> Originating Party</p>
                  {p1Record?.gst_number && (
                    <p className="text-[11px] text-slate-600"><strong>Business GST:</strong> <code className="font-mono text-slate-900">{p1Record.gst_number}</code></p>
                  )}
                  {p1Record?.pan_last_4 && (
                    <p className="text-[11px] text-slate-600"><strong>Business PAN (Last 4):</strong> <code className="font-mono text-slate-900">******{p1Record.pan_last_4}</code></p>
                  )}
                  {p1Record?.office_address && (
                    <p className="text-[11px] text-slate-600"><strong>Office Location:</strong> {p1Record.office_address}</p>
                  )}
                </div>

                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Second Party (Counterparty)</span>
                  <p className="font-bold text-slate-900">{secondParty}</p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Business GST:</strong> <code className="font-mono font-semibold text-slate-900">{p2Record?.gst_number || "Not declared"}</code>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Business PAN (Last 4):</strong> <code className="font-mono font-semibold text-slate-900">{p2Record?.pan_last_4 ? `******${p2Record.pan_last_4}` : "Not declared"}</code>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Office Location:</strong> {p2Record?.office_address || "Not declared"}
                  </p>
                </div>
              </div>
            </div>
          </>
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
