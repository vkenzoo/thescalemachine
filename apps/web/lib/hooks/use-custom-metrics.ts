"use client";

import useSWR from "swr";

export interface CustomMetric {
  id: string;
  key: string;            // 'cm_xxx' — id usado nas colunas
  label: string;
  formula: string;
  format: "currency" | "percent" | "number" | "ratio";
  good_is_up: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCustomMetrics() {
  const { data, error, isLoading, mutate } = useSWR<{ metrics: CustomMetric[] }>(
    "/api/custom-metrics",
    fetcher,
    { revalidateOnFocus: false }
  );
  return {
    metrics: data?.metrics ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
