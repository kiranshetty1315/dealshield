import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle, Clock, ShieldCheck } from "lucide-react";

export default function AgreementsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Generated Agreements</h1>
          <p className="text-sm text-slate-500">
            Plain-language contracts synthesized from informal chat negotiations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Version 1.0 (Draft)</Badge>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
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
            <Badge variant="warning">Pending Confirmation</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6 text-sm text-slate-800 leading-relaxed font-sans">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">1. Scope of Work & Deliverables</h4>
            <p className="text-xs text-slate-700">
              The Service Provider agrees to perform a full website redesign for the Client,
              including initial UI mockups, responsive frontend layout, and project handover.
              (Derived from chat messages msg_raj_001, msg_priya_002).
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">2. Consideration & Payment Milestones</h4>
            <p className="text-xs text-slate-700">
              The agreed fixed fee for the complete scope is ₹1,00,000 (Indian Rupees One Lakh only).
              Payment shall be executed in two equal tranches:
              <br />• 50% (₹50,000) payable upfront prior to commencement of design activities.
              <br />• 50% (₹50,000) payable upon final acceptance of the website deliverables.
              (Derived from chat messages msg_priya_008, msg_raj_009).
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-1">3. Project Timeline</h4>
            <p className="text-xs text-slate-700">
              All agreed deliverables must be completed and submitted for review by April 30, 2024.
              Initial mockups to be delivered within 7 business days from signing.
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
