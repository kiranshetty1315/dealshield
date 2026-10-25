"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ChevronDown,
  Check,
  Search,
  Upload,
  Sparkles,
  FileText,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConversationRecord } from "@/types";

interface NegotiationSelectorProps {
  conversations: ConversationRecord[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading?: boolean;
  className?: string;
  label?: string;
}

export function NegotiationSelector({
  conversations,
  selectedChatId,
  onSelectChat,
  isLoading = false,
  className,
  label = "Select Negotiation:",
}: NegotiationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const selectedConv = conversations.find((c) => c.id === selectedChatId) || conversations[0] || null;

  const getPartiesText = (conv: ConversationRecord) => {
    if (conv.party_names && conv.party_names.length > 0) {
      return conv.party_names.join(" & ");
    }
    return "Unassigned Counterparties";
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const parties = getPartiesText(c).toLowerCase();
    const filename = c.filename.toLowerCase();
    return parties.includes(query) || filename.includes(query);
  });

  const handleSelect = (id: string) => {
    onSelectChat(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("relative flex-1 min-w-0", className)} ref={dropdownRef}>
      <div className="flex items-center gap-2.5 w-full">
        {label && (
          <span className="text-xs font-bold text-slate-700 shrink-0 hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            {label}
          </span>
        )}

        {/* Dropdown Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || conversations.length === 0}
          className={cn(
            "flex-1 min-w-0 w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border bg-white text-left transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50",
            (isLoading || conversations.length === 0) && "opacity-60 cursor-not-allowed"
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              {selectedConv ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {getPartiesText(selectedConv)}
                    </p>
                    <Badge variant="outline" className="text-[10px] font-mono text-slate-500 bg-slate-50 border-slate-200 shrink-0 hidden sm:inline-flex">
                      {selectedConv.message_count} msgs
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-mono truncate">{selectedConv.filename}</span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-500 font-medium">No negotiations available</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full hidden md:inline">
              Negotiation
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-500 transition-transform duration-200 shrink-0",
                isOpen && "rotate-180 text-blue-600"
              )}
            />
          </div>
        </button>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 w-full min-w-[280px]">
          {/* Header & Search */}
          <div className="p-3 bg-slate-50/90 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Available Commercial Negotiations
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono bg-white text-slate-600 border border-slate-200">
                {conversations.length} {conversations.length === 1 ? "Record" : "Records"}
              </Badge>
            </div>

            {conversations.length > 2 && (
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search negotiation parties or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* List of Conversations */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">No matching negotiations found</p>
                <p className="text-[11px] text-slate-400">Try searching for a different party or file name.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedChatId;
                const partiesText = getPartiesText(conv);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelect(conv.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 group",
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 text-blue-950 font-semibold shadow-2xs"
                        : "hover:bg-slate-50 text-slate-800 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700"
                        )}
                      >
                        {partiesText
                          .split("&")
                          .map((p) => p.trim()[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("") || "DS"}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className={cn("text-xs sm:text-sm truncate", isSelected ? "font-bold text-blue-950" : "font-semibold text-slate-900")}>
                          {partiesText}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-mono truncate">{conv.filename}</span>
                          <span>&bull;</span>
                          <span>{conv.message_count} messages</span>
                          {conv.uploaded_at && (
                            <>
                              <span>&bull;</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(conv.uploaded_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">
              Need to analyze another WhatsApp chat?
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5 border-slate-300 text-slate-700 hover:text-blue-700 hover:border-blue-300 bg-white"
            >
              <Link href="/upload">
                <Upload className="h-3 w-3" />
                Ingest New Chat
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
