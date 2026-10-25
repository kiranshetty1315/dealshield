"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/client";
import { Agreement, ConfirmationStatus, PartyConfirmationRecord } from "@/types";

interface StampPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: Agreement;
  confirmationStatus?: ConfirmationStatus | null;
}

export function StampPaperModal({
  isOpen,
  onClose,
  agreement,
  confirmationStatus,
}: StampPaperModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const currentVersion = agreement.versions?.[agreement.versions.length - 1];
  const clauses = currentVersion?.clauses || [];

  const firstParty = agreement.parties?.[0] || "Client / First Party";
  const secondParty = agreement.parties?.[1] || "Service Provider / Counterparty";

  const createdDate = agreement.created_at
    ? new Date(agreement.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Current Session";

  const partiesMap = new Map<string, PartyConfirmationRecord>();
  if (confirmationStatus?.parties) {
    for (const p of confirmationStatus.parties) {
      partiesMap.set(p.party_name.trim().toLowerCase(), p);
    }
  }

  const p1Record = partiesMap.get(firstParty.trim().toLowerCase());
  const p2Record = partiesMap.get(secondParty.trim().toLowerCase());

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await api.downloadAgreementPdf(agreement.id);
    } catch (err: any) {
      alert(err?.message || "Failed to download agreement PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Control Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                DealShield AI — Commercial Agreement Record
              </h3>
              <p className="text-xs text-slate-400">
                Private commercial record generated from verified negotiations with Certificate of Assent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="text-xs gap-1.5 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isDownloading ? "Downloading..." : "Download Agreement PDF"}</span>
            </Button>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white">
          <div className="bg-white mx-auto max-w-[760px] p-6 sm:p-10 shadow-sm border border-slate-300 rounded-lg space-y-6 text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
            {/* 1. DOCUMENT HEADER */}
            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-xs">
              <div className="bg-slate-50 border-b border-slate-300 p-4 text-center space-y-1">
                <p className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                  DealShield AI
                </p>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-wide uppercase">
                  Plain-Language Commercial Agreement (Record)
                </h2>
                <p className="text-xs text-slate-500">
                  Private Record of Agreed Commercial Terms
                </p>
              </div>

              {/* Document Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] bg-slate-50/50 divide-x divide-y divide-slate-200 border-b border-slate-300">
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Agreement Ref</span>
                  <span className="font-mono font-bold text-slate-900 truncate block" title={agreement.id}>
                    {agreement.id.slice(0, 16)}...
                  </span>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Date Generated</span>
                  <span className="font-semibold text-slate-800">{createdDate}</span>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Version</span>
                  <span className="font-semibold text-slate-800">v{currentVersion?.version_number || agreement.current_version}.0</span>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Status</span>
                  <span className="font-bold text-emerald-800 uppercase">{agreement.status.replace("_", " ")}</span>
                </div>

                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">First Party (Initiator)</span>
                  <span className="font-bold text-slate-900">{firstParty}</span>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Second Party (Counterparty)</span>
                  <span className="font-bold text-slate-900">{secondParty}</span>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Integrity Digest</span>
                  <span className="font-mono text-slate-700 truncate block">Digital Fingerprint</span>
                </div>
                <div className="p-2.5 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Assent Method</span>
                  <span className="font-semibold text-slate-800">Email OTP / Direct</span>
                </div>
              </div>

              {/* Warning Notice Callout */}
              <div className="bg-amber-50 p-3 text-[10px] text-amber-950 leading-relaxed border-t border-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>NOTICE:</strong> This document is a private record of commercial terms agreed between the parties. It is <strong>NOT</strong> a government-issued stamp paper, e-Stamp certificate, or statutory non-judicial stamp paper. No stamp duty has been paid through this service. For legal proceedings requiring stamp duty under the Indian Stamp Act, 1899 or applicable State Stamp Acts, parties must independently pay stamp duty through authorised channels. Electronic assents recorded herein are based on single-use token and email-OTP verification and do not constitute an Aadhaar eSign or IT Act Section 3/3A digital signature.
                </div>
              </div>
            </div>

            {/* 2. AGREEMENT TITLE & PREAMBLE */}
            <div className="text-center space-y-1 pt-2 border-b border-slate-200 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
                Commercial Service Agreement Terms
              </h1>
              <p className="text-xs text-slate-500">
                Agreement Identifier: <code className="font-mono">{agreement.id}</code> &bull; Version v{currentVersion?.version_number || agreement.current_version}.0
              </p>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                This <strong>Commercial Service Agreement</strong> (&ldquo;Agreement&rdquo;) records the commercial terms agreed upon between the following parties:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-2 text-slate-800 font-medium">
                <li><strong>{firstParty}</strong>, hereinafter referred to as the <strong>&ldquo;First Party / Initiator&rdquo;</strong></li>
                <li><strong>{secondParty}</strong>, hereinafter referred to as the <strong>&ldquo;Second Party / Counterparty&rdquo;</strong></li>
              </ol>
            </div>

            {/* 3. SYNTHESIZED CLAUSES */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                Agreed Contract Clauses
              </h3>

              {clauses.map((clause, idx) => (
                <div key={clause.clause_id || idx} className="space-y-1.5 p-3 rounded-lg bg-slate-50/70 border border-slate-200">
                  <h4 className="font-bold text-xs text-slate-900">{clause.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{clause.body}</p>
                  {clause.statutory_reference && (
                    <p className="text-[10px] text-slate-500 italic">
                      <strong>Reference Standard:</strong> {clause.statutory_reference}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* 4. CERTIFICATE OF ASSENT */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Certificate of Assent &amp; Execution Audit Trail
              </h3>
              <p className="text-[11px] text-slate-600">
                Electronic assents verified via single-use security tokens and Email OTP to declared counterparty email addresses:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Party 1 Box */}
                <div className={`p-3.5 rounded-lg border space-y-1.5 ${p1Record?.confirmed ? "bg-emerald-50/60 border-emerald-300" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">First Party (Initiator)</span>
                  <p className="font-bold text-sm text-slate-900">{firstParty}</p>
                  <Badge className={`text-[10px] ${p1Record?.confirmed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
                    {p1Record?.confirmed ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Assent Recorded</span>
                    ) : (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</span>
                    )}
                  </Badge>
                  <p className="text-[10px] text-slate-600">
                    <strong>Timestamp:</strong> {p1Record?.confirmed_at ? new Date(p1Record.confirmed_at).toUTCString() : "Pending"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    <strong>Method:</strong> Direct Platform Confirmation (Initiator)
                  </p>
                </div>

                {/* Party 2 Box */}
                <div className={`p-3.5 rounded-lg border space-y-1.5 ${p2Record?.confirmed ? "bg-emerald-50/60 border-emerald-300" : p2Record?.declined ? "bg-rose-50 border-rose-300" : "bg-slate-50 border-slate-200"}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Second Party (Counterparty)</span>
                  <p className="font-bold text-sm text-slate-900">{secondParty}</p>
                  <Badge className={`text-[10px] ${p2Record?.confirmed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : p2Record?.declined ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
                    {p2Record?.confirmed ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Assent Recorded</span>
                    ) : p2Record?.declined ? (
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Terms Declined</span>
                    ) : (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Awaiting Confirmation</span>
                    )}
                  </Badge>
                  <p className="text-[10px] text-slate-600">
                    <strong>Masked Email:</strong> {p2Record?.masked_email || "Declared address"}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    <strong>Timestamp:</strong> {p2Record?.confirmed_at ? new Date(p2Record.confirmed_at).toUTCString() : (p2Record?.declined_at ? new Date(p2Record.declined_at).toUTCString() : "Pending")}
                  </p>
                  {p2Record?.gst_number && (
                    <p className="text-[10px] text-slate-600">
                      <strong>Business GST:</strong> <code className="font-mono text-slate-900">{p2Record.gst_number}</code>
                    </p>
                  )}
                  {p2Record?.pan_last_4 && (
                    <p className="text-[10px] text-slate-600">
                      <strong>Business PAN (Last 4):</strong> <code className="font-mono text-slate-900">******{p2Record.pan_last_4}</code>
                    </p>
                  )}
                  {p2Record?.office_address && (
                    <p className="text-[10px] text-slate-600">
                      <strong>Office Location:</strong> {p2Record.office_address}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    <strong>Method:</strong> Email OTP to declared counterparty address. Not an Aadhaar eSign.
                  </p>
                  {p2Record?.declined && p2Record.decline_reason && (
                    <p className="text-[10px] text-rose-700 italic">
                      <strong>Decline Reason:</strong> &ldquo;{p2Record.decline_reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 4B. COMMERCIAL ENTITY REGISTRATION & OFFICE LOCATIONS */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Commercial Registration &amp; Office Location Details
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Party / Role</th>
                      <th className="p-2.5">Business GST</th>
                      <th className="p-2.5">Business PAN (Last 4)</th>
                      <th className="p-2.5">Office Location / Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900">{firstParty}</span>
                        <span className="block text-[10px] text-slate-500">First Party / Initiator</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">{p1Record?.gst_number || "Not declared"}</td>
                      <td className="p-2.5 font-mono text-slate-700">{p1Record?.pan_last_4 ? `******${p1Record.pan_last_4}` : "Not declared"}</td>
                      <td className="p-2.5 text-slate-700">{p1Record?.office_address || "Not declared"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900">{secondParty}</span>
                        <span className="block text-[10px] text-slate-500">Second Party / Counterparty</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-900 font-semibold">{p2Record?.gst_number || "Not declared"}</td>
                      <td className="p-2.5 font-mono text-slate-900 font-semibold">{p2Record?.pan_last_4 ? `******${p2Record.pan_last_4}` : "Not declared"}</td>
                      <td className="p-2.5 text-slate-900">{p2Record?.office_address || "Not declared"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. CRYPTOGRAPHIC SEAL */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                DealShield AI Cryptographic Record &amp; Integrity Seal
              </p>
              <p className="font-mono truncate">
                Verification Digest: {currentVersion?.content_hash || "Standard Agreement Fingerprint"}
              </p>
              <p className="text-slate-500">
                Private Commercial Record &bull; Notary/Statutory Stamp Duty Not Included &bull; Tamper-Evident Audit Ledger
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
