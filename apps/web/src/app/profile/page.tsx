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
  Edit2,
  Save,
  X,
  FileText,
  Activity,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { DashboardStats } from "@/types";

function formatMemberDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Registered Account Member";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ProfilePage() {
  const { user, logout, updateUser, refreshUser, isLoading: isAuthLoading } = useAuth();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editOrganization, setEditOrganization] = useState("");
  const [editRole, setEditRole] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoadingStats(true);
      try {
        const stats = await api.getDashboardStats();
        setDashboardStats(stats);
      } catch (err) {
        console.warn("Could not load database stats for profile:", err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadData();
    refreshUser();
  }, [refreshUser]);

  const handleStartEdit = () => {
    setEditFullName(user?.full_name || "");
    const currentOrg =
      user?.organization && user.organization !== "DealShield LegalTech Hackathon"
        ? user.organization
        : "";
    setEditOrganization(currentOrg);
    setEditRole(user?.role || "Contract Sponsor");
    setSaveSuccess(null);
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setSaveError("Full name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      await updateUser({
        full_name: editFullName.trim(),
        organization: editOrganization.trim() || undefined,
        role: editRole.trim() || undefined,
      });
      setSaveSuccess("Profile successfully updated in PostgreSQL database.");
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutDialogOpen(false);
    await logout();
    setLoggedOut(true);
  };

  // Unauthenticated Empty State
  if (!isAuthLoading && !user && !loggedOut) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-xl text-center">
        <Card className="border-slate-200 shadow-sm p-8 space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            Sign In to Access Your Profile
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto">
            You must be logged in to view your account identity credentials, statutory evidence records, and organization details.
          </CardDescription>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              <Link href="/login">Log In to DealShield</Link>
            </Button>
            <Button asChild variant="outline" className="text-xs">
              <Link href="/signup">Create Free Account</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const displayName = user?.full_name || "DealShield User";
  const displayEmail = user?.email || "";
  const displayRole = user?.role || "Contract Sponsor";
  const hasRealOrg = Boolean(
    user?.organization &&
      user.organization !== "DealShield LegalTech Hackathon" &&
      user.organization.trim()
  );
  const displayOrg = hasRealOrg ? user!.organization.trim() : null;
  const displayId = user?.id || "";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DS";

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
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 shadow-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          )}

          <Link href="/settings">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-200 shadow-xs">
              <Settings className="h-3.5 w-3.5 text-slate-600" />
              Settings & Privacy
            </Button>
          </Link>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsLogoutDialogOpen(true)}
            className="text-xs gap-1.5 shadow-xs"
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
                You have been safely signed out of your DealShield database session.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
            <Link href="/login">Sign In Again</Link>
          </Button>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccess && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{saveSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <Alert variant="destructive" className="text-xs">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Inline Edit Form */}
      {isEditing && (
        <Card className="border-blue-300 bg-blue-50/40 shadow-sm animate-in fade-in duration-150">
          <CardHeader className="pb-3 border-b border-blue-100 bg-blue-50/70">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600" />
                Edit Profile Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs text-blue-800">
              Update your commercial identity. Changes are directly saved to the Supabase database.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <Input
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Your legal name"
                    required
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Organization / Law Firm</label>
                  <Input
                    value={editOrganization}
                    onChange={(e) => setEditOrganization(e.target.value)}
                    placeholder="Organization name"
                    className="text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Role in Negotiation</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Freelancer / Contractor">Freelancer / Contractor</option>
                    <option value="Client / Project Owner">Client / Project Owner</option>
                    <option value="Service Provider / Agency">Service Provider / Agency</option>
                    <option value="Consultant / Advisor">Consultant / Advisor</option>
                    <option value="Founder / Business Owner">Founder / Business Owner</option>
                    <option value="Contract Sponsor">Contract Sponsor</option>
                    <option value="Legal Counsel / Advocate">Legal Counsel / Advocate</option>
                    <option value="Commercial Manager">Commercial Manager</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving to Database...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Profile Identity Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Badge className="bg-white/90 text-blue-900 text-xs font-semibold backdrop-blur-sm border-0 shadow-xs">
              {displayRole}
            </Badge>
            <Badge className="bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-sm border-0 shadow-xs flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Database Verified Account
            </Badge>
          </div>
        </div>

        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 shrink-0">
                <div className="h-full w-full rounded-xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-inner">
                  {initials}
                </div>
              </div>
              <div className="space-y-0.5 pb-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{displayName}</h2>
                <p className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {displayEmail}
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
              {displayOrg ? (
                <>
                  <p className="text-xs font-bold text-slate-800">{displayOrg}</p>
                  <p className="text-[11px] text-slate-500">Commercial Contracting Entity</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 italic flex items-center gap-1.5 pt-0.5">
                    <span>Not specified</span>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-blue-600 font-semibold not-italic hover:underline cursor-pointer"
                    >
                      &bull; Add Organization
                    </button>
                  </p>
                  <p className="text-[11px] text-slate-400">Independent Negotiator</p>
                </>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Fingerprint className="h-3 w-3 text-slate-500" />
                Account Identifier (UUID)
              </span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={displayId}>
                {displayId}
              </p>
              <p className="text-[11px] text-slate-500">PostgreSQL / Supabase Identity Record</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-500" />
                Member Since
              </span>
              <p className="text-xs font-bold text-slate-800">
                {formatMemberDate(user?.created_at)}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">Active Database User</p>
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
                  Transcripts and raw WhatsApp messages are encrypted at rest with Fernet symmetric cryptography in Supabase.
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
                <span className="font-bold text-slate-900 block">Cryptographic Evidence Vault</span>
                <p className="text-[11px] text-slate-500">
                  Every finalized agreement generates a cryptographically hashed certificate recording mutual assent with tamper-evident audit trail.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Database Workspace Metrics */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Database className="h-4 w-4 text-blue-600" />
              Live Database Workspace Metrics
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time records queried directly from PostgreSQL database
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-1">
                <span className="text-2xl font-extrabold text-blue-700 font-mono">
                  {isLoadingStats ? "..." : dashboardStats?.total_conversations ?? 0}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">Ingested Chats</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-1">
                <span className="text-2xl font-extrabold text-indigo-700 font-mono">
                  {isLoadingStats ? "..." : dashboardStats?.total_agreements ?? 0}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">Synthesized Agreements</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-1">
                <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                  {isLoadingStats ? "..." : dashboardStats?.confirmed_agreements ?? 0}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">Confirmed Contracts</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 text-center space-y-1">
                <span className="text-2xl font-extrabold text-purple-700 font-mono">
                  {isLoadingStats ? "..." : dashboardStats?.total_hashes ?? 0}
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">SHA-256 Hashes</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Workspace Actions</span>
              <div className="flex flex-col gap-2">
                <Link href="/upload" className="w-full">
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Upload New Negotiation
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Button>
                </Link>

                <Link href="/settings" className="w-full">
                  <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                    <span className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-slate-500" />
                      Manage Message Erasure & Security
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Database Negotiations */}
      {dashboardStats && dashboardStats.recent_conversations && dashboardStats.recent_conversations.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Recent Negotiations in Database
                </CardTitle>
                <CardDescription className="text-xs">
                  Your latest transcripts saved in Supabase
                </CardDescription>
              </div>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-800 gap-1">
                  View All in Dashboard <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {dashboardStats.recent_conversations.slice(0, 5).map((conv) => {
                const partiesLabel =
                  conv.party_names && conv.party_names.length > 0
                    ? conv.party_names.join(" & ")
                    : "Unassigned Counterparties";

                return (
                  <div
                    key={conv.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {partiesLabel}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {conv.filename} &bull; {conv.message_count} messages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={conv.status_variant || "outline"}
                        className="text-[10px] hidden sm:inline-flex"
                      >
                        {conv.status}
                      </Badge>
                      <Link href={`/agreements?chat_id=${encodeURIComponent(conv.id)}`}>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                          View Agreement
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                  Are you sure you want to log out of your DealShield database session?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              Logging out terminates your authenticated JWT Bearer session and securely clears local storage credentials.
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
