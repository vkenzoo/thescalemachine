"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG, postJSON } from "@/lib/api";

// =============================================================
// Rules
// =============================================================
export interface Rule {
  id: string;
  name: string;
  accounts_filter: string[];
  scope: string;
  name_filter_op: "any" | "contains" | "not_contains" | "starts_with";
  name_filter_text: string;
  action: "pause" | "activate" | "increase_budget" | "decrease_budget" | "set_budget";
  action_value: number | null;
  action_unit: "pct" | "abs";
  conditions: { metric: string; op: string; value: number }[];
  period: string;
  schedule_mode: string;
  frequency: string;
  interval_mode: string;
  daily_limit: number | null;
  status: "active" | "paused";
  last_run_at: string | null;
  next_run_at: string | null;
  triggers_count: number;
  created_at: string;
  updated_at: string;
}

export function useRules() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ rules: Rule[] }>(
    "/api/rules",
    fetcher,
    SWR_CONFIG
  );
  return {
    rules: data?.rules ?? [],
    error,
    isLoading,
    refresh,
  };
}

export async function createRule(payload: Partial<Rule>) {
  return postJSON<{ rule: Rule }>("/api/rules", payload);
}

export async function updateRule(id: string, patch: Partial<Rule>) {
  const res = await fetch(`/api/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as { rule: Rule };
}

export async function deleteRule(id: string) {
  const res = await fetch(`/api/rules/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return true;
}

// =============================================================
// Alerts
// =============================================================
export interface Alert {
  id: string;
  name: string;
  metric: string;
  op: "gt" | "lt" | "eq" | "gte" | "lte";
  value: number;
  account_filter: string;
  enabled: boolean;
  last_check_at: string | null;
  last_triggered_at: string | null;
  triggers_count: number;
  created_at: string;
  updated_at: string;
}

export function useAlerts() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ alerts: Alert[] }>(
    "/api/alerts",
    fetcher,
    SWR_CONFIG
  );
  return {
    alerts: data?.alerts ?? [],
    error,
    isLoading,
    refresh,
  };
}

export async function createAlert(payload: { metric: string; op: string; value: number; account_filter?: string; name?: string }) {
  return postJSON<{ alert: Alert }>("/api/alerts", payload);
}

export async function updateAlert(id: string, patch: Partial<Alert>) {
  const res = await fetch(`/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as { alert: Alert };
}

export async function deleteAlert(id: string) {
  const res = await fetch(`/api/alerts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return true;
}
