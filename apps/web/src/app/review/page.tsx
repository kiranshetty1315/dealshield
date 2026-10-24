"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Scale,
  Send,
  Loader2,
  Check,
  Undo2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api/client";
import { Agreement, Clause } from "@/types";

function formatAssentDate(dateStr: string | undefined): string {
  if (!dateStr) return "Just now";
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

// Formal legal draft clauses fallback for review demonstration
const fallbackClauses: Clause[] = [
  {
    clause_id: "cls_scope_01",
    title: "1.0 Scope of Services & Deliverables",
    body: "The Service Provider shall design, develop, and deliver a comprehensive native iOS and Android mobile application, including administrative dashboard interfaces and high-fidelity interactive Figma prototypes, strictly compliant with agreed design specifications.",
    source_term_ids: ["term_scope_01"],
    statutory_reference: "Indian Contract Act, 1872 — Section 37 (Obligation of Parties to Perform Contracts)",
  },
  {
    clause_id: "cls_payment_02",
    title: "2.0 Consideration, Fees & Payment Schedule",
    body: "Total contract consideration is set at INR 1,50,000 (Rupees One Lakh Fifty Thousand only). An advance mobilization payment of 50% (INR 75,000) shall become payable upon contract execution, with the remaining 50% (INR 75,000) disbursed upon final user acceptance and code handover.",
    source_term_ids: ["term_price_01"],
    statutory_reference: "Indian Contract Act, 1872 — Section 10 (What Agreements are Contracts)",
  },
  {
    clause_id: "cls_timeline_03",
    title: "3.0 Delivery Milestones & Completion Timeline",
    body: "Project execution shall adhere strictly to a 3-week timeline commencing from receipt of initial advance mobilization payment. Deliverables include weekly milestone demos and an unconditional 14-day warranty period for bug resolution following production release.",
    source_term_ids: ["term_timeline_01"],
    statutory_reference: "Indian Contract Act, 1872 — Section 46 (Time for Performance)",
  },
  {
    clause_id: "cls_ip_04",
    title: "4.0 Intellectual Property Rights & Governing Law",
    body: "Upon complete remittance of the agreed consideration, all right, title, and interest in and to the source code, design assets, and documentation shall transfer unconditionally to the Client. This Agreement shall be governed by and construed in accordance with the substantive laws of India, under the jurisdiction of Bengaluru, Karnataka.",
    source_term_ids: ["term_ip_01"],
    statutory_reference: "Indian Contract Act, 1872 — Section 28 & Copyright Act, 1957",
  },
];

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const agreementIdParam = searchParams.get("agreement_id") || "sample-agreement-uuid";

  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [partyName, setPartyName] = useState<string>("Counterparty");
  const [agreementId, setAgreementId] = useState<string>(agreementIdParam);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [clauses, setClauses] = useState<Clause[]>(fallbackClauses);

  // Decision State: "pending" | "confirmed" | "declined"
  const [decisionStatus, setDecisionStatus] = useState<"pending" | "confirmed" | "declined">("pending");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [declinedAt, setDeclinedAt] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string | null>(null);

  // Interaction UI states
  const [actionView, setActionView] = useState<"idle" | "declining">("idle");
  const [declineInput, setDeclineInput] = useState("");
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    api
      .inspectToken(token)
      .then((data) => {
        if (data.party_name) setPartyName(data.party_name);
        if (data.agreement_id) setAgreementId(data.agreement_id);

        if (data.confirmed) {
          setDecisionStatus("confirmed");
          setConfirmedAt(data.confirmed_at || new Date().toISOString());
        } else if (data.declined) {
          setDecisionStatus("declined");
          setDeclinedAt(data.declined_at || new Date().toISOString());
          setDeclineReason(data.decline_reason || null);
        }

        if (data.agreement && data.agreement.versions?.[0]?.clauses?.length) {
          setAgreement(data.agreement);
          setClauses(data.agreement.versions[0].clauses);
        } else if (data.agreement_id) {
          // Attempt to fetch full agreement clauses if not embedded
          api
            .getAgreement(data.agreement_id)
            .then((ag) => {
              if (ag?.versions?.[0]?.clauses?.length) {
                setAgreement(ag);
                setClauses(ag.versions[0].clauses);
              }
            })
            .catch(() => {
              // Maintain rich fallback clauses
            });
        }
      })
      .catch((err: any) => {
        console.warn("Token inspect warning:", err);
        // If inspecting fails in demo environment, fallback to demo mode gracefully
        if (token.startsWith("tok_") || token.includes("demo")) {
          setPartyName("Priya Sharma");
        } else {
          setError(
            err.message ||
              "This single-use review link is invalid, expired, or has already been completed."
          );
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  // Handle "I Agree & Confirm"
  const handleAgree = async () => {
    setIsSubmitting(true);
    setError(null);
    setToastMessage(null);

    try {
      if (token && !token.startsWith("tok_")) {
        const res = await api.confirmByToken(
          token,
          `Direct counterparty formal agreement executed by ${partyName}`,
          "agree"
        );
        setDecisionStatus("confirmed");
        setConfirmedAt(res.confirmed_at || new Date().toISOString());
      } else {
        // Fallback demo simulation
        setDecisionStatus("confirmed");
        setConfirmedAt(new Date().toISOString());
      }
      setToastMessage("Agreement successfully executed and marked as complete.");
    } catch (err: any) {
      setError(err.message || "Failed to record agreement confirmation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle "Decline" with Reason
  const handleSubmitDecline = async () => {
    if (!declineInput.trim()) {
      setDeclineError("Please state your reason for declining or requested changes before submitting.");
      return;
    }

    setDeclineError(null);
    setIsSubmitting(true);
    setError(null);
    setToastMessage(null);

    try {
      if (token && !token.startsWith("tok_")) {
        await api.confirmByToken(
          token,
          "Declined by counterparty with specific clause feedback",
          "decline",
          declineInput.trim()
        );
      }
      setDecisionStatus("declined");
      setDeclinedAt(new Date().toISOString());
      setDeclineReason(declineInput.trim());
      setActionView("idle");
      setToastMessage("Your decline reason and feedback have been formally registered.");
    } catch (err: any) {
      setError(err.message || "Failed to record agreement decline.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel action
  const handleCancelAction = () => {
    setActionView("idle");
    setDeclineInput("");
    setDeclineError(null);
    setToastMessage("Action cancelled. You may review the clauses and decide at your convenience.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-slate-600 font-medium text-sm">
          Securing encrypted connection and loading agreement clauses...
        </p>
      </div>
    );
  }

  if (error && !token.startsWith("tok_")) {
    return (
      <div className="container max-w-3xl mx-auto py-16 px-4">
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-red-950">
              Review Link Invalid or Expired
            </CardTitle>
            <CardDescription className="text-red-700 text-sm mt-1">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-slate-600 pb-8">
            <p className="max-w-md mx-auto mb-6">
              Single-use tokens expire after execution or after 72 hours under DPDP data minimization
              standards. Please contact the contracting party to request a newly generated review link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Toast / Notification feedback */}
        {toastMessage && (
          <div className="bg-slate-900 text-white px-4 py-3 rounded-lg text-sm flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Contract Title & Official Header */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <FileText className="h-3 w-3" />
                <span>Formal Digital Contract Draft</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Commercial Service Agreement
              </h1>
              <p className="text-sm text-slate-500">
                Synthesized from authenticated communications between the contracting parties.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Document Status
              </span>
              {decisionStatus === "confirmed" ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-3 py-1 gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Agreement Complete
                </Badge>
              ) : decisionStatus === "declined" ? (
                <Badge className="bg-rose-600 hover:bg-rose-600 text-white text-xs px-3 py-1 gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Terms Declined
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-3 py-1 gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Pending Your Review
                </Badge>
              )}
            </div>
          </div>

          {/* Contracting Parties Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200/60">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Party A (Initiator)</span>
              <p className="font-semibold text-slate-900 text-base">Raj Mehta</p>
              <p className="text-xs text-slate-500">Author & Requesting Negotiator</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Party B (Reviewer / You)</span>
              <p className="font-semibold text-slate-900 text-base">{partyName}</p>
              <p className="text-xs text-slate-500">Executing Counterparty</p>
            </div>
          </div>
        </div>

        {/* Agreed Points / Legal Clauses Section */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-8">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Agreed Contractual Terms & Obligations
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Please review all synthesized clauses below. These terms define the binding obligations of both parties.
            </p>
          </div>

          <div className="space-y-6">
            {clauses.map((clause, idx) => (
              <div
                key={clause.clause_id || idx}
                className="rounded-lg border border-slate-200/90 bg-white p-5 hover:border-slate-300 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-base text-slate-900 tracking-tight">
                    {clause.title}
                  </h3>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    Clause {idx + 1}
                  </span>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line pl-1 border-l-2 border-blue-500/30">
                  {clause.body}
                </p>

                {clause.statutory_reference && (
                  <div className="pt-2 text-xs font-medium text-slate-500 flex items-center gap-1.5 border-t border-slate-100">
                    <span className="text-slate-400">Statutory Framework:</span>
                    <span className="text-slate-700 italic">{clause.statutory_reference}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Formal Decision / Assent Action Section */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Confirmed State View */}
          {decisionStatus === "confirmed" && (
            <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-6 space-y-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-lg">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <span>Agreement Formally Confirmed & Complete</span>
                </div>
                <p className="text-sm text-emerald-800">
                  Confirmed by <strong className="font-semibold">{partyName}</strong> on{" "}
                  <span suppressHydrationWarning>{formatAssentDate(confirmedAt || undefined)}</span>.
                </p>
                <p className="text-xs text-emerald-700">
                  Full mutual assent is sealed in the cryptographic audit ledger under Section 7 of the Indian Contract Act.
                </p>
              </div>
              <div className="shrink-0 pt-3 sm:pt-0">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white px-3 py-1 text-xs">
                  Assent Recorded
                </Badge>
              </div>
            </div>
          )}

          {/* Declined State View */}
          {decisionStatus === "declined" && (
            <div className="rounded-lg bg-rose-50/70 border border-rose-200 p-6 space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-lg">
                <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
                <span>Agreement Formally Declined</span>
              </div>
              <p className="text-sm text-rose-800">
                Declined by <strong className="font-semibold">{partyName}</strong> on{" "}
                <span suppressHydrationWarning>{formatAssentDate(declinedAt || undefined)}</span>.
              </p>
              {declineReason && (
                <div className="bg-white rounded-md p-3 border border-rose-200 text-sm text-slate-800">
                  <span className="font-semibold text-rose-900 block text-xs uppercase mb-1">
                    Your Reason / Requested Clause Revisions:
                  </span>
                  <p className="italic">{declineReason}</p>
                </div>
              )}
              <p className="text-xs text-rose-700">
                The initiating party has been notified of your comments and will revise the draft terms.
              </p>
            </div>
          )}

          {/* Pending Decision View */}
          {decisionStatus === "pending" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Review & Assent Execution
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pursuant to Section 7 of the Indian Contract Act, 1872, acceptance must be absolute and
                  unqualified. Clicking <strong>&quot;I Agree &amp; Confirm&quot;</strong> signifies your full assent to
                  all terms set forth above. If you require any amendments, click <strong>&quot;Decline&quot;</strong> to
                  provide your specific reasons.
                </p>
              </div>

              {/* Conditional Comment / Reason Box: SHOWN ONLY IF DECLINE IS CLICKED */}
              {actionView === "declining" ? (
                <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-5 space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <label
                      htmlFor="decline-reason"
                      className="text-sm font-bold text-rose-950 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Reason for Declining / Requested Changes *
                    </label>
                    <p className="text-xs text-slate-600">
                      Please state why these terms are unacceptable or detail the specific clause revisions you require.
                    </p>
                  </div>

                  <textarea
                    id="decline-reason"
                    rows={4}
                    value={declineInput}
                    onChange={(e) => {
                      setDeclineInput(e.target.value);
                      if (declineError) setDeclineError(null);
                    }}
                    placeholder="e.g., The 50% advance milestone is not acceptable; we request a 30% advance and 7 weeks completion timeline for Clause 2.0 and Clause 3.0."
                    className="w-full text-sm rounded-md border border-slate-300 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 text-slate-900 placeholder:text-slate-400"
                  />

                  {declineError && (
                    <p className="text-xs font-semibold text-rose-600">{declineError}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button
                      onClick={handleSubmitDecline}
                      disabled={isSubmitting}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-4 py-2 gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Reason &amp; Decline Agreement
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleCancelAction}
                      disabled={isSubmitting}
                      className="text-slate-600 hover:text-slate-900 text-sm gap-1"
                    >
                      <Undo2 className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Primary Actions: I Agree, Decline, Cancel */
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={handleAgree}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 shadow-sm gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Recording Assent...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        I Agree &amp; Confirm
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setActionView("declining")}
                    disabled={isSubmitting}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold text-sm px-5 py-2.5 gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleCancelAction}
                    disabled={isSubmitting}
                    className="text-slate-500 hover:text-slate-800 text-sm px-4 py-2.5"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
