import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Users, ArrowRight, KeyRound, ShieldAlert } from "lucide-react";

export default function ConfirmationsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Two-Party Agreement Confirmation</h1>
          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-semibold">
            Sample Demo Data
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          Independent mutual sign-off workflow via secure token-based single-use links.
        </p>
      </div>

      {/* Architecture Notice for Team D */}
      <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 text-xs text-blue-900 space-y-1">
        <div className="font-bold flex items-center gap-2 text-blue-950">
          <KeyRound className="h-4 w-4 text-blue-700" />
          Token-Based Confirmation Architecture (Team D)
        </div>
        <p className="leading-relaxed">
          Counterparties without an authenticated platform account access their confirmation view via secure, single-use signed tokens (`confirmation_token`), querying the backend function <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">get_agreement_by_confirmation_token(token)</code> without exposing ownership RLS boundaries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agreement Status: Partially Confirmed</CardTitle>
              <CardDescription className="text-xs">
                Services Agreement v1.0 • Website Redesign
              </CardDescription>
            </div>
            <Badge variant="warning">1 of 2 Confirmed</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Party 1 Status */}
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Raj Mehta (Client)</span>
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Confirmed
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                Confirmed v1.0 terms on March 12, 2024 at 11:00 AM IST.
              </p>
              <div className="text-[10px] font-mono text-slate-400">
                Audit Hash: 9f82...3b1a
              </div>
            </div>

            {/* Party 2 Status */}
            <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Priya Sharma (Provider)</span>
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" /> Awaiting Review
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                Single-use review link dispatched via WhatsApp / Email. Not yet confirmed.
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs">
                Resend Confirmation Link
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 text-xs text-slate-500">
            <strong>Rule:</strong> The agreement becomes effective only once both parties record mutual, unqualified assent without pending objections.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
