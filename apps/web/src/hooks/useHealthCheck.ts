"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { HealthResponse } from "@/types";

export function useHealthCheck(pollIntervalMs: number = 10000) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    try {
      setIsLoading(true);
      const res = await api.checkHealth();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect to backend");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { data, isLoading, error, refetch: check };
}
