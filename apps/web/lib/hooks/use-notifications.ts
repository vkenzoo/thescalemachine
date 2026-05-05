"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/api";

export interface Notification {
  id: string;
  user_id: string;
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  description: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{
    notifications: Notification[];
    unread_count: number;
  }>("/api/notifications", fetcher, {
    ...SWR_CONFIG,
    refreshInterval: 60 * 1000, // re-fetch a cada 1min pra capturar novas
  });
  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unread_count ?? 0,
    error,
    isLoading,
    refresh,
  };
}

export async function markAllNotificationsRead() {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}
