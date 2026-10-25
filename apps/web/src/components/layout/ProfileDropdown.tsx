"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export function ProfileDropdown() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenLogoutDialog = () => {
    setIsOpen(false);
    setIsLogoutDialogOpen(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutDialogOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";
  const displayRole = user?.role || "Contract Sponsor";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "DS";

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
            {initials}
          </div>
          <span className="font-semibold text-slate-800 hidden sm:inline">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            {/* User Account Info Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
              <p className="font-bold text-slate-900 text-xs truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">{displayEmail}</p>
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {displayRole}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Fernet Protected
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium"
              >
                <User className="h-3.5 w-3.5 text-blue-600" />
                Profile Details
              </Link>

              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium"
              >
                <Settings className="h-3.5 w-3.5 text-slate-600" />
                Settings & Privacy
              </Link>
            </div>

            {/* Logout Footer */}
            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={handleOpenLogoutDialog}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOG BOX FOR LOGOUT */}
      {isLogoutDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                <LogOut className="h-6 w-6 text-slate-700" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-900">Confirm Log Out</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to log out of DealShield AI? Your local session will be cleared.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              In production, logging out terminates your active Supabase Auth JWT session.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmLogout}
                className="text-xs gap-1.5 shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                Yes, Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
