"use client";

import { ChatUpload } from "@/components/chat/ChatUpload";
import { AlertCircle } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Upload WhatsApp Chat</h1>
        <p className="text-sm text-slate-500">
          Upload exported WhatsApp .txt chats to extract agreed terms, pricing, and obligations.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" /> Export Instructions
        </div>
        <p>
          Open WhatsApp on your phone &gt; Open the negotiation chat &gt; Tap Contact Name &gt;
          Export Chat &gt; Select <strong>Without Media</strong> &gt; Save the resulting .txt file.
        </p>
      </div>

      <ChatUpload />
    </div>
  );
}
