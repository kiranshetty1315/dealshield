import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Users, ArrowRight } from "lucide-react";

export default function ConfirmationsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Two-Party Agreement Confirmation</h1>
        <p className="text-sm text-slate-500">
          Independent mutual sign-off workflow for negotiating parties.
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
                Review link sent to WhatsApp handle. Not yet signed off.
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs">
                Resend Confirmation Link
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 text-xs text-slate-500">
            <strong>Note:</strong> Agreement becomes active only once both parties confirm without pending objections.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
