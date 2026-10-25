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
  Download,
  Mail,
  KeyRound,
  RefreshCw,
  Building2,
  CreditCard,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // Core Flow State
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = Email check, 2 = OTP verify, 3 = Review draft
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Counterparty Identity & Metadata
  const [partyName, setPartyName] = useState<string>("Counterparty");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null); // Kept in memory only!

  // Form Inputs
  const [emailInput, setEmailInput] = useState("");
  const [panLast4Input, setPanLast4Input] = useState("");
  const [gstNumber, setGstNumber] = useState<string | null>(null);
  const [panLast4, setPanLast4] = useState<string | null>(null);
  const [officeAddress, setOfficeAddress] = useState<string | null>(null);
  const [hasPanCheck, setHasPanCheck] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Agreement State
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const initiatorDisplayName = agreement?.parties[0] && !["you", "user", "me"].includes(agreement.parties[0].trim().toLowerCase())
    ? agreement.parties[0]
    : "Originating Party (Initiator)";
  const [clauses, setClauses] = useState<Clause[]>([]);

  // Action / Execution State
  const [decisionStatus, setDecisionStatus] = useState<"pending" | "confirmed" | "declined">("pending");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [declinedAt, setDeclinedAt] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string | null>(null);

  const [actionView, setActionView] = useState<"idle" | "declining">("idle");
  const [declineInput, setDeclineInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Initial load: inspect token metadata
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage("No confirmation token provided in the link. Please ask the sender for the complete link.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const storedSession =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`dealshield_review_session_${token}`)
        : null;
    if (storedSession) {
      setSessionToken(storedSession);
    }

    api
      .inspectToken(token, storedSession || undefined)
      .then((data) => {
        setPartyName(data.party_name || "Counterparty");
        setMaskedEmail(data.masked_email || null);
        if (data.gst_number) setGstNumber(data.gst_number);
        if (data.pan_last_4) setPanLast4(data.pan_last_4);
        if (data.office_address) setOfficeAddress(data.office_address);
        setHasPanCheck(Boolean(data.has_pan_check));

        if (data.confirmed) {
          setDecisionStatus("confirmed");
          setConfirmedAt(data.confirmed_at || null);
          if (data.agreement) {
            setAgreement(data.agreement);
            const vers = data.agreement.versions || [];
            const latest = vers[vers.length - 1];
            if (latest?.clauses) setClauses(latest.clauses);
          }
        } else if (data.declined) {
          setDecisionStatus("declined");
          setDeclinedAt(data.declined_at || null);
          setDeclineReason(data.decline_reason || null);
        } else if (!data.requires_email_verification && data.agreement) {
          // In case OTP was not required by configuration
          setAgreement(data.agreement);
          const vers = data.agreement.versions || [];
          const latest = vers[vers.length - 1];
          if (latest?.clauses) setClauses(latest.clauses);
          setStep(3);
        } else {
          setStep(1);
        }
      })
      .catch((err: any) => {
        const msg = err.message || "Invalid or expired review link.";
        if (msg.includes("locked") || msg.includes("423")) {
          setIsLocked(true);
        }
        setErrorMessage(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  // Handle Step 1: Submit Email and Business PAN for Verification
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (hasPanCheck && (!panLast4Input.trim() || panLast4Input.trim().length !== 4)) {
      setErrorMessage("Please enter the last 4 digits of your Business PAN card.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.emailCheck(token, emailInput.trim(), panLast4Input.trim() || undefined);
      // Credentials matched! Proceed to dispatch OTP
      await handleSendOtp();
      setStep(2);
    } catch (err: any) {
      const msg = err.message || "We couldn't verify these credentials. Please check your email and Business PAN last 4 digits.";
      if (msg.includes("locked") || msg.includes("423")) {
        setIsLocked(true);
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch 6-digit OTP
  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMessage(null);
    try {
      const res = await api.sendOtp(token);
      if (res.masked_email) {
        setMaskedEmail(res.masked_email);
      }
      setResendCooldown(30);
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code.";
      if (msg.includes("wait 30 seconds") || msg.includes("429")) {
        setResendCooldown(30);
      }
      setErrorMessage(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpInput.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage(null);

    try {
      const sessionRes = await api.verifyOtp(token, cleanOtp);
      const activeSessionToken = sessionRes.session_token;
      setSessionToken(activeSessionToken);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`dealshield_review_session_${token}`, activeSessionToken);
      }

      // Fetch agreement draft using the new session token
      const inspectRes = await api.inspectToken(token, activeSessionToken);
      if (inspectRes.agreement) {
        setAgreement(inspectRes.agreement);
        const vers = inspectRes.agreement.versions || [];
        const latest = vers[vers.length - 1];
        if (latest?.clauses) setClauses(latest.clauses);
      }
      if (inspectRes.gst_number) setGstNumber(inspectRes.gst_number);
      if (inspectRes.pan_last_4) setPanLast4(inspectRes.pan_last_4);
      if (inspectRes.office_address) setOfficeAddress(inspectRes.office_address);
      setStep(3);
    } catch (err: any) {
      const msg = err.message || "Invalid verification code. Please check and try again.";
      if (msg.includes("locked") || msg.includes("423")) {
        setIsLocked(true);
      }
      setErrorMessage(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Step 3: Record Agreement Assent
  const handleConfirmAgree = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.confirmByToken(
        token,
        "Agreed and confirmed via email-verified counterparty review session.",
        "agree",
        undefined,
        sessionToken || undefined
      );
      setDecisionStatus("confirmed");
      setConfirmedAt(new Date().toISOString());

      // Broadcast assent to other tabs (confirmations dashboard)
      const broadcastPayload = {
        type: "CONFIRMATION_UPDATED",
        agreementId: res.agreement_id || agreement?.id,
        partyName: res.party_name || partyName,
        status: "confirmed",
        timestamp: new Date().toISOString(),
      };
      try {
        const bc = new BroadcastChannel("dealshield_confirmations");
        bc.postMessage(broadcastPayload);
        bc.close();
      } catch {}
      try {
        localStorage.setItem("dealshield_confirmation_broadcast", JSON.stringify(broadcastPayload));
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record confirmation assent.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 3: Decline with Reason
  const handleConfirmDecline = async () => {
    if (!token) return;
    if (!declineInput.trim()) {
      setErrorMessage("Please provide a reason or describe changes needed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.confirmByToken(
        token,
        undefined,
        "decline",
        declineInput.trim(),
        sessionToken || undefined
      );
      setDecisionStatus("declined");
      setDeclinedAt(new Date().toISOString());
      setDeclineReason(declineInput.trim());
      setActionView("idle");

      // Broadcast decline to other tabs (confirmations dashboard)
      const broadcastPayload = {
        type: "CONFIRMATION_UPDATED",
        agreementId: res.agreement_id || agreement?.id,
        partyName: res.party_name || partyName,
        status: "declined",
        timestamp: new Date().toISOString(),
      };
      try {
        const bc = new BroadcastChannel("dealshield_confirmations");
        bc.postMessage(broadcastPayload);
        bc.close();
      } catch {}
      try {
        localStorage.setItem("dealshield_confirmation_broadcast", JSON.stringify(broadcastPayload));
      } catch {}
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit decline response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF using active session token
  const handleDownloadPdf = async () => {
    if (!token) return;
    setIsDownloadingPdf(true);
    try {
      await api.downloadAgreementByToken(
        token,
        sessionToken || undefined,
        `DealShield_Agreement_${partyName.replace(/\s+/g, "_")}.pdf`
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to download agreement PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Neutral Header Bar */}
      <header className="border-b bg-white border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              DS
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                DealShield AI
              </span>
              <span className="hidden sm:inline-block text-slate-400 text-xs mx-2">&bull;</span>
              <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
                Counterparty Agreement Review
              </span>
            </div>
          </div>

          <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
            {decisionStatus === "confirmed" ? (
              <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Confirmed
              </span>
            ) : decisionStatus === "declined" ? (
              <span className="text-rose-700 flex items-center gap-1 font-semibold">
                <XCircle className="h-3 w-3" /> Declined
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-600">
                <Clock className="h-3 w-3" /> Pending Review
              </span>
            )}
          </Badge>
        </div>
      </header>

      {/* Main Review Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-xs text-slate-500">Securing your review session...</p>
          </div>
        )}

        {/* Locked Error Banner */}
        {isLocked && (
          <Card className="border-rose-300 bg-rose-50 text-rose-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-800">
                <AlertTriangle className="h-5 w-5" />
                Confirmation Link Locked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p>
                This confirmation link has been locked due to excessive failed verification attempts.
              </p>
              <p className="text-rose-700">
                For security reasons, access has been suspended. Please contact the initiating party to request a new review link.
              </p>
            </CardContent>
          </Card>
        )}

        {/* General Error Banner */}
        {errorMessage && !isLocked && (
          <Alert variant="destructive" className="text-xs">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Completed State: Confirmed */}
        {!isLoading && decisionStatus === "confirmed" && (
          <Card className="border-emerald-300 bg-emerald-50/80 shadow-md">
            <CardContent className="p-6 sm:p-8 space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-emerald-950">
                  Agreement Assent Formally Recorded
                </h2>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Thank you, <strong>{partyName}</strong>. Your confirmation has been recorded with a cryptographic audit timestamp. Both parties have been notified.
                </p>
              </div>

              {confirmedAt && (
                <p className="text-[11px] text-emerald-700">
                  Confirmed: <strong>{formatAssentDate(confirmedAt)}</strong>
                </p>
              )}

              <div className="pt-2 flex flex-col items-center gap-2">
                {sessionToken ? (
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-2 shadow-xs"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download Agreement PDF Record
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2 text-center">
                    <p className="text-[11px] text-emerald-800">
                      Active review session expired on reload. Please re-verify your email to download the PDF record.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="text-xs border-emerald-400 text-emerald-900 hover:bg-emerald-100 gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Verify Email to Re-download
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed State: Declined */}
        {!isLoading && decisionStatus === "declined" && (
          <Card className="border-rose-300 bg-rose-50/80 shadow-md">
            <CardContent className="p-6 sm:p-8 space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-300">
                <XCircle className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-rose-950">
                  Agreement Terms Declined
                </h2>
                <p className="text-xs text-rose-800 max-w-md mx-auto">
                  Your decision to decline this commercial agreement has been recorded. The sender has been notified with your feedback.
                </p>
              </div>

              {declineReason && (
                <div className="max-w-md mx-auto bg-white/80 p-3 rounded-lg border border-rose-200 text-xs text-rose-900 text-left space-y-1">
                  <span className="font-bold text-[10px] uppercase text-rose-700">Reason Provided:</span>
                  <p className="italic">&ldquo;{declineReason}&rdquo;</p>
                </div>
              )}

              {declinedAt && (
                <p className="text-[11px] text-rose-700">
                  Recorded: <strong>{formatAssentDate(declinedAt)}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 1: Email and Business PAN Verification Form */}
        {!isLoading && decisionStatus === "pending" && !isLocked && step === 1 && (
          <Card className="border-slate-200 shadow-sm max-w-md mx-auto">
            <CardHeader className="text-center space-y-1 pb-4">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200 mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">
                Verify Your Business Identity
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Hello <strong>{partyName}</strong>. Enter your declared Gmail/Email and the last 4 digits of your Business PAN card to request a verification OTP.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    Client Email Address (Gmail / Counterparty Address)
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="Enter declared client email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="text-xs"
                    autoFocus
                  />
                  {maskedEmail && (
                    <p className="text-[11px] text-slate-400">
                      Hint: Registered address matches <code>{maskedEmail}</code>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                    Business PAN (Last 4 Digits)
                  </label>
                  <Input
                    type="text"
                    maxLength={4}
                    placeholder="Enter last 4 digits of PAN, e.g. 1234"
                    value={panLast4Input}
                    onChange={(e) => setPanLast4Input(e.target.value.toUpperCase())}
                    className="text-xs font-mono uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-slate-400">
                    Both your email and Business PAN last 4 digits must match the sender&apos;s registered link data.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !emailInput.trim()}
                  className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying Credentials...
                    </>
                  ) : (
                    <>
                      <span>Get OTP &bull; Request Verification Code</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>

                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  Zero-knowledge verification: your credentials are cryptographically verified before single-use code dispatch.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: OTP Entry Form */}
        {!isLoading && decisionStatus === "pending" && !isLocked && step === 2 && (
          <Card className="border-slate-200 shadow-sm max-w-md mx-auto">
            <CardHeader className="text-center space-y-1 pb-4">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200 mb-2">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">
                Enter Verification Code
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                A 6-digit code has been dispatched to <strong>{maskedEmail || "your email"}</strong>. Valid for 10 minutes.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    6-Digit Verification Code
                  </label>
                  <Input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono text-lg tracking-widest h-11"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isVerifyingOtp || otpInput.trim().length !== 6}
                  className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Unlock &amp; Review Agreement
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-slate-500 hover:text-slate-700 text-[11px]"
                  >
                    &larr; Change email address
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSendOtp}
                    disabled={resendCooldown > 0 || isSendingOtp}
                    className="text-[11px] text-blue-700 hover:text-blue-900 gap-1 h-auto p-0 font-medium"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSendingOtp ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Review Draft & Assent */}
        {!isLoading && decisionStatus === "pending" && !isLocked && step === 3 && (
          <div className="space-y-6">
            {/* Warning Notice Box */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>COMMERCIAL AGREEMENT NOTICE:</strong> This document is a private record of terms negotiated between the parties. It is not an official government stamp paper or eSign deed. Your assent is authenticated by email-OTP.
              </div>
            </div>

            {/* Document Card */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                      Commercial Service Agreement
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Version: <b>v{agreement?.current_version || 1}.0</b> &bull; Reviewing as <b>{partyName}</b>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    Identity Verified
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Parties Header */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900 mb-1">Contracting Parties:</p>
                  <p>1. <strong>{initiatorDisplayName}</strong> (Initiator)</p>
                  <p>2. <strong>{partyName}</strong> (Counterparty)</p>
                </div>

                {/* Synthesized Clauses */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                    Synthesized Agreement Clauses
                  </h3>

                  {clauses.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No structured clauses loaded.</p>
                  ) : (
                    clauses.map((clause, idx) => (
                      <div
                        key={clause.clause_id || idx}
                        className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs"
                      >
                        <h4 className="text-xs font-bold text-slate-900">{clause.title}</h4>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{clause.body}</p>
                        {clause.statutory_reference && (
                          <p className="text-[10px] text-slate-500 italic">
                            <strong>Reference Standard:</strong> {clause.statutory_reference}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Commercial Entity Registration & Office Location (Last Detail Part) */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Commercial Entity &amp; Office Location Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">First Party (Initiator)</span>
                      <p className="font-bold text-slate-900">{initiatorDisplayName}</p>
                      <p className="text-[11px] text-slate-600"><strong>Role:</strong> Originating Party</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Second Party (Counterparty)</span>
                      <p className="font-bold text-slate-900">{partyName}</p>
                      <p className="text-[11px] text-slate-600">
                        <strong>Business GST:</strong> <code className="font-mono">{gstNumber || "Not declared"}</code>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        <strong>Business PAN (Last 4):</strong> <code className="font-mono">{panLast4 ? `******${panLast4}` : (hasPanCheck ? "Verified" : "Not declared")}</code>
                      </p>
                      <p className="text-[11px] text-slate-600">
                        <strong>Office Location:</strong> {officeAddress || "Not declared"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Bar */}
            {actionView === "idle" && (
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="font-bold text-xs text-slate-900">
                      Ready to record your decision?
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Clicking confirm records your mutual assent with a cryptographic timestamp.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => setActionView("declining")}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      Decline Agreement
                    </Button>

                    <Button
                      onClick={handleConfirmAgree}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Recording Assent...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          I Agree &amp; Confirm
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decline Reason View */}
            {actionView === "declining" && (
              <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-rose-900">
                    Decline Commercial Agreement
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-700">
                    Please explain why you are declining or describe changes required to proceed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="E.g., Payment milestone 50% advance is unacceptable; requesting 25% with milestone deliverables."
                    value={declineInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeclineInput(e.target.value)}
                    className="text-xs bg-white min-h-[90px]"
                    autoFocus
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionView("idle");
                        setDeclineInput("");
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleConfirmDecline}
                      disabled={isSubmitting || !declineInput.trim()}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          Confirm Decline
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white border-slate-200 py-4 text-center text-[11px] text-slate-500">
        <p>DealShield AI &bull; Transparent Electronic Contracts &bull; DPDP Act 2023 Compliant</p>
      </footer>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          Loading agreement. Please wait...
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
