"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  FileSearch,
  FileCheck2,
  Lock,
  ArrowRight,
  Upload,
  Sparkles,
  CheckCircle,
  FileText,
  Scale,
  Shield,
  MessageSquare,
  KeyRound,
  LogIn,
  UserPlus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatUpload } from "@/components/chat/ChatUpload";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">Loading DealShield AI...</p>
      </div>
    );
  }

  // If user is authenticated, render the full workspace home page with upload
  if (isAuthenticated) {
    return <AuthenticatedWorkspace user={user} />;
  }

  // If user is not authenticated, render the public introduction and sign-in landing page
  return <PublicLandingPage />;
}

// ============================================================================
// 1. PUBLIC LANDING & INTRO PAGE (For Logged-Out Visitors)
// ============================================================================
function PublicLandingPage() {
  const steps = [
    {
      step: "01",
      title: "Export WhatsApp Chat",
      desc: "Export any negotiation or client conversation from WhatsApp as a text (.txt) file without media.",
      icon: MessageSquare,
    },
    {
      step: "02",
      title: "AI Term & Conflict Extraction",
      desc: "Our AI legal engine (Gemini 3.8 Flash) identifies pricing, deliverables, payment milestones, and conflicting commitments.",
      icon: FileSearch,
    },
    {
      step: "03",
      title: "Indian Contract Act Safeguards",
      desc: "Enforces Section 7 absolute acceptance rules and injects essential statutory clauses (IP assignment, termination, payment).",
      icon: Scale,
    },
    {
      step: "04",
      title: "Two-Party Email-OTP Assent",
      desc: "Share a private verification link with your counterparty. They review and confirm the agreement with a single-use OTP.",
      icon: CheckCircle2,
    },
    {
      step: "05",
      title: "Tamper-Evident Evidence Vault",
      desc: "Every record is sealed with SHA-256 cryptographic hashes and append-only audit ledgers for dispute protection.",
      icon: Lock,
    },
  ];

  const features = [
    {
      icon: Scale,
      title: "Indian Contract Act, 1872",
      desc: "Guards against ambiguous acceptances ('sure I think', 'depends on timeline') that void contract validity under Section 7.",
    },
    {
      icon: ShieldCheck,
      title: "Copyright & IP Assignment",
      desc: "Ensures compliance with Sections 17 & 19 of the Copyright Act, 1957, protecting authors and clients upon payment receipt.",
    },
    {
      icon: KeyRound,
      title: "Frictionless Client Review",
      desc: "Counterparties don't need to register an account. They verify their identity and consent via secure email-based OTP.",
    },
    {
      icon: FileText,
      title: "Downloadable Commercial PDF",
      desc: "Generate clean, professional commercial record documents ready to archive, share, or submit as business evidence.",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-8 py-10 space-y-16 max-w-6xl">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-xs">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span>AI Contract Governance for Modern Freelancers & SMEs</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Turn WhatsApp Deals into{" "}
          <span className="text-blue-600">Legally Sound Contracts</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          DealShield AI parses informal WhatsApp negotiations, extracts agreed commercial terms,
          flags legal contradictions under the Indian Contract Act, and secures verified two-party assents.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2 px-6">
              <LogIn className="h-4 w-4" />
              Sign In to Get Started
            </Button>
          </Link>

          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm font-semibold border-slate-300 hover:bg-slate-50 text-slate-800 gap-2 px-6">
              <UserPlus className="h-4 w-4" />
              Create New Account
            </Button>
          </Link>
        </div>

        {/* Demo Quick Credential Hint */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span>Testing the app? Use demo account:</span>
            <span className="font-mono font-semibold text-slate-800">demo@dealshield.local</span>
            <Link href="/login" className="text-blue-600 font-bold hover:underline ml-1">
              Quick Sign In &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* What is DealShield AI? Section */}
      <section className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sm:p-10 space-y-6">
        <div className="max-w-3xl space-y-3">
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs font-semibold">
            What is DealShield AI?
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Never lose money or sleep over &ldquo;I thought that was included&rdquo;
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Over 80% of independent freelancers, consultants, and agencies negotiate deliverables,
            rates, and milestones across WhatsApp and messaging chats without a formal written contract.
            When scope creeps or payments are delayed, chat logs are chaotic, fragmented, and hard to enforce.
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            <strong>DealShield AI bridges the gap between a chat handshake and a legally binding contract.</strong> In
            minutes, it converts your negotiation transcript into structured clauses, detects contradictions,
            verifies mutual counterparty assent with single-use OTPs, and creates a tamper-evident evidence record.
          </p>
        </div>

        {/* 5-Step Pipeline */}
        <div className="pt-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            How It Works in 5 Simple Steps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-600">{s.step}</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{s.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Legal & Technical Features */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Designed for Evidentiary & Statutory Integrity
          </h2>
          <p className="text-sm text-slate-500">
            Built from the ground up to respect Indian contract jurisprudence and modern data privacy laws.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card key={feat.title} className="border-slate-200 shadow-xs hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900">{feat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 sm:p-12 text-white text-center space-y-5 shadow-lg">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ready to secure your client negotiations?
        </h2>
        <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
          Sign in or create a free account to ingest chat transcripts, generate synthesized legal agreements,
          and issue counterparty confirmation links.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-md">
              Sign In to Your Account
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold border-white/40 text-white hover:bg-white/10">
              Register New Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-2 text-xs text-slate-500 text-center">
        <p className="flex items-center justify-center gap-1.5 font-semibold text-slate-700">
          <Lock className="h-3.5 w-3.5 text-blue-600" />
          Statutory Standards & Privacy Architecture
        </p>
        <p className="max-w-3xl mx-auto leading-relaxed">
          DealShield AI utilizes SHA-256 cryptographic digests and Fernet AES-128 encryption. Transcripts are parsed
          in strict compliance with DPDP Act 2023 principles. Generated records serve as commercial evidence of agreement
          and do not substitute for statutory stamp duty payment or CA-certified digital signatures.
        </p>
      </section>
    </div>
  );
}

// ============================================================================
// 2. AUTHENTICATED WORKSPACE (For Logged-In Users)
// ============================================================================
function AuthenticatedWorkspace({ user }: { user: any }) {
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
      badge: "Ready",
      badgeVariant: "success" as const,
    },
    {
      title: "3. Agreement Synthesis",
      desc: "Transform accepted terms into plain-language clauses based on Indian Contract Act principles.",
      icon: FileCheck2,
      href: "/agreements",
      badge: "Ready",
      badgeVariant: "success" as const,
    },
    {
      title: "4. Two-Party Confirmation",
      desc: "Enable both negotiating parties to independently confirm terms and flag revisions.",
      icon: CheckCircle,
      href: "/confirmations",
      badge: "Ready",
      badgeVariant: "success" as const,
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

  const displayName = user?.full_name || "Contract Sponsor";
  const displayEmail = user?.email || "";

  return (
    <div className="container mx-auto px-4 sm:px-8 py-10 space-y-12 max-w-6xl">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/80 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Authenticated Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {displayEmail && <span className="font-mono text-slate-500 mr-2">{displayEmail}</span>}
              Turn WhatsApp conversations into confirmed, reviewable commercial contracts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button size="sm" className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs">
                Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/evidence">
              <Button size="sm" variant="outline" className="text-xs font-semibold text-slate-700 hover:bg-slate-50 gap-1.5">
                Evidence Vault
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Chat Upload & Parser Scaffold */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Interactive Chat Ingestion & Normalizer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload an exported WhatsApp negotiation (.txt) or paste verbatim messages to extract terms and detect conflicts.
          </p>
        </div>
        <ChatUpload />
      </section>

      {/* Navigation Placeholders & System Modules */}
      <section className="space-y-6 pt-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Application Modules & Workflow Pipeline
          </h2>
          <p className="text-sm text-slate-500">
            Navigate through each stage of contract extraction, conflict resolution, and counterparty confirmation.
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
