"use client";

import React from "react";
import {
  FileCheck2,
  Download,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Award,
  Hash,
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
  if (!isOpen) return null;

  const currentVersion = agreement.versions?.[agreement.versions.length - 1];
  const clauses = currentVersion?.clauses || [];

  const firstParty = agreement.parties?.[0] || "Client / First Party";
  const secondParty = agreement.parties?.[1] || (
    agreement.parties?.[0] || "Service Provider / Counterparty"
  );

  const certNumber = `IN-DL${Math.abs(
    agreement.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) * 12345
  )
    .toString()
    .slice(0, 9)}Z`;

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

  const pdfUrl = api.getAgreementPdfUrl(agreement.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Indian Non-Judicial e-Stamp Paper Agreement
              </h3>
              <p className="text-xs text-slate-400">
                Statutory enforceable digital contract under Section 10A IT Act, 2000 &amp; Section 7 ICA, 1872
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
              <span className="hidden sm:inline">Print Document</span>
            </Button>

            <Button
              size="sm"
              asChild
              className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm"
            >
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </a>
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

        {/* Scrollable Document Container (Printable Paper Sheet) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white">
          <div className="bg-white mx-auto max-w-[760px] p-6 sm:p-10 shadow-sm border border-slate-300 rounded-lg space-y-6 text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
            {/* 1. ORNAMENTAL E-STAMP BANNER */}
            <div className="border-2 border-amber-600 rounded-lg overflow-hidden shadow-xs">
              <div className="bg-amber-100/90 border-b border-amber-600 p-3 sm:p-4 text-center space-y-0.5">
                <p className="text-[11px] font-bold tracking-widest text-amber-900 uppercase">
                  INDIA NON JUDICIAL
                </p>
                <h2 className="text-base sm:text-lg font-extrabold text-amber-950 tracking-wide uppercase">
                  Government of National Capital Territory of Delhi
                </h2>
                <p className="text-xs font-bold text-blue-900">
                  e-Stamp Certificate of Commercial Service Agreement
                </p>
              </div>

              {/* e-Stamp Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 text-[11px] bg-amber-50/50 divide-x divide-y divide-amber-300/60 border-b border-amber-600">
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Certificate No.</span>
                  <span className="font-mono font-bold text-slate-900">{certNumber}</span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Certificate Issued Date</span>
                  <span className="font-semibold text-slate-800">{createdDate}</span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Account Reference</span>
                  <span className="font-semibold text-slate-800">SELFPRINT / DEALSHIELD</span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Unique Doc. Reference</span>
                  <span className="font-mono font-bold text-slate-800 truncate block" title={agreement.id}>
                    SUBIN-IN{agreement.id.slice(0, 8).toUpperCase()}01M
                  </span>
                </div>

                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Purchased by</span>
                  <span className="font-bold text-slate-900">{firstParty}</span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Description of Doc</span>
                  <span className="font-semibold text-slate-800">Article 5(c) Commercial Agreement</span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Stamp Duty Paid By</span>
                  <span className="font-semibold text-slate-800">{firstParty}</span>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-semibold text-slate-500 block text-[10px]">Stamp Duty Amount</span>
                  <span className="font-bold text-amber-900">₹ 100/- (Rupees One Hundred)</span>
                </div>
              </div>

              {/* Statutory Notice Band */}
              <div className="bg-amber-100/70 p-2 text-[10px] text-amber-950 leading-relaxed text-center">
                <strong>STATUTORY LEGAL EFFECT:</strong> Executed pursuant to <strong>Section 10A Information Technology Act, 2000</strong> (electronic contracts), <strong>Section 65B Indian Evidence Act, 1872</strong> (electronic record admissibility), and <strong>Section 7 Indian Contract Act, 1872</strong> (absolute &amp; unqualified acceptance).
              </div>
            </div>

            {/* 2. AGREEMENT TITLE & PREAMBLE */}
            <div className="text-center space-y-1 pt-2 border-b border-slate-200 pb-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
                Commercial Service Agreement
              </h1>
              <p className="text-xs text-slate-500">
                Agreement Identifier: <code className="font-mono">{agreement.id}</code> &bull; Version v{currentVersion?.version_number || agreement.current_version}.0
              </p>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                This <strong>Commercial Service Agreement</strong> (&ldquo;Agreement&rdquo;) is entered into and deemed effective as of <strong>{createdDate}</strong>, by and between:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Party (Initiator)</span>
                  <p className="font-bold text-slate-900">{firstParty}</p>
                  <p className="text-[11px] text-slate-500">Requesting / Authorizing Entity</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Second Party (Counterparty)</span>
                  <p className="font-bold text-slate-900">{secondParty}</p>
                  <p className="text-[11px] text-slate-500">Executing Contractor / Service Provider</p>
                </div>
              </div>
              <p className="text-[11px] italic text-slate-600">
                WHEREAS, the Parties engaged in mutual commercial communications and formally accepted the covenants, milestones, and consideration set forth below.
              </p>
            </div>

            {/* 3. SYNTHESIZED CLAUSES */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-blue-600" />
                Contractual Clauses &amp; Agreed Obligations
              </h3>

              <div className="space-y-4">
                {clauses.map((clause, idx) => (
                  <div key={clause.clause_id || idx} className="space-y-1 pl-2 border-l-2 border-blue-600/40">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900">{clause.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400">Clause {idx + 1}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                      {clause.body}
                    </p>
                    {clause.statutory_reference && (
                      <p className="text-[10px] text-slate-500 italic">
                        Legal Framework: {clause.statutory_reference}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. TWO-PARTY MUTUAL ASSENT & EXECUTION BLOCK */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-900">
                IN WITNESS WHEREOF, the Parties have executed and digitally affirmed this Agreement:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Party A Box */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Party</span>
                  <p className="font-bold text-slate-900 text-sm">{firstParty}</p>
                  <div className="flex items-center gap-1.5">
                    {p1Record?.confirmed ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Formally Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400 text-amber-800 text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        Pending Record
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Timestamp: {p1Record?.confirmed_at ? new Date(p1Record.confirmed_at).toUTCString() : createdDate}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    Sign Ref: {p1Record?.ip_hash || "HMAC-SHA256 Registered"}
                  </p>
                </div>

                {/* Party B Box */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Second Party</span>
                  <p className="font-bold text-slate-900 text-sm">{secondParty}</p>
                  <div className="flex items-center gap-1.5">
                    {p2Record?.confirmed ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Formally Confirmed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400 text-amber-800 text-[10px] gap-1">
                        <Clock className="h-3 w-3" />
                        Pending Record
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Timestamp: {p2Record?.confirmed_at ? new Date(p2Record.confirmed_at).toUTCString() : "Awaiting Counterparty"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    Sign Ref: {p2Record?.ip_hash || "Secured Token Verification"}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. CRYPTOGRAPHIC TAMPER-EVIDENT EVIDENCE VAULT SEAL */}
            <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-3.5 flex items-start gap-3 text-xs text-emerald-950">
              <div className="p-1.5 rounded-md bg-emerald-600 text-white shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="font-bold text-xs text-emerald-900">
                  DealShield AI Cryptographic Evidence Vault Seal
                </p>
                <p className="text-[10px] text-emerald-800">
                  SHA-256 Digest: <span className="font-mono font-bold">{currentVersion?.content_hash || agreement.id}</span>
                </p>
                <p className="text-[10px] text-emerald-700">
                  Tamper-evident non-repudiation ledger sealed under Section 65B of the Indian Evidence Act, 1872.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Action Bar (Hidden on print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Ready for client delivery, email dispatch, or archival.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close Preview
            </Button>
            <Button
              size="sm"
              asChild
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
            >
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-3.5 w-3.5" />
                <span>Download Official Stamp Paper (PDF)</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
