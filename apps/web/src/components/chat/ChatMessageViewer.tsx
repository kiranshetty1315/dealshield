"use client";

import React, { useEffect, useRef, useState } from "react";
import { Message } from "@/types";
import { MessageSquare, Search, ArrowDown, User, Shield, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessageViewerProps {
  messages: Message[];
  activeCitationIds?: string[];
  onSelectMessage?: (message: Message) => void;
  className?: string;
  title?: string;
}

export function ChatMessageViewer({
  messages,
  activeCitationIds = [],
  onSelectMessage,
  className,
  title = "Source Chat Transcript",
}: ChatMessageViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Distinct senders in the conversation
  const senders = Array.from(new Set(messages.map((m) => m.sender)));
  const primarySender = senders[0] || "User 1";

  // Filter messages based on search & sender selection
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      !searchQuery.trim() ||
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSender = !selectedSender || msg.sender === selectedSender;
    return matchesSearch && matchesSender;
  });

  // Automatically smooth-scroll to cited message when activeCitationIds changes
  useEffect(() => {
    if (activeCitationIds.length > 0) {
      const targetId = activeCitationIds[0];
      const targetEl = messageRefs.current.get(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [activeCitationIds]);

  const scrollToActive = () => {
    if (activeCitationIds.length > 0) {
      const targetEl = messageRefs.current.get(activeCitationIds[0]);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <div className={cn("flex flex-col h-full border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden", className)}>
      {/* Viewer Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-700">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">
                {messages.length} verbatim messages with stable citation IDs
              </p>
            </div>
          </div>

          {activeCitationIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToActive}
              className="text-xs h-7 gap-1 border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
            >
              <ArrowDown className="h-3 w-3 animate-bounce" />
              Jump to Citation
            </Button>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter messages or citations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSender(null)}
              className={cn(
                "px-2 py-1 rounded text-[11px] font-medium transition-colors border",
                selectedSender === null
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              All
            </button>
            {senders.map((sender) => (
              <button
                key={sender}
                type="button"
                onClick={() => setSelectedSender(sender === selectedSender ? null : sender)}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-colors border max-w-[100px] truncate",
                  selectedSender === sender
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
                title={sender}
              >
                {sender.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40 min-h-[420px] max-h-[680px]"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No messages match your search.
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isCited = activeCitationIds.includes(msg.message_id);
            const isPrimary = msg.sender === primarySender;
            const timeFormatted =
              typeof msg.timestamp === "string"
                ? msg.timestamp.includes("T")
                  ? msg.timestamp.split("T")[1]?.slice(0, 5)
                  : msg.timestamp
                : "10:15";

            return (
              <div
                key={msg.message_id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.message_id, el);
                  else messageRefs.current.delete(msg.message_id);
                }}
                onClick={() => onSelectMessage?.(msg)}
                className={cn(
                  "flex flex-col transition-all cursor-pointer rounded-xl p-3 border",
                  isPrimary ? "mr-6 bg-white border-slate-200" : "ml-6 bg-slate-100/90 border-slate-200",
                  isCited &&
                    "ring-2 ring-blue-500 border-blue-500 bg-blue-50/80 shadow-md scale-[1.01]"
                )}
              >
                {/* Bubble Header */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("font-bold text-xs", isPrimary ? "text-blue-700" : "text-emerald-700")}>
                      {msg.sender}
                    </span>
                    {isCited && (
                      <Badge variant="default" className="text-[9px] h-4 px-1.5 bg-blue-600 gap-0.5">
                        <Check className="h-2.5 w-2.5" /> Cited
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {timeFormatted}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                        isCited
                          ? "bg-blue-600 text-white border-blue-600 font-semibold"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      {msg.message_id}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Viewer Footer Legend */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3 text-blue-600" />
          Cryptographic Citation Ready
        </span>
        <span>
          Click any message to filter or inspect its terms.
        </span>
      </div>
    </div>
  );
}
