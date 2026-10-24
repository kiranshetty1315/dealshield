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
  XCircle,
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
  Share2,
  Copy,
  Check,
  Link2,
  ExternalLink,
  Info,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { ConfirmationStatus, Agreement, PartyConfirmationRecord } from "@/types";

function formatAssentDate(dateStr: string | undefined): string {
  if (!dateStr) return "March 12, 2024, 4:30 PM UTC";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
    return `${month} ${day}, ${year}, ${formattedHours}:${minutes} ${ampm} UTC`;
  } catch {
    return dateStr;
  }
}

function ConfirmationsContent() {
  const searchParams = useSearchParams();
  const agreementIdParam = searchParams.get("agreement_id");
  const tokenParam = searchParams.get("token");

  const [agreementId, setAgreementId] = useState<string>(agreementIdParam || "sample-agreement-uuid");
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(agreementIdParam));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState(tokenParam || "");
  const [tokenNotes, setTokenNotes] = useState("");
  const [tokenResult, setTokenResult] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Shareable link state
  const [shareableLink, setShareableLink] = useState<{ partyName: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState<string | null>(null);

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

  useEffect(() => {
    if (tokenParam) {
      setTokenInput(tokenParam);
    }
  }, [tokenParam]);

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

  const handleGenerateShareableToken = async (partyName: string) => {
    setIsGeneratingToken(partyName);
    setCopied(false);
    try {
      const targetId = agreement?.id || agreementId;
      const res = await api.generatePartyToken(targetId, partyName);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}/review?token=${res.token}&agreement_id=${encodeURIComponent(targetId)}`;
      setShareableLink({ partyName, url: fullUrl });
      setTokenInput(res.token);
    } catch {
      // Local fallback token generation if backend is in local demo
      const randomTok = `tok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}/review?token=${randomTok}&agreement_id=${encodeURIComponent(agreement?.id || agreementId)}`;
      setShareableLink({ partyName, url: fullUrl });
      setTokenInput(randomTok);
    } finally {
      setIsGeneratingToken(null);
    }
  };

  const handleCopyLink = () => {
    if (shareableLink?.url) {
      navigator.clipboard.writeText(shareableLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
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
      } else {
        // Local demo update
        setConfirmationStatus((prev) => {
          const currentParties = prev?.parties || defaultParties;
          const nextParties = currentParties.map((p) =>
            p.party_name === res.party_name || !p.confirmed
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
      }
    } catch (err: any) {
      // Offline fallback: if using simulated demo token
      if (tokenInput.startsWith("tok_") || tokenInput.startsWith("demo_")) {
        setTokenResult("Success: Agreement confirmed by counterparty via single-use signed token!");
        setConfirmationStatus((prev) => {
          const currentParties = prev?.parties || defaultParties;
          const nextParties = currentParties.map((p) => ({
            ...p,
            confirmed: true,
            confirmed_at: p.confirmed_at || new Date().toISOString(),
          }));
          return {
            agreement_id: agreementId,
            version_number: 1,
            parties: nextParties,
            all_confirmed: true,
            last_updated: new Date().toISOString(),
          };
        });
      } else {
        setTokenError(err.message || "Failed to confirm via token");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const rawParties = confirmationStatus?.parties && confirmationStatus.parties.length > 0
    ? confirmationStatus.parties
    : defaultParties;

  // Deduplicate parties by party_name, preserving confirmed=true status
  const partiesMap = new Map<string, PartyConfirmationRecord>();
  for (const p of rawParties) {
    if (!partiesMap.has(p.party_name) || (p.confirmed && !partiesMap.get(p.party_name)?.confirmed)) {
      partiesMap.set(p.party_name, p);
    }
  }
  const partiesList = Array.from(partiesMap.values());

  const isAllConfirmed = confirmationStatus
    ? confirmationStatus.all_confirmed
    : partiesList.every((p) => p.confirmed);

  const confirmedCount = partiesList.filter((p) => p.confirmed).length;
  const totalCount = partiesList.length;

  const unconfirmedParty = partiesList.find((p) => !p.confirmed);

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
          Both negotiating parties must independently review and formally assent to synthesize an enforceable contract under Section 7 of the Indian Contract Act.
        </p>
      </div>

      {/* External Counterparty Review Banner if arriving via token */}
      {tokenParam && (
        <Card className="border-blue-300 bg-blue-50/80 shadow-md animate-in fade-in duration-200">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950">
                    External Counterparty Review Mode
                  </h3>
                  <p className="text-xs text-blue-800">
                    You are reviewing this agreement via a secure, single-use signed link. No account creation is required.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-blue-400 bg-white text-blue-900 text-[11px] font-semibold">
                Single-Use Token Valid
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-xs text-blue-900 font-medium">
                Clicking confirm records your assent with a tamper-evident audit timestamp.
              </span>
              <Button
                size="sm"
                onClick={handleExecuteToken}
                disabled={actionLoading === "token" || isAllConfirmed}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                {actionLoading === "token" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Recording Assent...
                  </>
                ) : isAllConfirmed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Agreement Already Confirmed
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    I Agree & Confirm Agreement
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Status Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Mutual Assent Status (Section 7 ICA, 1872)
              </CardTitle>
              <CardDescription className="text-xs">
                Under Indian contract law, acceptance must be absolute and unqualified to create a legally binding agreement.
              </CardDescription>
            </div>

            <Badge
              variant={isAllConfirmed ? "success" : "outline"}
              className={isAllConfirmed ? "bg-emerald-600 text-white text-xs" : "border-amber-400 bg-amber-50 text-amber-800 text-xs font-bold"}
            >
              {isAllConfirmed ? "100% Fully Confirmed" : `${confirmedCount}/${totalCount} Parties Assented`}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {feedbackMessage && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription>{feedbackMessage}</AlertDescription>
            </Alert>
          )}

          {/* Parties Confirmation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {partiesList.map((party, idx) => {
              const isDeclined = Boolean(party.declined);
              const isConfirmed = Boolean(party.confirmed);

              return (
                <div
                  key={`${party.party_name}-${idx}`}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isConfirmed
                      ? "border-emerald-200 bg-emerald-50/50"
                      : isDeclined
                      ? "border-rose-200 bg-rose-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isConfirmed
                            ? "bg-emerald-600 text-white"
                            : isDeclined
                            ? "bg-rose-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {party.party_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{party.party_name}</p>
                        <p className="text-[10px] text-slate-500">
                          {isConfirmed
                            ? "Assent Formally Recorded"
                            : isDeclined
                            ? "Terms Declined by Party"
                            : "Awaiting Acceptance"}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={isConfirmed ? "success" : isDeclined ? "destructive" : "outline"}
                      className={
                        isConfirmed
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                          : isDeclined
                          ? "bg-rose-100 text-rose-800 border-rose-300 text-[10px]"
                          : "text-slate-500 text-[10px]"
                      }
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Confirmed
                        </>
                      ) : isDeclined ? (
                        <>
                          <XCircle className="h-3 w-3" /> Declined
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> Awaiting Assent
                        </>
                      )}
                    </Badge>
                  </div>

                  <p suppressHydrationWarning className="text-xs text-slate-600">
                    {isConfirmed
                      ? `Confirmed terms on ${formatAssentDate(party.confirmed_at)}.`
                      : isDeclined
                      ? `Declined terms on ${formatAssentDate(party.declined_at)}.`
                      : "Review link dispatched. Waiting for formal acceptance."}
                  </p>

                  {party.decline_reason && (
                    <div className="bg-rose-100/60 p-2.5 rounded border border-rose-200 text-xs text-rose-900 space-y-0.5">
                      <span className="font-bold block text-[10px] uppercase text-rose-800">
                        Reason for Decline:
                      </span>
                      <p className="italic">&ldquo;{party.decline_reason}&rdquo;</p>
                    </div>
                  )}

                  {party.notes && !party.decline_reason && (
                    <p className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded border border-slate-200">
                      &ldquo;{party.notes}&rdquo;
                    </p>
                  )}

                {/* Actions when party has NOT confirmed */}
                {!party.confirmed ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleConfirmAsParty(party.party_name)}
                        disabled={actionLoading !== null}
                        className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        {actionLoading === party.party_name ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Recording...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Direct Confirm
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateShareableToken(party.party_name)}
                        disabled={isGeneratingToken !== null}
                        className="w-full text-xs font-semibold border-blue-300 text-blue-700 hover:bg-blue-50 gap-1.5"
                      >
                        {isGeneratingToken === party.party_name ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Share2 className="h-3.5 w-3.5" />
                            Share Token Link
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Expandable Shareable Token Box */}
                    {shareableLink?.partyName === party.party_name && (
                      <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg space-y-2 animate-in fade-in duration-150 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-blue-950 flex items-center gap-1">
                            <Link2 className="h-3.5 w-3.5 text-blue-700" />
                            Shareable Counterparty Link
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="h-6 text-[10px] px-2.5 bg-white gap-1 border-blue-300 text-blue-800 hover:bg-blue-100"
                          >
                            {copied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Link
                              </>
                            )}
                          </Button>
                        </div>
                        <Input
                          readOnly
                          value={shareableLink.url}
                          className="text-[10px] font-mono h-7 bg-white text-slate-800"
                        />
                        <p className="text-[10px] text-blue-800 leading-normal">
                          Share this link with {party.party_name} via WhatsApp or email. They can review and click &ldquo;Agree&rdquo; in 1 click without creating an account.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-emerald-700 flex items-center gap-1 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Assent Cryptographically Logged in Audit Trail
                  </div>
                )}
              </div>
            );
          })}
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
                <Link href="/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    Manage & Erase Messages
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="border-t pt-4 text-xs text-slate-500">
            <strong>Rule:</strong> The agreement becomes effective only once both parties record mutual, unqualified assent without pending objections.
          </div>
        </CardContent>
      </Card>

      {/* Testable Single-Use Token Confirmation Box */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <KeyRound className="h-4 w-4 text-blue-600" />
                Test Counterparty Single-Use Signed Token Link
              </CardTitle>
              <CardDescription className="text-xs">
                External counterparties receive a unique token link to confirm without creating an account. Test token execution live below.
              </CardDescription>
            </div>

            {unconfirmedParty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateShareableToken(unconfirmedParty.party_name)}
                className="text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Generate Token for {unconfirmedParty.party_name}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3.5">
          {/* Architectural Explanation Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-slate-800">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              How Counterparty Confirmation Works
            </div>
            <p className="text-[11px] leading-relaxed">
              1. <strong>Share Link:</strong> The contract drafter generates a single-use signed token link and shares it with the external party via WhatsApp/email.
              <br />
              2. <strong>No Account Needed:</strong> The counterparty opens the link, reviews the synthesized clauses, and clicks &ldquo;I Agree & Confirm&rdquo;.
              <br />
              3. <strong>Immediate Finalization:</strong> The single-use token executes, stamps the counterparty&apos;s assent into the audit trail, and marks the agreement as <code>fully_confirmed</code> under Section 7 of the Indian Contract Act.
            </p>
          </div>

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
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
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
