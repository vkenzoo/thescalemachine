"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG, postJSON } from "@/lib/api";

// =============================================================
// Column Presets
// =============================================================
export interface ColumnPreset {
  id: string;
  user_id: string;
  name: string;
  cols: string[];
  created_at: string;
  updated_at: string;
}

export function useColumnPresets() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ presets: ColumnPreset[] }>(
    "/api/column-presets",
    fetcher,
    SWR_CONFIG
  );
  return {
    presets: data?.presets ?? [],
    error,
    isLoading,
    refresh,
  };
}

export async function createColumnPreset(name: string, cols: string[]) {
  return postJSON<{ preset: ColumnPreset }>("/api/column-presets", { name, cols });
}

export async function updateColumnPreset(id: string, patch: { name?: string; cols?: string[] }) {
  const res = await fetch(`/api/column-presets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as { preset: ColumnPreset };
}

export async function deleteColumnPreset(id: string) {
  const res = await fetch(`/api/column-presets/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.error ?? `HTTP ${res.status}`);
  }
  return true;
}

// =============================================================
// User Preferences (singleton)
// =============================================================
export interface UserPreferences {
  user_id: string;
  selected_columns: string[];
  active_preset_id: string | null;
  selected_metrics: string[];
  privacy_mode: boolean;
}

export function useUserPreferences() {
  const { data, error, isLoading, mutate: refresh } = useSWR<{ preferences: UserPreferences }>(
    "/api/user-preferences",
    fetcher,
    SWR_CONFIG
  );
  return {
    preferences: data?.preferences,
    error,
    isLoading,
    refresh,
  };
}

export async function updateUserPreferences(patch: Partial<Omit<UserPreferences, "user_id">>) {
  const res = await fetch("/api/user-preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as { preferences: UserPreferences };
}
