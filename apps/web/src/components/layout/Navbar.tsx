"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Activity, AlertCircle } from "lucide-react";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const pathname = usePathname();
  const { data: health, isLoading, error } = useHealthCheck(15000);

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/upload", label: "Upload" },
    { href: "/analysis", label: "Analysis" },
    { href: "/agreements", label: "Agreements" },
    { href: "/confirmations", label: "Confirmations" },
    { href: "/evidence", label: "Evidence Vault" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900 tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span>DealShield<span className="text-blue-600">AI</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-blue-600 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs border border-slate-200 px-3 py-1.5 rounded-full bg-slate-50">
            {isLoading && !health ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-slate-600">Checking API...</span>
              </>
            ) : health?.status === "healthy" ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 font-medium">Backend Online (v{health.version})</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-red-700 font-medium">Backend Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
