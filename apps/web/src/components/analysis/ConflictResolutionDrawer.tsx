"use client";

import React, { useState } from "react";
import { ConflictItem } from "@/types";
import {
  AlertTriangle,
  Scale,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Edit3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CitationChip } from "@/components/analysis/CitationChip";
import { cn } from "@/lib/utils";

export interface ResolvedConflictState {
  conflict_id: string;
  resolutionText: string;
  selectedOption: string;
  resolvedAt: string;
}

interface ConflictResolutionDrawerProps {
  conflicts: ConflictItem[];
  activeCitationId?: string | null;
  onCitationClick?: (citationId: string) => void;
  onConflictResolved?: (resolution: ResolvedConflictState) => void;
  onConflictReopened?: (conflictId: string) => void;
  resolvedConflicts?: Record<string, ResolvedConflictState>;
}

export function ConflictResolutionDrawer({
  conflicts,
  activeCitationId,
  onCitationClick,
  onConflictResolved,
  onConflictReopened,
  resolvedConflicts = {},
}: ConflictResolutionDrawerProps) {
  const [activeConflictId, setActiveConflictId] = useState<string>(
    conflicts[0]?.conflict_id || ""
  );
  const [selectedResolutions, setSelectedResolutions] = useState<Record<string, string>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [isEditingCustom, setIsEditingCustom] = useState<Record<string, boolean>>({});

  const currentConflict = conflicts.find((c) => c.conflict_id === activeConflictId) || conflicts[0];

  if (!currentConflict) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-6 text-center text-xs text-emerald-800">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
          No open contradictions detected. The conversation is ready for agreement synthesis.
        </CardContent>
      </Card>
    );
  }

  const isCurrentResolved = Boolean(resolvedConflicts[currentConflict.conflict_id]);
  const currentResolution = resolvedConflicts[currentConflict.conflict_id];

  // Resolution options for the current conflict
  const defaultOption = currentConflict.resolution_suggestion || "Accept negotiated compromise terms.";
  const partyEntries = Object.entries(currentConflict.party_positions || {});

  const handleSelectOption = (option: string) => {
    setSelectedResolutions((prev) => ({
      ...prev,
      [currentConflict.conflict_id]: option,
    }));
  };

  const handleApplyResolution = () => {
    const selected = selectedResolutions[currentConflict.conflict_id] || "recommended";
    let text = defaultOption;

    if (selected === "party_0" && partyEntries[0]) {
      text = `Adopt position of ${partyEntries[0][0]}: ${partyEntries[0][1]}`;
    } else if (selected === "party_1" && partyEntries[1]) {
      text = `Adopt position of ${partyEntries[1][0]}: ${partyEntries[1][1]}`;
    } else if (selected === "custom") {
      text = customTexts[currentConflict.conflict_id] || defaultOption;
    }

    onConflictResolved?.({
      conflict_id: currentConflict.conflict_id,
      resolutionText: text,
      selectedOption: selected,
      resolvedAt: new Date().toISOString(),
    });
  };

  const handleReopen = () => {
    onConflictReopened?.(currentConflict.conflict_id);
  };

  return (
    <Card className={cn(
      "border-2 transition-all shadow-sm",
      isCurrentResolved ? "border-emerald-300 bg-emerald-50/20" : "border-amber-300 bg-white"
    )}>
      {/* Header with Conflict Selector Tabs */}
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg text-white",
              isCurrentResolved ? "bg-emerald-600" : "bg-amber-600"
            )}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base text-slate-900">
                Interactive Conflict Resolution
              </CardTitle>
              <CardDescription className="text-xs">
                {conflicts.length} issue(s) detected • Section 7 Indian Contract Act 1872 analysis
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conflicts.map((c, idx) => {
              const resolved = Boolean(resolvedConflicts[c.conflict_id]);
              return (
                <button
                  key={c.conflict_id}
                  type="button"
                  onClick={() => setActiveConflictId(c.conflict_id)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors border flex items-center gap-1",
                    activeConflictId === c.conflict_id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {resolved ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : null}
                  Conflict #{idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Conflict Title & Severity */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">
                {currentConflict.term_category.toUpperCase()}: {currentConflict.description}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              ID: {currentConflict.conflict_id}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCurrentResolved ? (
              <Badge variant="success" className="gap-1 bg-emerald-600 text-white">
                <CheckCircle2 className="h-3 w-3" /> Resolved
              </Badge>
            ) : (
              <Badge variant="destructive" className="capitalize">
                {currentConflict.severity} Severity
              </Badge>
            )}
          </div>
        </div>

        {/* Section 7 Statutory Banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <Scale className="h-4 w-4 text-amber-700" />
            Statutory Legal Context: Section 7, Indian Contract Act 1872
          </div>
          <p className="leading-relaxed text-[11px] text-amber-800">
            {currentConflict.statutory_context ||
              "Section 7 requires: 'Acceptance must be absolute and unqualified.' Qualified phrases like 'I think that works' or conditional timelines operate as counter-proposals, not legally binding acceptances. Parties must explicitly resolve ambiguity."}
          </p>
        </div>

        {/* Side-by-Side Party Positions */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Party Stances in Negotiation:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {partyEntries.map(([party, position], pIdx) => (
              <div
                key={party}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{party}</span>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    Party {pIdx + 1}
                  </Badge>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">{position}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clickable Citation Chips */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">
            Click Source Citations to View in WhatsApp Transcript:
          </span>
          <div className="flex flex-wrap gap-2 pt-1">
            {currentConflict.source_message_ids.map((id) => (
              <CitationChip
                key={id}
                citationId={id}
                isActive={activeCitationId === id}
                onClick={onCitationClick}
              />
            ))}
          </div>
        </div>

        {/* Resolution Options Form */}
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <span className="text-xs font-bold text-slate-900 block">
            Select Resolution for Agreement Generation:
          </span>

          {isCurrentResolved ? (
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Agreed Resolution Applied
                </span>
                <span className="text-[10px] text-emerald-700">
                  {new Date(currentResolution.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-medium leading-relaxed bg-white/80 p-2.5 rounded border border-emerald-200">
                {currentResolution.resolutionText}
              </p>
              <div className="pt-1 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopen}
                  className="text-xs h-7 gap-1 border-slate-300 text-slate-700 hover:bg-white"
                >
                  <RotateCcw className="h-3 w-3" /> Reopen Conflict
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {/* Option A: Recommended Compromise */}
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  (selectedResolutions[currentConflict.conflict_id] || "recommended") === "recommended"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name={`res_${currentConflict.conflict_id}`}
                  checked={(selectedResolutions[currentConflict.conflict_id] || "recommended") === "recommended"}
                  onChange={() => handleSelectOption("recommended")}
                  className="mt-0.5 text-blue-600"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    DealShield Recommended Compromise:
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {defaultOption}
                  </p>
                </div>
              </label>

              {/* Option B & C: Party Positions */}
              {partyEntries.map(([party, pos], idx) => (
                <label
                  key={party}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                    selectedResolutions[currentConflict.conflict_id] === `party_${idx}`
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="radio"
                    name={`res_${currentConflict.conflict_id}`}
                    checked={selectedResolutions[currentConflict.conflict_id] === `party_${idx}`}
                    onChange={() => handleSelectOption(`party_${idx}`)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800">
                      Favor {party}&apos;s Proposal
                    </span>
                    <p className="text-slate-600 text-[11px]">{pos}</p>
                  </div>
                </label>
              ))}

              {/* Option D: Custom Term */}
              <label
                className={cn(
                  "flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                  selectedResolutions[currentConflict.conflict_id] === "custom"
                    ? "border-blue-600 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name={`res_${currentConflict.conflict_id}`}
                  checked={selectedResolutions[currentConflict.conflict_id] === "custom"}
                  onChange={() => handleSelectOption("custom")}
                  className="mt-0.5 text-blue-600"
                />
                <div className="space-y-1.5 flex-1">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Enter Custom Compromise Clause:
                  </span>
                  {selectedResolutions[currentConflict.conflict_id] === "custom" && (
                    <textarea
                      value={customTexts[currentConflict.conflict_id] || ""}
                      onChange={(e) =>
                        setCustomTexts((prev) => ({
                          ...prev,
                          [currentConflict.conflict_id]: e.target.value,
                        }))
                      }
                      placeholder="Type the exact compromise agreed between both parties..."
                      rows={2}
                      className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  )}
                </div>
              </label>

              {/* Resolution Action Button */}
              <div className="pt-2 flex justify-end">
                <Button onClick={handleApplyResolution} className="gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  Apply Resolution & Standardize Clause
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
