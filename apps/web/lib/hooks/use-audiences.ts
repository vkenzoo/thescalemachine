"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/api";

// =============================================================
// Custom Audiences existentes
// =============================================================
export interface MetaAudienceRow {
  id: string;
  name: string;
  subtype: string;
  description: string | null;
  approximateCount: number | null;
  retentionDays: number | null;
  deliveryStatus: string | null;
  deliveryStatusCode: number | null;
}

export function useMetaAudiences(accountId: string | null) {
  const key = accountId ? `/api/meta/audiences?account=${accountId}` : null;
  const { data, error, isLoading, mutate: refresh } = useSWR<{ audiences: MetaAudienceRow[] }>(
    key,
    fetcher,
    SWR_CONFIG
  );
  return { audiences: data?.audiences ?? [], error, isLoading, refresh };
}

// =============================================================
// Pixels
// =============================================================
export interface MetaPixelRow {
  id: string;
  name: string;
  lastFiredTime: string | null;
  isUnavailable: boolean;
}

export function useMetaPixels(accountId: string | null) {
  const key = accountId ? `/api/meta/pixels?account=${accountId}` : null;
  const { data, error, isLoading } = useSWR<{ pixels: MetaPixelRow[] }>(key, fetcher, SWR_CONFIG);
  return { pixels: data?.pixels ?? [], error, isLoading };
}

// =============================================================
// Videos
// =============================================================
export interface MetaVideoRow {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  lengthSeconds: number | null;
  createdAt: string | null;
}

export function useMetaVideos(accountId: string | null) {
  const key = accountId ? `/api/meta/videos?account=${accountId}` : null;
  const { data, error, isLoading } = useSWR<{ videos: MetaVideoRow[] }>(key, fetcher, SWR_CONFIG);
  return { videos: data?.videos ?? [], error, isLoading };
}

// =============================================================
// Pages
// =============================================================
export interface MetaPageRow {
  id: string;
  name: string;
  category: string | null;
  instagramId: string | null;
  instagramUsername: string | null;
}

export function useMetaPages() {
  const { data, error, isLoading } = useSWR<{ pages: MetaPageRow[] }>("/api/meta/pages", fetcher, SWR_CONFIG);
  return { pages: data?.pages ?? [], error, isLoading };
}

// =============================================================
// Instagram Accounts
// =============================================================
export interface MetaIgAccountRow {
  id: string;
  username: string | null;
  profilePictureUrl: string | null;
}

export function useMetaInstagramAccounts() {
  const { data, error, isLoading } = useSWR<{ accounts: MetaIgAccountRow[] }>(
    "/api/meta/instagram-accounts",
    fetcher,
    SWR_CONFIG
  );
  return { accounts: data?.accounts ?? [], error, isLoading };
}

// =============================================================
// Batch create
// =============================================================
export interface BatchCreateBody {
  account_id: string;
  retention_keys: string[];
  ig?: { account_id: string; username?: string; event_keys: string[] };
  fb?: { page_id: string; page_name?: string; event_keys: string[] };
  video?: {
    video_ids: { id: string; title?: string }[];
    event_keys: string[];
    prefix?: string;
  };
  pixel?: {
    pixel_id: string;
    event_names: string[];
    site_url?: string;
    site_url_enabled?: boolean;
  };
  lookalike?: {
    source_audience_id: string;
    source_name?: string;
    ratio_keys: string[];
    country?: string;
  };
}

export interface BatchResult {
  ok: boolean;
  total: number;
  created_count: number;
  failed_count: number;
  created: { id: string; name: string; kind: string }[];
  failed: { name: string; kind: string; message: string }[];
}

export async function createAudiencesBatch(body: BatchCreateBody): Promise<BatchResult> {
  const res = await fetch("/api/meta/audiences/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
  return data;
}
