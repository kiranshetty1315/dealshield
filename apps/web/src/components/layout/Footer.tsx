import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8 text-sm text-slate-500">
      <div className="container mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-slate-800">DealShield AI</span>
          <span>— Hackathon Problem Statement LS-06: From Handshake to Contract</span>
        </div>
        <div className="text-xs text-slate-500 text-center md:text-right max-w-md">
          Integrity hashes verify document consistency against audit logs. Does not replace statutory eSign certificates under the Indian IT Act.
        </div>
      </div>
    </footer>
  );
}
