"use client";

import Link from "next/link";
import { ChatUpload } from "@/components/chat/ChatUpload";
import { ArrowLeft, ShieldCheck, Lock, FileText, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-6 max-w-5xl">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Upload WhatsApp Chat Negotiation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ingest real exported WhatsApp business conversations to extract commercial terms, identify conflicting commitments, and generate binding legal agreements.
        </p>
      </div>

      {/* Export Instructions Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-1">
          <div className="font-semibold text-blue-900 flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-blue-600" /> 1. Export Chat on Mobile
          </div>
          <p className="text-blue-800/90 leading-relaxed">
            Open the negotiation chat in WhatsApp &gt; Tap Contact Name &gt; <strong>Export Chat</strong> &gt; Select <strong>Without Media</strong>.
          </p>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 space-y-1">
          <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-600" /> 2. Upload .txt File Below
          </div>
          <p className="text-indigo-800/90 leading-relaxed">
            Drag and drop the resulting <strong>.txt</strong> file or paste the verbatim transcript directly into the parser.
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
          <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> 3. Tamper-Evident Security
          </div>
          <p className="text-emerald-800/90 leading-relaxed">
            Transcript is automatically encrypted (AES-256) and fingerprinted with SHA-256 into a tamper-evident audit ledger.
          </p>
        </div>
      </div>

      {/* Upload Component */}
      <ChatUpload />
    </div>
  );
}
