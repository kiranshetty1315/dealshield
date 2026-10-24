"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationChipProps {
  citationId: string;
  isActive?: boolean;
  onClick?: (citationId: string) => void;
  className?: string;
  labelPrefix?: string;
}

export function CitationChip({
  citationId,
  isActive = false,
  onClick,
  className,
  labelPrefix,
}: CitationChipProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(citationId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Click to view source message: ${citationId}`}
      aria-label={`Jump to message ${citationId}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all border",
        isActive
          ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200"
          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
        className
      )}
    >
      <MessageSquareText className="h-3 w-3 shrink-0" />
      <span>{labelPrefix ? `${labelPrefix} ` : ""}{citationId}</span>
    </button>
  );
}
