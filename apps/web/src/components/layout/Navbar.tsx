"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import { Button } from "@/components/ui/button";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const { data: health, isLoading: isHealthLoading } = useHealthCheck(15000);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/upload", label: "Upload" },
    { href: "/analysis", label: "Analysis" },
    { href: "/agreements", label: "Agreements" },
    { href: "/confirmations", label: "Confirmations" },
    { href: "/evidence", label: "Evidence Vault" },
  ];

  if (pathname?.startsWith("/review")) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900 tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span>DealShield<span className="text-blue-600">AI</span></span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted Counterparty Review Portal</span>
          </div>
        </div>
      </header>
    );
  }

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
            {mounted && isAuthenticated && navItems.map((item) => {
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

        {/* Right Section: Auth Actions */}
        <div className="flex items-center gap-3">
          {/* Dynamic Auth Section: Login/Signup buttons or User Profile Dropdown */}
          {mounted && !isAuthLoading && !isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5 text-slate-500" />
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Sign Up
                </Button>
              </Link>
            </div>
          ) : (
            <ProfileDropdown />
          )}
        </div>
      </div>
    </header>
  );
}
