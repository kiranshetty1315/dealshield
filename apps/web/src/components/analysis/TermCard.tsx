"use client";

import React from "react";
import { ExtractedTerm } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CitationChip } from "@/components/analysis/CitationChip";
import { CheckCircle, Clock, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermCardProps {
  term: ExtractedTerm;
  activeCitationId?: string | null;
  onCitationClick?: (citationId: string) => void;
}

export function TermCard({
  term,
  activeCitationId,
  onCitationClick,
}: TermCardProps) {
  const isTermActive =
    Boolean(activeCitationId) &&
    term.source_message_ids.includes(activeCitationId as string);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "agreed":
        return (
          <Badge variant="success" className="gap-1 text-[10px]">
            <CheckCircle className="h-3 w-3" /> Agreed
          </Badge>
        );
      case "ambiguous":
        return (
          <Badge variant="warning" className="gap-1 text-[10px]">
            <HelpCircle className="h-3 w-3" /> Ambiguous
          </Badge>
        );
      case "contested":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3" /> Contested
          </Badge>
        );
      case "proposed":
      default:
        return (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Clock className="h-3 w-3" /> Proposed
          </Badge>
        );
    }
  };

  return (
    <div
      className={cn(
        "p-3.5 rounded-lg border transition-all text-xs space-y-2",
        isTermActive
          ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-300 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 capitalize">
            {term.category.replace("_", " ")}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {term.term_id}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 capitalize">
            {term.confidence} conf.
          </span>
          {getStatusBadge(term.status)}
        </div>
      </div>

      <p className="text-slate-700 leading-relaxed text-[11px]">
        {term.description}
      </p>

      {/* Values comparison */}
      <div className="bg-slate-50 p-2 rounded border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {term.proposed_value && (
          <div>
            <span className="text-slate-500 font-medium">Proposed:</span>{" "}
            <span className="text-slate-800 font-semibold">{term.proposed_value}</span>
          </div>
        )}
        {term.accepted_value && (
          <div>
            <span className="text-slate-500 font-medium">Accepted:</span>{" "}
            <span className="text-emerald-700 font-semibold">{term.accepted_value}</span>
          </div>
        )}
      </div>

      {/* Source Citations */}
      {term.source_message_ids.length > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-500">
            Source:
          </span>
          {term.source_message_ids.map((id) => (
            <CitationChip
              key={id}
              citationId={id}
              isActive={activeCitationId === id}
              onClick={onCitationClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
