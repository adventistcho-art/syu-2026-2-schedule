"use client";

import { useQuery } from "@tanstack/react-query";

export type WriteAccess = {
  allowed: boolean;
  ip: string | null;
  range: string;
};

async function fetchWriteAccess(): Promise<WriteAccess> {
  const res = await fetch("/api/events/write-access", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    return { allowed: false, ip: null, range: "" };
  }
  return res.json();
}

export function useWriteAccess(enabled = true) {
  return useQuery({
    queryKey: ["events", "write-access"],
    queryFn: fetchWriteAccess,
    enabled,
    staleTime: 30_000,
  });
}
