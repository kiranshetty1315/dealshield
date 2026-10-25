"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams?.get("redirect") || "/";
      router.push(redirect);
    }
  }, [isAuthenticated, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      const redirect = searchParams?.get("redirect") || "/";
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
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
              Sign In to DealShield<span className="text-blue-600">AI</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto">
              Enter your credentials to manage negotiated contracts and tamper-evident evidence vaults.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {error && (
              <Alert variant="destructive" className="text-xs">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">Authentication Failed</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@dealshield.local"
                    className="pl-9 text-xs"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">Password</label>
                  <span className="text-[11px] text-slate-400">Min. 6 chars</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="pl-9 pr-9 text-xs"
                    autoComplete="current-password"
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-xs font-bold h-10 gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500">
              Don&apos;t have an account yet?{" "}
              <Link href="/signup" className="text-blue-600 font-bold hover:underline">
                Sign Up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-700">Loading... Please wait</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
