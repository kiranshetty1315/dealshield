"use client";

import Link from "next/link";
import {
  ShieldCheck,
  FileSearch,
  FileCheck2,
  Lock,
  ArrowRight,
  Upload,
  Layers,
  Sparkles,
  CheckCircle,
  FileText,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatUpload } from "@/components/chat/ChatUpload";
import { useHealthCheck } from "@/hooks/useHealthCheck";

export default function HomePage() {
  const { data: health, isLoading, error } = useHealthCheck();

  const workflowSteps = [
    {
      title: "1. Upload Conversation",
      desc: "Ingest WhatsApp chat exports. Messages receive deterministic IDs for verbatim citation.",
      icon: Upload,
      href: "/upload",
      badge: "Ready",
      badgeVariant: "success" as const,
    },
    {
      title: "2. AI Terms & Conflict Analysis",
      desc: "Extract pricing, scope, and deadlines. Detect contradictory terms and ambiguous acceptances.",
      icon: FileSearch,
      href: "/analysis",
      badge: "Team C",
      badgeVariant: "warning" as const,
    },
    {
      title: "3. Agreement Synthesis",
      desc: "Transform accepted terms into plain-language clauses based on Indian Contract Act principles.",
      icon: FileCheck2,
      href: "/agreements",
      badge: "Team D",
      badgeVariant: "warning" as const,
    },
    {
      title: "4. Two-Party Confirmation",
      desc: "Enable both negotiating parties to independently confirm terms and flag revisions.",
      icon: CheckCircle,
      href: "/confirmations",
      badge: "Team D",
      badgeVariant: "warning" as const,
    },
    {
      title: "5. Tamper-Evident Evidence Vault",
      desc: "Record SHA-256 integrity digests and append-only audit trails for dispute protection.",
      icon: Lock,
      href: "/evidence",
      badge: "Ready",
      badgeVariant: "success" as const,
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-8 py-10 space-y-12 max-w-6xl">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-6 pb-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3.5 py-1 text-xs font-semibold text-blue-700 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Hackathon Problem LS-06 — From Handshake to Contract
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          DealShield <span className="text-blue-600">AI</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          Turn informal WhatsApp business conversations into clear, reviewable,
          two-party confirmed contracts with tamper-evident audit records.
        </p>

        {/* Live Connectivity Banner */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-200 bg-white shadow-sm text-xs">
            <span className="font-semibold text-slate-700">API Connection:</span>
            {isLoading && !health ? (
              <span className="text-amber-600">Checking connection...</span>
            ) : health ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected to FastAPI {health.version} ({health.environment})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                Backend unreachable ({error || "Check http://localhost:8000"})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Chat Upload & Parser Scaffold */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Interactive Chat Ingestion & Normalizer
          </h2>
          <Badge variant="outline" className="text-xs">
            Backend API Connected
          </Badge>
        </div>
        <ChatUpload />
      </section>

      {/* Navigation Placeholders & System Modules */}
      <section className="space-y-6 pt-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Application Modules & Team Ownership
          </h2>
          <p className="text-sm text-slate-500">
            Explore active modules and planned workstreams across the parallel development teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Link key={step.title} href={step.href} className="group">
                <Card className="h-full transition-all hover:border-blue-400 hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={step.badgeVariant}>{step.badge}</Badge>
                    </div>
                    <CardTitle className="text-base font-bold pt-2">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="text-xs leading-relaxed">
                      {step.desc}
                    </CardDescription>
                    <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                      Open Module <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Technical Integrity Notice */}
      <section className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-3 text-xs text-slate-600">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-600" />
          Integrity & Legal Disclaimers
        </h3>
        <p>
          DealShield AI utilizes SHA-256 cryptographic digests to verify file consistency against append-only audit records.
          In accordance with Indian legal principles (Indian Contract Act 1872, Information Technology Act 2000),
          a cryptographic hash proves document immutability since hashing, but does not substitute for statutory eSign / Certifying Authority digital signatures.
        </p>
      </section>
    </div>
  );
}
