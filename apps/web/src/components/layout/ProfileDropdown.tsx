"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Settings,
  Trash2,
  LogOut,
  ChevronDown,
  Shield,
  KeyRound,
} from "lucide-react";
import { SettingsModal } from "@/components/layout/SettingsModal";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"history" | "security" | "profile">("history");
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

  const openSettings = (tab: "history" | "security" | "profile") => {
    setModalTab(tab);
    setIsSettingsOpen(true);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    alert("Logged out of local demo session. (Ready for Supabase Auth in production)");
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
            DS
          </div>
          <span className="font-semibold text-slate-800 hidden sm:inline">Demo User</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            {/* User Account Info Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
              <p className="font-bold text-slate-900 text-xs">Demo User</p>
              <p className="text-[11px] text-slate-500 font-mono">demo@dealshield.local</p>
              <div className="pt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Contract Sponsor
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AES-256 Protected
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => openSettings("profile")}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                Profile Details
              </button>

              <button
                type="button"
                onClick={() => openSettings("history")}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                Delete Message History (DPDP)
              </button>

              <button
                type="button"
                onClick={() => openSettings("security")}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                Change Password & Security
              </button>
            </div>

            {/* Logout Footer */}
            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings & Privacy Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={modalTab}
      />
    </>
  );
}
