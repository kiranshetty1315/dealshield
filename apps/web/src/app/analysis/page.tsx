import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, ArrowRight, UserCheck, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalysisPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900">Agreement Analysis</h1>
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-semibold">
              Sample Demo Data
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Source: WhatsApp negotiation between Raj Mehta (Client) and Priya Sharma (Designer)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Extraction Confidence: High (85%)</Badge>
          <Button size="sm">Generate Agreement Draft</Button>
        </div>
      </div>

      {/* Identified Parties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            Identified Contracting Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded-lg bg-slate-50 text-xs space-y-1">
            <p className="font-bold text-slate-900">Raj Mehta</p>
            <p className="text-slate-600">Role: Client / Project Sponsor</p>
            <p className="text-slate-400 font-mono">Chat ID: party_raj_01</p>
          </div>
          <div className="p-3 border rounded-lg bg-slate-50 text-xs space-y-1">
            <p className="font-bold text-slate-900">Priya Sharma</p>
            <p className="text-slate-600">Role: Service Provider / Lead Designer</p>
            <p className="text-slate-400 font-mono">Chat ID: party_priya_02</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 7 Contradictions & Ambiguities */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3 bg-amber-50/50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-amber-900 flex items-center gap-2">
              <Scale className="h-4 w-4 text-amber-700" />
              Indian Contract Act, 1872 — Section 7 Conflict Analysis
            </CardTitle>
            <Badge variant="destructive">High Severity</Badge>
          </div>
          <CardDescription className="text-xs text-amber-800">
            Section 7 mandates: <em>&ldquo;In order to convert a proposal into a promise the acceptance must be absolute and unqualified.&rdquo;</em>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="border border-amber-200 rounded-lg p-4 bg-white space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900">Price Gap & Qualified Acceptance Flag</span>
              <span className="text-[11px] font-mono text-slate-500">ID: conflict_price_01</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Raj proposed ₹75,000 (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">msg_raj_003</code>).
              Priya countered with ₹1,50,000 (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">msg_priya_004</code>).
              They settled at ₹1,00,000 with 50% upfront (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">msg_priya_008</code>).
              However, Raj responded: <em>&ldquo;Sure, that works I think. Let&apos;s go ahead&rdquo;</em> (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">msg_raj_009</code>).
              The qualifier <strong>&ldquo;I think&rdquo;</strong> violates Section 7&apos;s requirement of unqualified acceptance.
            </p>
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <strong>Legal Resolution Proposal:</strong>
              <p>
                Prompt parties to confirm an unconditional fixed fee of ₹1,00,000 (INR) payable as ₹50,000 advance upon contract signing and ₹50,000 upon delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Agreed Terms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            Extracted Business Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Total Project Price:</span>
                <span className="ml-2 text-slate-600">₹1,00,000 (INR)</span>
                <span className="ml-2 font-mono text-[10px] text-slate-400">cited: msg_priya_008, msg_raj_009</span>
              </div>
              <Badge variant="warning">Ambiguous (Sec 7)</Badge>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Payment Milestone:</span>
                <span className="ml-2 text-slate-600">50% upfront prior to kickoff</span>
                <span className="ml-2 font-mono text-[10px] text-slate-400">cited: msg_priya_008</span>
              </div>
              <Badge variant="success">Agreed</Badge>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Delivery Deadline:</span>
                <span className="ml-2 text-slate-600">End of April 2024</span>
                <span className="ml-2 font-mono text-[10px] text-slate-400">cited: msg_raj_007, msg_priya_008</span>
              </div>
              <Badge variant="secondary">Agreed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Legal Provisions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-blue-600" />
            Missing Legal Safeguards (Indian Commercial Standards)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Intellectual Property Ownership</span>
              <Badge variant="destructive">Critical</Badge>
            </div>
            <p className="text-slate-600">
              WhatsApp chat did not specify whether copyright in design files transfers immediately or only upon 100% final payment.
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Termination & Cancellation Notice</span>
              <Badge variant="warning">Important</Badge>
            </div>
            <p className="text-slate-600">
              No written cancellation period or compensation for work performed in progress.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
