"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, FileCode, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import { DocumentHashVerification } from "@/types";

export default function EvidencePage() {
  const [content, setContent] = useState("Agreement between Raj Mehta and Priya Sharma for ₹1,00,000");
  const [expectedHash, setExpectedHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<DocumentHashVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleComputeAndVerify = async () => {
    if (!content.trim()) return;

    setIsVerifying(true);
    setError(null);
    try {
      // If no expected hash was provided, let's verify against itself to show computed hash
      const hashToTest = expectedHash.trim() || "placeholder-hash";
      const res = await api.verifyHash(content, hashToTest);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Verification request failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-8 max-w-5xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Evidence Vault & Integrity Verifier</h1>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
            SHA-256 Protected
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          Cryptographically verify that contract drafts or chat transcripts have not been tampered with.
        </p>
      </div>

      {/* Verifier Interactive Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Live Hash Integrity Check
          </CardTitle>
          <CardDescription className="text-xs">
            Checks consistency against recorded SHA-256 fingerprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <Button onClick={handleComputeAndVerify} disabled={isVerifying} className="gap-2" size="sm">
            <ShieldCheck className="h-4 w-4" />
            {isVerifying ? "Verifying..." : "Compute & Verify Digest"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Verification Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
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
            It provides corroborative evidentiary support under Section 65B of the Indian Evidence Act, 1872 / Bharatiya Sakshya Adhiniyam, 2023.
          </p>
          <p>
            However, a hash alone does <strong>not</strong> prove party identity, statutory intention, or satisfy the criteria of an electronic signature under Section 3/3A of the Information Technology Act, 2000.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
