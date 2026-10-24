import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, ArrowRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalysisPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900">Agreement Analysis</h1>
            <Badge variant="warning">Human Review Recommended</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Source: WhatsApp negotiation between Raj Mehta (Client) and Priya Sharma (Designer)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Confidence: 85%</Badge>
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

      {/* Conflicts & Contradictions */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3 bg-amber-50/50 rounded-t-xl">
          <CardTitle className="text-base text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Detected Contradictions & Ambiguities
          </CardTitle>
          <CardDescription className="text-xs text-amber-700">
            Requires explicit resolution prior to formal agreement compilation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="border border-amber-200 rounded-lg p-4 bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900">Price Negotiation & Acceptance Ambiguity</span>
              <Badge variant="destructive">High Severity</Badge>
            </div>
            <p className="text-slate-700">
              Raj proposed ₹75,000. Priya countered with ₹1,50,000, then compromised at ₹1,00,000 with 50% advance.
              Raj stated &ldquo;Sure, that works I think. Let&apos;s go ahead&rdquo; which contains qualifying language (&ldquo;I think&rdquo;).
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded">
              <span>Source citations:</span>
              <span className="bg-slate-200 px-1 rounded">msg_raj_003</span>
              <span className="bg-slate-200 px-1 rounded">msg_priya_004</span>
              <span className="bg-slate-200 px-1 rounded">msg_raj_009</span>
            </div>
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <strong>Proposed Resolution:</strong> Standardize consideration to ₹1,00,000 payable as 50% (₹50,000) advance upon signing and 50% upon delivery.
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
              </div>
              <Badge variant="success">Agreed</Badge>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Payment Milestone:</span>
                <span className="ml-2 text-slate-600">50% upfront prior to commencement</span>
              </div>
              <Badge variant="success">Agreed</Badge>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Delivery Deadline:</span>
                <span className="ml-2 text-slate-600">End of April 2024</span>
              </div>
              <Badge variant="warning">Tight Timeline</Badge>
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
              WhatsApp chat did not specify whether design source files and copyright transfer immediately or only upon 100% final payment.
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Dispute Resolution & Jurisdiction</span>
              <Badge variant="warning">Important</Badge>
            </div>
            <p className="text-slate-600">
              No arbitration or local court jurisdiction stated. Recommended clause: Indian Arbitration and Conciliation Act 1996 seat.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
