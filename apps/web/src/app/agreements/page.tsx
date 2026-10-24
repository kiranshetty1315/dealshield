import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle, Clock, ShieldAlert, Scale } from "lucide-react";

export default function AgreementsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900">Generated Agreement Draft</h1>
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-semibold">
              Sample Demo Data
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Synthesized from informal WhatsApp chat between Raj Mehta and Priya Sharma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Version 1.0 (Draft)</Badge>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Prominent Stamp Duty and Enforceability Notice */}
      <div className="border border-amber-300 bg-amber-50/80 rounded-xl p-4 text-xs text-amber-900 space-y-1.5 shadow-sm">
        <div className="font-bold flex items-center gap-2 text-amber-950">
          <Scale className="h-4 w-4 text-amber-700" />
          Statutory Legal Notice — Stamp Duty & Contractual Enforceability
        </div>
        <p className="leading-relaxed">
          This generated document represents a <strong>plain-language synthesis and term sheet</strong> constructed from informal communications.
          It is <strong>not</strong> an executed legal deed and has not been assessed for or paid Indian stamp duty under the <strong>Indian Stamp Act, 1899</strong> (or relevant state Stamp Acts).
          To achieve full statutory enforceability in court, commercial agreements in India must be formally stamped with applicable duty, executed by authorized signatories, and optionally notarized or executed via a licensed Certifying Authority (CCA) eSign under Section 3/3A of the Information Technology Act, 2000.
        </p>
      </div>

      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Services Agreement — Website Redesign</CardTitle>
              <CardDescription className="text-xs">
                Between Raj Mehta (&ldquo;Client&rdquo;) and Priya Sharma (&ldquo;Service Provider&rdquo;)
              </CardDescription>
            </div>
            <Badge variant="warning">Pending Mutual Confirmation</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6 text-sm text-slate-800 leading-relaxed font-sans">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">1. Scope of Work & Deliverables</h4>
            <p className="text-xs text-slate-700">
              The Service Provider agrees to perform a full website redesign for the Client,
              including initial UI mockups, responsive frontend layout, and project handover.
              <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                [Source Citations: msg_raj_001, msg_priya_002]
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">2. Consideration & Payment Milestones</h4>
            <p className="text-xs text-slate-700">
              The agreed fixed fee for the complete scope is ₹1,00,000 (Indian Rupees One Lakh only).
              Payment shall be executed in two equal tranches:
              <br />• 50% (₹50,000) payable upfront prior to commencement of design activities.
              <br />• 50% (₹50,000) payable upon final acceptance of the website deliverables.
              <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                [Source Citations: msg_priya_008, msg_raj_009]
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">3. Project Timeline</h4>
            <p className="text-xs text-slate-700">
              All agreed deliverables must be completed and submitted for review by April 30, 2024.
              Initial mockups to be delivered within 7 business days from signing.
              <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                [Source Citations: msg_raj_007, msg_priya_010]
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">4. Intellectual Property & Governing Law</h4>
            <p className="text-xs text-slate-700">
              All intellectual property rights in final deliverable assets shall transfer to the Client
              upon receipt of 100% agreed consideration. Governed by the Indian Contract Act, 1872.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
