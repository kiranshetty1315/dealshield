"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api/client";
import { ChatUploadResponse } from "@/types";

const SAMPLE_CHAT_TEXT = `12/03/24, 10:15 - Raj Mehta: Hi Priya, regarding the website project we discussed
12/03/24, 10:16 - Priya Sharma: Yes, I've been thinking about it. I can handle the full redesign
12/03/24, 10:18 - Raj Mehta: Great. My budget is around ₹75,000 for everything
12/03/24, 10:20 - Priya Sharma: That's quite low for a full redesign. I'd normally charge ₹1,50,000
12/03/24, 10:22 - Raj Mehta: Can we meet somewhere in the middle? Maybe ₹1,00,000?
12/03/24, 10:25 - Priya Sharma: I could consider that, but it depends on the timeline
12/03/24, 10:27 - Raj Mehta: I need it done by end of April
12/03/24, 10:30 - Priya Sharma: That's tight. For ₹1,00,000 I might be able to do it, but I'd need 50% upfront
12/03/24, 10:32 - Raj Mehta: Sure, that works I think. Let's go ahead
12/03/24, 10:35 - Priya Sharma: Ok sounds good. I'll send over some initial mockups next week`;

export function ChatUpload({ onUploadSuccess }: { onUploadSuccess?: (data: ChatUploadResponse) => void }) {
  const router = useRouter();
  const [chatText, setChatText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ChatUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const data = await api.uploadChat(file);
      setResult(data);
      onUploadSuccess?.(data);
    } catch (err: any) {
      setError(err.message || "Failed to parse chat export file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!chatText.trim()) return;

    setIsUploading(true);
    setError(null);
    try {
      const data = await api.uploadChatText(chatText);
      setResult(data);
      onUploadSuccess?.(data);
    } catch (err: any) {
      setError(err.message || "Failed to parse chat text");
    } finally {
      setIsUploading(false);
    }
  };

  const loadSampleData = () => {
    setChatText(SAMPLE_CHAT_TEXT);
    setError(null);
  };

  const handleAnalyzeChat = async () => {
    if (!result?.chat_id) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await api.analyzeChat(result.chat_id);
      router.push(`/analysis?analysis_id=${encodeURIComponent(analysis.analysis_id)}&chat_id=${encodeURIComponent(result.chat_id)}`);
    } catch (err: any) {
      setError(err.message || "Failed to trigger AI agreement analysis");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload WhatsApp Negotiation</CardTitle>
              <CardDescription>
                Upload an exported WhatsApp .txt chat or paste conversation transcripts.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSampleData} className="gap-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Load Sample Negotiation (Raj vs Priya)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload Zone */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Upload className="h-8 w-8 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-slate-700 mb-1">Select WhatsApp .txt export</p>
              <p className="text-xs text-slate-500 mb-4">Export chat without media</p>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={isUploading || isAnalyzing} asChild>
                  <span>Browse File</span>
                </Button>
                <input
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading || isAnalyzing}
                />
              </label>
            </div>

            {/* Direct Paste Area */}
            <div className="flex flex-col space-y-2">
              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Or paste WhatsApp chat messages here...&#10;12/03/24, 10:15 - Raj: Hi...&#10;12/03/24, 10:16 - Priya: Hello..."
                className="w-full h-36 p-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none bg-slate-50/30"
              />
              <Button
                onClick={handleTextSubmit}
                disabled={isUploading || isAnalyzing || !chatText.trim()}
                className="w-full gap-2"
                size="sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing via API...
                  </>
                ) : (
                  <>
                    Parse Pasted Transcript
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Operation Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="mt-6 border border-emerald-200 bg-emerald-50/50 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900 text-sm">
                    Successfully Ingested & Parsed {result.message_count} Messages
                  </span>
                </div>
                <Badge variant="outline" className="bg-white text-xs font-mono">
                  Chat ID: {result.chat_id}
                </Badge>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-700 mr-2">Identified Parties:</span>
                  <div className="inline-flex gap-2">
                    {result.party_names.map((party) => (
                      <Badge key={party} variant="secondary" className="bg-white border text-xs">
                        {party}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Primary CTA: Analyze Negotiation */}
                <Button
                  onClick={handleAnalyzeChat}
                  disabled={isAnalyzing}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold shadow-sm"
                  size="sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing with AI (Section 7 ICA)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Negotiation with DealShield AI
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                <p className="text-xs font-medium text-slate-500">Normalized Messages (with stable IDs for legal citations):</p>
                {result.messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className="p-2.5 rounded bg-white border border-slate-200 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-700">{msg.sender}</span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {msg.message_id}
                      </span>
                    </div>
                    <p className="text-slate-800">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
