"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { DashboardStats, DashboardRecentConversation } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";

function formatTimestamp(isoString: string): string {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err?.message || "Failed to load live workspace metrics from database.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived metrics
  const totalConversations = stats?.total_conversations ?? 0;
  const totalAgreements = stats?.total_agreements ?? 0;
  const confirmedAgreements = stats?.confirmed_agreements ?? 0;
  const totalHashes = stats?.total_hashes ?? 0;
  const recentConversations = stats?.recent_conversations ?? [];

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Contract Workspace Dashboard
            </h1>
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {user?.organization ? (
              <span>{user.organization} • </span>
            ) : null}
            Live WhatsApp negotiations, legal terms analysis, and counterparty assent records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={isLoading || isRefreshing}
            className="gap-2 text-slate-600 border-slate-300 hover:bg-slate-50"
            title="Refresh live data from database"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Link href="/upload">
              <Upload className="h-4 w-4" /> Ingest New Chat
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-3 text-red-900 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to fetch real-time workspace data</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData()}
            className="border-red-300 text-red-800 hover:bg-red-100 shrink-0 text-xs"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Ingested Negotiations */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-slate-500">
              Active Negotiations
            </CardDescription>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <CardTitle className="text-2xl font-bold text-slate-900">
                {totalConversations}
              </CardTitle>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {totalConversations === 1
                ? "1 chat transcript ingested"
                : `${totalConversations} chat transcripts ingested`}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Agreements Generated */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-slate-500">
              Agreements Generated
            </CardDescription>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <CardTitle className="text-2xl font-bold text-slate-900">
                {totalAgreements}
              </CardTitle>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {totalAgreements === 0
                ? "No agreements drafted yet"
                : `${totalAgreements} structured legal contracts`}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Confirmed Agreements / Mutual Assent */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-slate-500">
              Confirmed Agreements
            </CardDescription>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <CardTitle className="text-2xl font-bold text-slate-900">
                {confirmedAgreements}
              </CardTitle>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {confirmedAgreements > 0
                ? "Mutual assent recorded"
                : "Awaiting counterparty assent"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Integrity Vault Hashes */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-slate-500">
              Vault Fingerprints
            </CardDescription>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <CardTitle className="text-2xl font-bold text-slate-900">
                {totalHashes}
              </CardTitle>
            )}
            <p className="text-xs text-slate-500 mt-1">
              100% SHA-256 tamper-evident
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real Ingested Negotiations Section */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Recent WhatsApp Negotiations
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Conversations ingested and structured through the DealShield AI pipeline.
              </CardDescription>
            </div>
            {!isLoading && (
              <Badge variant="outline" className="border-slate-300 text-slate-600 font-medium w-fit">
                {recentConversations.length} {recentConversations.length === 1 ? "Record" : "Records"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            /* Loading Skeletons */
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 animate-pulse"
                >
                  <div className="space-y-2 w-2/3">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-24 bg-slate-200 rounded" />
                    <div className="h-8 w-20 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentConversations.length > 0 ? (
            /* Real Database Rows */
            <div className="divide-y divide-slate-100 text-sm">
              {recentConversations.map((conv: DashboardRecentConversation) => {
                const partiesLabel =
                  conv.party_names && conv.party_names.length > 0
                    ? conv.party_names.join(" & ")
                    : "Unassigned Counterparties";

                return (
                  <div
                    key={conv.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 leading-snug">
                          {partiesLabel}
                          <span className="text-xs text-slate-400 font-normal ml-2">
                            ({conv.filename})
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {conv.message_count} {conv.message_count === 1 ? "message" : "messages"} • Uploaded {formatTimestamp(conv.uploaded_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:self-center self-end">
                      <Badge variant={conv.status_variant as any}>
                        {conv.status}
                      </Badge>

                      {conv.agreement_id ? (
                        <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 text-xs font-medium">
                          <Link href={`/agreements?agreement_id=${encodeURIComponent(conv.agreement_id)}`}>
                            View Agreement <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : conv.analysis_id ? (
                        <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 text-xs font-medium">
                          <Link href={`/analysis?chat_id=${encodeURIComponent(conv.id)}`}>
                            View Analysis <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" asChild className="gap-1.5 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white">
                          <Link href={`/analysis?chat_id=${encodeURIComponent(conv.id)}`}>
                            Analyze Chat <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Friendly Empty State */
            <div className="py-12 px-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No negotiations uploaded yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                Upload your first exported WhatsApp negotiation (.txt) to automatically extract agreed commercial terms, resolve conflicting commitments, and create enforceable contracts.
              </p>
              <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/upload">
                  <Upload className="h-4 w-4" /> Ingest Your First Chat
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </AuthGuard>
);
}
