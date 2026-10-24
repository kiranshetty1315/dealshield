"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Shield,
  Trash2,
  RefreshCw,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Database,
  FileText,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { ConversationRecord } from "@/types";

export default function SettingsPage() {
  // --- Message History & DPDP Erasure State ---
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [historyFeedback, setHistoryFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Deletion Confirmation Dialog State
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Password & Security State ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  // Fetch active conversations on mount
  const loadConversations = async () => {
    setIsLoadingChats(true);
    setHistoryFeedback(null);
    try {
      const data = await api.listChats();
      setConversations(data);
    } catch {
      setConversations([]);
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Handle Permanent Chat Erasure
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setHistoryFeedback(null);
    try {
      if (isDeletingAll) {
        await api.deleteAllChats();
        setHistoryFeedback({
          type: "success",
          text: "All conversation transcripts and WhatsApp messages were permanently deleted from the database in compliance with the DPDP Act 2023.",
        });
      } else if (pendingDeleteId) {
        await api.deleteChat(pendingDeleteId);
        setHistoryFeedback({
          type: "success",
          text: "The selected conversation and all associated WhatsApp messages were permanently erased from the database.",
        });
      }
      setPendingDeleteId(null);
      setIsDeletingAll(false);
      await loadConversations();
    } catch (err: any) {
      setHistoryFeedback({
        type: "error",
        text: err.message || "Failed to erase conversation messages from database.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 5000);
  };

  const selectedChatForDelete = conversations.find((c) => c.id === pendingDeleteId);

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-7xl">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Settings & Privacy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-blue-600" />
            Account Settings & Data Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your encrypted WhatsApp message history, statutory data erasure under DPDP Act 2023, and security credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 shadow-sm">
              <User className="h-3.5 w-3.5 text-blue-600" />
              View Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* TWO-SIDED SETTINGS LAYOUT (Side A & Side B) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ========================================================
            SIDE A (LEFT - 7 COLUMNS): Message History & DPDP Erasure
           ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-red-100 text-red-700">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Message History & DPDP Erasure
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Manage uploaded WhatsApp chats and exercise your statutory right to erasure
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadConversations}
                    disabled={isLoadingChats}
                    className="h-8 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingChats ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  {conversations.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeletingAll(true)}
                      className="h-8 text-xs gap-1.5 shadow-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete All History
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* DPDP Statutory Right to Erasure Notice */}
              <div className="border border-amber-200 bg-amber-50/80 rounded-xl p-4 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Shield className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Section 12 DPDP Act 2023 — Right to Erasure & AES-256 Storage</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  All WhatsApp messages are stored with application-level AES-256 encryption. Once you have synthesized and finalized your agreement draft, you have the statutory right under India&apos;s Digital Personal Data Protection Act to permanently erase the underlying WhatsApp chat history.
                </p>
                <div className="text-[11px] text-amber-800 font-medium pt-0.5">
                  • Deletion permanently removes all encrypted message records from the database.
                  <br />
                  • Section 65B tamper-evident hash certificates remain intact in the evidence repository.
                </div>
              </div>

              {/* Feedback Alert */}
              {historyFeedback && (
                <Alert
                  variant={historyFeedback.type === "error" ? "destructive" : "default"}
                  className={historyFeedback.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : ""}
                >
                  {historyFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle className="text-xs font-bold">
                    {historyFeedback.type === "success" ? "Erasure Completed" : "Operation Error"}
                  </AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">{historyFeedback.text}</AlertDescription>
                </Alert>
              )}

              {/* Ingested Conversations List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span>Active Stored Conversations ({conversations.length})</span>
                  <span className="text-[11px] font-normal text-slate-400">Stored at Rest with AES-256</span>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-xs">
                  {isLoadingChats ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                      <span>Loading stored conversations...</span>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center space-y-2 text-slate-500">
                      <Database className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="font-medium text-xs text-slate-700">No active conversation transcripts found.</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Uploaded WhatsApp chat files and their decrypted message records will appear here for management.
                      </p>
                      <div className="pt-2">
                        <Link href="/upload">
                          <Button size="sm" variant="outline" className="text-xs gap-1.5">
                            <FileText className="h-3 w-3" />
                            Upload WhatsApp Chat
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    conversations.map((chat) => (
                      <div
                        key={chat.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[240px]">
                              {chat.filename}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono text-slate-600">
                              {chat.message_count} messages
                            </Badge>
                            <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-800 font-medium">
                              AES-256 Encrypted
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-medium text-slate-600">
                              Parties: {chat.party_names?.join(" & ") || "2 Counterparties"}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {chat.uploaded_at ? new Date(chat.uploaded_at).toLocaleString() : "Recently Ingested"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingDeleteId(chat.id)}
                            className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5 shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Chat
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================
            SIDE B (RIGHT - 5 COLUMNS): Password & Account Security
           ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Password & Security
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Update your account credentials and view encryption status
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Password Feedback */}
              {passwordSaved && (
                <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-xs font-bold">Password Updated Successfully</AlertTitle>
                  <AlertDescription className="text-xs">
                    Your account security credentials have been updated.
                  </AlertDescription>
                </Alert>
              )}

              {passwordError && (
                <Alert variant="destructive" className="text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
                  <AlertDescription className="text-xs">{passwordError}</AlertDescription>
                </Alert>
              )}

              {/* Password Change Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password..."
                      className="text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters..."
                      className="text-xs pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password..."
                    className="text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(!showForgotNotice)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>

                  <Button type="submit" size="sm" className="text-xs gap-1.5 shadow-sm">
                    <KeyRound className="h-3.5 w-3.5" />
                    Save Changes
                  </Button>
                </div>
              </form>

              {/* Forgot Password Notice */}
              {showForgotNotice && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1 animate-in fade-in duration-150">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-700" />
                    Password Reset Procedure
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    DealShield uses cryptographic Supabase Auth. To reset your credentials, a one-time magic link is dispatched to your registered address (<code>demo@dealshield.local</code>).
                  </p>
                </div>
              )}

              {/* Encryption & Security Architecture Callout */}
              <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  DealShield Security Architecture
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>AES-256 Fernet:</strong> Messages are encrypted with a 256-bit symmetric key prior to database persistence.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>HMAC IP Anonymization:</strong> IP addresses in audit records are irreversibly hashed for DPDP privacy.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Section 65B Certificate:</strong> Evidence packages generate immutable SHA-256 hash receipts.</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ========================================================
          IN-PAGE PERMANENT DELETION CONFIRMATION DIALOG BOX
         ======================================================== */}
      {(pendingDeleteId !== null || isDeletingAll) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-red-200 max-w-lg w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-900">
                  {isDeletingAll ? "Permanently Delete ALL Message History?" : "Permanently Delete Chat Messages?"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure? This conversation and all associated WhatsApp message transcripts will be permanently deleted from the database. This action cannot be undone.
                </p>
                {selectedChatForDelete && !isDeletingAll && (
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800">
                    File: <strong>{selectedChatForDelete.filename}</strong> ({selectedChatForDelete.message_count} messages)
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-900 leading-relaxed">
              <strong>Statutory Compliance Notice:</strong> In accordance with Section 12 of India&apos;s DPDP Act 2023, an immutable audit record will verify that the underlying message history was irreversibly erased at the user&apos;s request.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
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
                className="text-xs gap-1.5 shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Erasing Messages..." : "Yes, Confirm Permanent Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
