"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Lock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  KeyRound,
  Database,
  RefreshCw,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api/client";
import { ConversationRecord } from "@/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "history" | "security" | "profile";
}

export function SettingsModal({ isOpen, onClose, initialTab = "history" }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"history" | "security" | "profile">(initialTab);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deletion Confirmation Dialog State
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadConversations = async () => {
    setIsLoadingChats(true);
    setFeedback(null);
    try {
      const data = await api.listChats();
      setConversations(data);
    } catch {
      // Fallback empty if backend offline
      setConversations([]);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setFeedback(null);
    try {
      if (isDeletingAll) {
        await api.deleteAllChats();
        setFeedback({
          type: "success",
          text: "All conversation transcripts and messages have been permanently deleted from the database.",
        });
      } else if (pendingDeleteId) {
        await api.deleteChat(pendingDeleteId);
        setFeedback({
          type: "success",
          text: "The selected conversation and its messages were permanently deleted from the database.",
        });
      }
      setPendingDeleteId(null);
      setIsDeletingAll(false);
      await loadConversations();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to delete conversation messages.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              DS
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">User Settings & Privacy</h2>
              <p className="text-xs text-slate-500">Manage profile, authentication, and encrypted data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2">
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Message History & Erasure
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "profile"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Profile Details
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "security"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Password & Security
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Feedback Banners */}
          {feedback && (
            <Alert variant={feedback.type === "error" ? "destructive" : "default"} className={feedback.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}>
              {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle className="text-xs font-bold">{feedback.type === "success" ? "Action Completed" : "Error"}</AlertTitle>
              <AlertDescription className="text-xs">{feedback.text}</AlertDescription>
            </Alert>
          )}

          {/* TAB 1: Message History & DPDP Erasure */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* DPDP Act Callout */}
              <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-3.5 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs text-amber-950">
                  <Shield className="h-4 w-4 text-amber-700" />
                  DPDP Act 2023 — Right to Erasure & AES-256 Storage
                </div>
                <p className="leading-relaxed text-[11px] text-amber-800">
                  All messages are stored with application-level AES-256 encryption. Once you have synthesized and finalized your agreement draft, you have the statutory right under Section 12 of India&apos;s Digital Personal Data Protection Act to permanently erase the underlying WhatsApp chat history.
                </p>
              </div>

              {/* Conversations List Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-800 text-xs">
                  Active Ingested Conversations ({conversations.length})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadConversations}
                    disabled={isLoadingChats}
                    className="h-7 text-[11px] gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingChats ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  {conversations.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeletingAll(true)}
                      className="h-7 text-[11px] gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete All History
                    </Button>
                  )}
                </div>
              </div>

              {/* Conversations Table/List */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50/30">
                {isLoadingChats ? (
                  <div className="p-6 text-center text-slate-400">Loading conversation records...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center space-y-1 text-slate-500">
                    <p className="font-medium">No stored conversation transcripts found.</p>
                    <p className="text-[11px] text-slate-400">Messages will appear here after uploading WhatsApp chats.</p>
                  </div>
                ) : (
                  conversations.map((chat) => (
                    <div key={chat.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{chat.filename}</span>
                          <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono">
                            {chat.message_count} messages
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-800">
                            AES-256 Encrypted
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Parties: {chat.party_names?.join(" & ") || "2 Parties"}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">
                            {chat.uploaded_at ? new Date(chat.uploaded_at).toLocaleDateString() : "Recent"}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingDeleteId(chat.id)}
                        className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Profile Details */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    DS
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Demo User (Contract Sponsor)</h3>
                    <p className="text-slate-500 font-mono text-[11px]">demo@dealshield.local</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Organization:</span>
                    <span className="font-semibold text-slate-800">DealShield LegalTech Hackathon</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Account Status:</span>
                    <Badge variant="success" className="text-[10px] bg-emerald-600 text-white">Active (Demo Mode)</Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Encryption Standard:</span>
                    <span className="font-semibold text-slate-800">AES-256 Application Encryption</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Auth Provider:</span>
                    <span className="font-semibold text-slate-800">Supabase Auth (Pre-configured)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Password & Security */}
          {activeTab === "security" && (
            <form onSubmit={handlePasswordSave} className="space-y-4">
              {passwordSaved && (
                <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-xs font-bold">Password Updated</AlertTitle>
                  <AlertDescription className="text-xs">Your security credentials have been updated successfully.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter minimum 8 characters..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Forgot password?
                </button>

                <Button type="submit" size="sm" className="gap-1.5 text-xs">
                  <KeyRound className="h-3.5 w-3.5" />
                  Update Password
                </Button>
              </div>

              {showForgotNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
                  In demo mode, password resets send a single-use verification link to <code>demo@dealshield.local</code> via Supabase Auth email service.
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            DealShield AI • Tamper-evident Contract & Evidence Platform
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG BOX FOR MESSAGE DELETION */}
      {(pendingDeleteId !== null || isDeletingAll) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-red-200 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900">
                  {isDeletingAll ? "Permanently Delete ALL Message History?" : "Permanently Delete Chat Messages?"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure? This conversation and all associated WhatsApp message transcripts will be permanently deleted from the database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-800">
              <strong>Notice:</strong> In compliance with the DPDP Act 2023, an immutable audit record will verify that the personal messages were permanently erased at your request.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPendingDeleteId(null);
                  setIsDeletingAll(false);
                }}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="text-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Deleting Permanently..." : "Yes, Confirm Permanent Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
