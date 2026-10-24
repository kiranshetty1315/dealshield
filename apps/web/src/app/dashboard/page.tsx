import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Active Negotiations", value: "3", change: "2 pending review" },
    { label: "Agreements Generated", value: "5", change: "1 pending confirmation" },
    { label: "Resolved Contradictions", value: "8", change: "Price & timeline issues" },
    { label: "Verified Vault Records", value: "12", change: "100% SHA-256 match" },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Contract Workspace Dashboard</h1>
          <p className="text-sm text-slate-500">
            Monitor ongoing WhatsApp negotiations, terms analysis, and mutual confirmations.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/upload">
            <Upload className="h-4 w-4" /> Ingest New Chat
          </Link>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-bold">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Table Scaffold */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent WhatsApp Negotiations</CardTitle>
              <CardDescription>
                Conversations ingested and structured through the DealShield AI pipeline.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 font-semibold">
              Sample Demo Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-3 flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">Website Redesign (Raj Mehta & Priya Sharma)</p>
                <p className="text-xs text-slate-500">Sample negotiation • ₹1,00,000 accepted • 50% upfront</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="warning">Requires Human Review</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analysis">View Analysis</Link>
                </Button>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">Social Media Campaign (Amit Patel & Neha Gupta)</p>
                <p className="text-xs text-slate-500">Ad spend conflict detected • ₹2,40,000 service fee</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="destructive">Disputed Terms</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analysis">Resolve</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
