"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  KeyRound,
  Lock,
  Database,
  FileCheck2,
  Settings,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Building,
  Mail,
  Fingerprint,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";

export default function ProfilePage() {
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const chats = await api.listChats();
        setChatCount(chats.length);
      } catch {
        setChatCount(0);
      }
    }
    loadStats();
  }, []);

  const handleConfirmLogout = () => {
    setLoggedOut(true);
    setIsLogoutDialogOpen(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">User Profile</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="h-7 w-7 text-blue-600" />
            User Profile & Credentials
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your personal identity, organization verification, and statutory compliance status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 shadow-sm">
              <Settings className="h-3.5 w-3.5 text-slate-600" />
              Settings & Privacy
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsLogoutDialogOpen(true)}
            className="text-xs gap-1.5 shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Logged Out Banner if triggered */}
      {loggedOut && (
        <div className="border border-emerald-300 bg-emerald-50 rounded-2xl p-5 text-emerald-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">Successfully Logged Out</p>
              <p className="text-xs text-emerald-800">
                You have been safely signed out of your DealShield local demo session.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setLoggedOut(false)}
            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Re-enter Demo Session
          </Button>
        </div>
      )}

      {/* Main Profile Identity Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Badge className="bg-white/90 text-blue-900 text-xs font-semibold backdrop-blur-sm border-0 shadow-xs">
              Contract Sponsor
            </Badge>
            <Badge className="bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-sm border-0 shadow-xs flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Verified Identity
            </Badge>
          </div>
        </div>

        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 shrink-0">
                <div className="h-full w-full rounded-xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-inner">
                  DS
                </div>
              </div>
              <div className="space-y-0.5 pb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Demo User</h2>
                <p className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  demo@dealshield.local
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button size="sm" className="text-xs gap-1.5 shadow-xs">
                  <KeyRound className="h-3.5 w-3.5" />
                  Change Password & Security
                </Button>
              </Link>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Building className="h-3 w-3 text-slate-500" />
                Organization
              </span>
              <p className="text-xs font-bold text-slate-800">DealShield LegalTech Hackathon</p>
              <p className="text-[11px] text-slate-500">Autonomous Contract Integrity Unit</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Fingerprint className="h-3 w-3 text-slate-500" />
                Account Identifier (UUID)
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate">
                00000000-0000-0000-0000-000000000001
              </p>
              <p className="text-[11px] text-slate-500">Dual-Mode Fallback & Supabase ID</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-500" />
                Member Since
              </span>
              <p className="text-xs font-bold text-slate-800">October 2026</p>
              <p className="text-[11px] text-emerald-600 font-medium">Active Production Demo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statutory Legal & Security Compliance Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Shield className="h-4 w-4 text-emerald-600" />
              Statutory Security Standards
            </CardTitle>
            <CardDescription className="text-xs">
              Cryptographic safeguards enforcing Indian legal standards
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div className="p-2 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">AES-256 Message Encryption</span>
                <p className="text-[11px] text-slate-500">
                  Transcripts and raw WhatsApp messages are encrypted at rest with Fernet symmetric cryptography.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div className="p-2 rounded-md bg-blue-50 text-blue-700 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">DPDP Act 2023 Compliance</span>
                <p className="text-[11px] text-slate-500">
                  Supports Section 12 Right to Erasure with irreversible database purging and HMAC IP anonymization.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <div className="p-2 rounded-md bg-purple-50 text-purple-700 shrink-0">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">Section 65B Admissibility</span>
                <p className="text-[11px] text-slate-500">
                  Every finalized agreement generates a cryptographically hashed certificate for judicial submission.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Database className="h-4 w-4 text-blue-600" />
              Account Storage & Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Live metrics across negotiations and agreements
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-1">
                <span className="text-2xl font-extrabold text-blue-700 font-mono">
                  {chatCount !== null ? chatCount : "..."}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">Ingested Chats</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-1">
                <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                  100%
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">AES-256 Encrypted</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Quick Navigation</span>
              <div className="flex flex-col gap-2">
                <Link href="/settings" className="w-full">
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                    <span className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-slate-500" />
                      Manage Message Erasure & Passwords
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </Button>
                </Link>

                <Link href="/upload" className="w-full">
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Upload New WhatsApp Chat
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LOGOUT CONFIRMATION DIALOG BOX */}
      {isLogoutDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                <LogOut className="h-6 w-6 text-slate-700" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-900">Confirm Log Out</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to log out of your DealShield AI session? Any unsaved edits will be discarded.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              In production, logging out terminates your active Supabase Auth JWT session.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmLogout}
                className="text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                Yes, Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
