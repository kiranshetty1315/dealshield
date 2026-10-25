"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Search,
  History,
  Loader2,
  Database,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { DocumentHashVerification, AuditEvent } from "@/types";
import { AuthGuard } from "@/components/auth/AuthGuard";

function EvidenceContent() {
  const searchParams = useSearchParams();
  const entityIdParam = searchParams.get("entity_id") || "";

  const [content, setContent] = useState("Agreement between Raj Mehta and Priya Sharma for ₹1,00,000");
  const [expectedHash, setExpectedHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<DocumentHashVerification | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Audit trail state
  const [auditEntityId, setAuditEntityId] = useState(entityIdParam);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isFetchingAudit, setIsFetchingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const fetchAuditTrail = async (targetId: string) => {
    if (!targetId.trim()) return;

    setIsFetchingAudit(true);
    setAuditError(null);
    try {
      const events = await api.getAuditTrail(targetId.trim());
      setAuditEvents(events);
    } catch (err: any) {
      setAuditError(err.message || "Failed to load audit events");
      setAuditEvents([]);
    } finally {
      setIsFetchingAudit(false);
    }
  };

  useEffect(() => {
    if (entityIdParam) {
      setAuditEntityId(entityIdParam);
      fetchAuditTrail(entityIdParam);
    }
  }, [entityIdParam]);

  const handleComputeAndVerify = async () => {
    if (!content.trim()) return;

    setIsVerifying(true);
    setVerifyError(null);
    try {
      const hashToTest = expectedHash.trim() || "placeholder-hash";
      const res = await api.verifyHash(content, hashToTest);
      setResult(res);
    } catch (err: any) {
      setVerifyError(err.message || "Verification request failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-3xl font-extrabold text-slate-900">Evidence Vault & Integrity Verifier</h1>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
            Tamper-Evident Ledger
          </Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
            SHA-256 Protected
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Cryptographically verify document integrity and inspect append-only audit records from Supabase.
        </p>
      </div>

      {/* Live Audit Trail Viewer */}
      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                Live Append-Only Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Query immutable event history for any conversation, analysis, or agreement.
              </CardDescription>
            </div>
            {auditEvents.length > 0 && (
              <Badge variant="success" className="text-xs">
                {auditEvents.length} Event{auditEvents.length > 1 ? "s" : ""} Recorded
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Enter Entity ID (UUID of agreement, analysis, or conversation)..."
              value={auditEntityId}
              onChange={(e) => setAuditEntityId(e.target.value)}
              className="text-xs font-mono max-w-lg"
            />
            <Button
              size="sm"
              onClick={() => fetchAuditTrail(auditEntityId)}
              disabled={isFetchingAudit || !auditEntityId.trim()}
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isFetchingAudit ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Fetching Log...
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  Query Audit Log
                </>
              )}
            </Button>
          </div>

          {auditError && (
            <Alert variant="destructive" className="text-xs">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{auditError}</AlertDescription>
            </Alert>
          )}

          {auditEvents.length > 0 ? (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {auditEvents.map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="p-3 border border-slate-200 rounded-lg bg-white space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-slate-900 capitalize">
                        {event.action.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {event.entity_type}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>ID: {event.id}</span>
                    <span>Target: {event.entity_id.slice(0, 16)}...</span>
                  </div>

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px] font-mono text-slate-700">
                      {JSON.stringify(event.metadata)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !isFetchingAudit && (
              <p className="text-xs text-slate-400 italic">
                {auditEntityId ? "No audit events logged yet for this entity ID." : "Enter an Entity ID above or navigate from confirmations to view live tamper-evident audit events."}
              </p>
            )
          )}
        </CardContent>
      </Card>

      {/* Verifier Interactive Card */}
      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Search className="h-4 w-4 text-blue-600" />
            Live Hash Integrity Check
          </CardTitle>
          <CardDescription className="text-xs">
            Checks consistency against recorded SHA-256 fingerprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Document / Agreement Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Expected SHA-256 Digest (Optional)</label>
            <input
              type="text"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              placeholder="Paste 64-char hex digest to verify match..."
              className="w-full p-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <Button onClick={handleComputeAndVerify} disabled={isVerifying} className="gap-2 text-xs" size="sm">
            <ShieldCheck className="h-4 w-4" />
            {isVerifying ? "Verifying..." : "Compute & Verify Digest"}
          </Button>

          {verifyError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Verification Error</AlertTitle>
              <AlertDescription>{verifyError}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="border rounded-lg p-4 bg-slate-50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Computed SHA-256 Fingerprint:</span>
                <Badge variant={result.is_valid ? "success" : "secondary"}>
                  {result.is_valid ? "Integrity Match" : "Digest Computed"}
                </Badge>
              </div>
              <div className="font-mono bg-white p-2 rounded border break-all text-slate-800">
                {result.computed_hash}
              </div>
              <p className="text-slate-600">{result.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limitations Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Statutory Limitations Notice (Indian Legal Framework)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-amber-800 space-y-2 leading-relaxed">
          <p>
            A SHA-256 mathematical hash confirms that a document or file has not been altered since the fingerprint was generated.
            It provides corroborative evidentiary support under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (formerly Section 65B of the Indian Evidence Act, 1872).
          </p>
          <p>
            However, a hash alone does <strong>not</strong> prove party identity, statutory intention, or satisfy the criteria of an electronic signature under Section 3/3A of the Information Technology Act, 2000.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EvidencePage() {
  return (
    <AuthGuard>
      <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700">Loading Evidence Vault...</p>
        </div>
      }
    >
      <EvidenceContent />
    </Suspense>
    </AuthGuard>
  );
}