"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify and retry.");
      return;
    }

    setIsLoading(true);
    try {
      await signup(
        email.trim(),
        password,
        fullName.trim() || "DealShield User",
        organization.trim() || undefined
      );
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again with a different email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center min-h-[calc(100vh-160px)]">
      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>

        {/* Card */}
        <Card className="border-slate-200 shadow-xl overflow-hidden">
          <CardHeader className="space-y-2 text-center bg-slate-50/60 border-b border-slate-100 pb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
              Create DealShield<span className="text-blue-600">AI</span> Account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto">
              Get started converting informal negotiations into plain-language commercial agreements with tamper-evident audit trails.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {error && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">Registration Error</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Adv. Priya Sharma"
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Work Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-9 text-xs"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Organization / Firm (Optional)</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. LegalTech Advisors"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">Password</label>
                  <span className="text-[11px] text-slate-400">Min. 6 characters</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password..."
                    className="pl-9 pr-9 text-xs"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password..."
                    className="pl-9 text-xs"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-xs font-bold h-10 gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="border border-slate-100 bg-slate-50/70 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                Statutory Privacy Protection
              </div>
              <p>
                All uploaded WhatsApp transcripts are protected under application-level Fernet (AES-128-CBC + HMAC) encryption with Section 12 DPDP Act 2023 erasure rights.
              </p>
            </div>

            <div className="pt-2 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 font-bold hover:underline">
                Log In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
