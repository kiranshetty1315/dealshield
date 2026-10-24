"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Send,
  Loader2,
  Database,
  FileCheck2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { ConfirmationStatus, Agreement, PartyConfirmationRecord } from "@/types";

function ConfirmationsContent() {
  const searchParams = useSearchParams();
  const agreementIdParam = searchParams.get("agreement_id");

  const [agreementId, setAgreementId] = useState<string>(agreementIdParam || "sample-agreement-uuid");
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(agreementIdParam));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenNotes, setTokenNotes] = useState("");
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isErasureModalOpen, setIsErasureModalOpen] = useState(false);

  // Default demo fallback if no live agreement
  const defaultParties: PartyConfirmationRecord[] = [
    {
      party_name: "Raj Mehta",
      confirmed: true,
      confirmed_at: "2024-03-12T11:00:00Z",
      notes: "Agreed to 50% advance upon contract signing",
    },
    {
      party_name: "Priya Sharma",
      confirmed: false,
    },
  ];

  const refreshStatus = async (targetId: string) => {
    try {
      const [statusData, agData] = await Promise.all([
        api.getConfirmationStatus(targetId).catch(() => null),
        api.getAgreement(targetId).catch(() => null),
      ]);
      if (statusData) setConfirmationStatus(statusData);
      if (agData) setAgreement(agData);
    } catch (e) {
      console.warn("Could not fetch confirmation status:", e);
    }
  };

  useEffect(() => {
    if (!agreementIdParam) return;

    setIsLoading(true);
    refreshStatus(agreementIdParam).finally(() => setIsLoading(false));
  }, [agreementIdParam]);

  const handleConfirmAsParty = async (partyName: string) => {
    setActionLoading(partyName);
    setFeedbackMessage(null);
    try {
      if (agreement) {
        const updatedStatus = await api.submitConfirmation(
          agreement.id,
          partyName,
          true,
          `Direct dashboard confirmation by ${partyName}`
        );
        setConfirmationStatus(updatedStatus);
        await refreshStatus(agreement.id);
        setFeedbackMessage(`Successfully recorded confirmation for ${partyName} in database.`);
      } else {
        // Local simulation for demo mode
        setConfirmationStatus((prev) => {
          const currentParties = prev?.parties || defaultParties;
          const nextParties = currentParties.map((p) =>
            p.party_name === partyName
              ? { ...p, confirmed: true, confirmed_at: new Date().toISOString() }
              : p
          );
          return {
            agreement_id: agreementId,
            version_number: 1,
            parties: nextParties,
            all_confirmed: nextParties.every((p) => p.confirmed),
            last_updated: new Date().toISOString(),
          };
        });
        setFeedbackMessage(`Demo mode: Recorded confirmation for ${partyName}.`);
      }
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecuteToken = async () => {
    if (!tokenInput.trim()) return;

    setActionLoading("token");
    setTokenResult(null);
    setTokenError(null);
    try {
      const res = await api.confirmByToken(tokenInput.trim(), tokenNotes || undefined);
      setTokenResult(`Success: Agreement confirmed by ${res.party_name}!`);
      if (res.agreement_id) {
        await refreshStatus(res.agreement_id);
      }
    } catch (err: any) {
      setTokenError(err.message || "Failed to confirm via token");
    } finally {
      setActionLoading(null);
    }
  };

  const partiesList = confirmationStatus?.parties || defaultParties;
  const isAllConfirmed = confirmationStatus
    ? confirmationStatus.all_confirmed
    : partiesList.every((p) => p.confirmed);

  const confirmedCount = partiesList.filter((p) => p.confirmed).length;
  const totalCount = partiesList.length;

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-extrabold text-slate-900">Two-Party Agreement Confirmation</h1>
          {agreement ? (
            <Badge
              variant="outline"
              className="border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-1"
            >
              <Database className="h-3 w-3" />
              Live Agreement ({agreement.id.slice(0, 8)}...)
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-semibold">
              Sample Demo Mode
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Independent mutual sign-off workflow via secure token-based single-use links and database-persisted assent.
        </p>
      </div>

      {feedbackMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Assent Recorded</AlertTitle>
          <AlertDescription>{feedbackMessage}</AlertDescription>
        </Alert>
      )}

      {/* Architecture Notice for Indian Contract Act & DPDP Act */}
      <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 text-xs text-blue-900 space-y-1">
        <div className="font-bold flex items-center gap-2 text-blue-950">
          <KeyRound className="h-4 w-4 text-blue-700" />
          Section 7 ICA & DPDP Act 2023 Compliant Confirmation
        </div>
        <p className="leading-relaxed">
          Under Section 7 of the Indian Contract Act 1872, an agreement becomes legally binding only when both parties record absolute, unqualified mutual assent. IP addresses are hashed with cryptographic salt to ensure privacy compliance under the Digital Personal Data Protection Act (DPDP Act 2023).
        </p>
      </div>

      {/* Main Confirmation Card */}
      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="border-b bg-slate-50/60 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base text-slate-900">
                Agreement Status:{" "}
                <span className="capitalize font-bold">
                  {isAllConfirmed ? "Fully Confirmed" : confirmedCount > 0 ? "Partially Confirmed" : "Pending Confirmation"}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                {agreement ? `Agreement ID: ${agreement.id}` : "Services Agreement v1.0 • Website Redesign"}
              </CardDescription>
            </div>
            <Badge
              variant={isAllConfirmed ? "success" : "warning"}
              className="px-2.5 py-1 text-xs font-semibold"
            >
              {confirmedCount} of {totalCount} Confirmed
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Parties Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partiesList.map((party, idx) => (
              <div
                key={party.party_name}
                className={`border rounded-lg p-5 space-y-3 transition-colors ${
                  party.confirmed
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-amber-200 bg-amber-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    {party.party_name} {idx === 0 ? "(Client)" : "(Service Provider)"}
                  </span>
                  <Badge variant={party.confirmed ? "success" : "warning"} className="gap-1 text-xs">
                    {party.confirmed ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" /> Awaiting Assent
                      </>
                    )}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600">
                  {party.confirmed
                    ? `Confirmed terms on ${party.confirmed_at ? new Date(party.confirmed_at).toLocaleString() : "March 12, 2024"}.`
                    : "Review link dispatched. Waiting for formal acceptance."}
                </p>

                {party.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded border border-slate-200">
                    &ldquo;{party.notes}&rdquo;
                  </p>
                )}

                {!party.confirmed ? (
                  <Button
                    size="sm"
                    onClick={() => handleConfirmAsParty(party.party_name)}
                    disabled={actionLoading !== null}
                    className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    {actionLoading === party.party_name ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Recording Confirmation...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirm Agreement as {party.party_name}
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Assent Cryptographically Logged in Audit Trail
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Fully Confirmed Celebration Banner */}
          {isAllConfirmed && (
            <div className="space-y-3">
              <div className="border border-emerald-300 bg-emerald-50 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold text-emerald-950 text-sm">
                      Agreement Fully Confirmed by Both Parties!
                    </span>
                  </div>
                  <Link href={`/evidence?entity_id=${encodeURIComponent(agreement?.id || agreementId)}`}>
                    <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Inspect Section 65B Evidence Vault
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-emerald-800">
                  Both parties have unconditionally assented under Section 7 of the Indian Contract Act. An immutable SHA-256 digital certificate is preserved in the evidence repository.
                </p>
              </div>

              {/* DPDP Act Message Erasure Option */}
              <div className="border border-blue-200 bg-blue-50/70 p-4 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4 text-blue-700" />
                    Agreement Finalized? Exercise DPDP Act Right to Erasure
                  </span>
                  <p className="text-blue-800 text-[11px]">
                    Now that all obligations are formalized into the executed agreement, you can permanently erase underlying WhatsApp chat messages from the database.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsErasureModalOpen(true)}
                  className="shrink-0 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  Manage & Erase Messages
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-4 text-xs text-slate-500">
            <strong>Rule:</strong> The agreement becomes effective only once both parties record mutual, unqualified assent without pending objections.
          </div>
        </CardContent>
      </Card>

      {/* Settings & Message Erasure Modal */}
      <SettingsModal
        isOpen={isErasureModalOpen}
        onClose={() => setIsErasureModalOpen(false)}
        initialTab="history"
      />

      {/* Testable Single-Use Token Confirmation Box */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
            <KeyRound className="h-4 w-4 text-blue-600" />
            Test Counterparty Single-Use Signed Token Link
          </CardTitle>
          <CardDescription className="text-xs">
            External counterparties receive a unique token link to confirm without creating an account. Test token execution live below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Paste raw confirmation token..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="text-xs font-mono"
            />
            <Input
              placeholder="Optional confirmation remarks / notes..."
              value={tokenNotes}
              onChange={(e) => setTokenNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <Button
            size="sm"
            onClick={handleExecuteToken}
            disabled={actionLoading === "token" || !tokenInput.trim()}
            className="text-xs gap-1.5"
            variant="outline"
          >
            {actionLoading === "token" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Executing Token...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Execute Token Confirmation via API
              </>
            )}
          </Button>

          {tokenResult && (
            <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{tokenResult}</AlertDescription>
            </Alert>
          )}

          {tokenError && (
            <Alert variant="destructive" className="text-xs">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{tokenError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmationsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700">Loading Confirmations View...</p>
        </div>
      }
    >
      <ConfirmationsContent />
    </Suspense>
  );
}
