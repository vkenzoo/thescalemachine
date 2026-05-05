"use client";

import * as React from "react";
import { Square, Trash2, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface QueueJob {
  id: string;
  name: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  progress: number; // 0..100
  error?: string;
}

export function QueuePanel({
  jobs,
  online,
  onAbort,
  onRemove,
  onPublishAll,
  publishing,
}: {
  jobs: QueueJob[];
  online: boolean;
  onAbort: () => void;
  onRemove: (id: string) => void;
  onPublishAll: () => void;
  publishing: boolean;
}) {
  const total = jobs.length;
  const done = jobs.filter((j) => j.status === "done" || j.status === "cancelled" || j.status === "failed").length;
  const overallPct = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="rounded-lg border border-line bg-bg-surface overflow-hidden">
      {/* Header da fila */}
      <div className="px-4 py-3 border-b border-line flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={cn(
            "size-2 rounded-full",
            online ? "bg-positive animate-pulse-dot" : "bg-warning"
          )} aria-hidden />
          <span className="text-xs font-semibold text-ink">{online ? "Online" : "Aguardando"}</span>
        </div>
        <Badge tone={publishing ? "warning" : "neutral"} size="xs" dot={publishing}>
          {publishing ? "Publicando…" : total === 0 ? "Fila vazia" : "Pronto para iniciar"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          {publishing ? (
            <Button variant="destructive" size="sm" onClick={onAbort}>
              <Square /> INTERROMPER AGORA
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onPublishAll}
              disabled={total === 0}
            >
              Publicar tudo ({total})
            </Button>
          )}
        </div>
      </div>

      {/* Progress overall */}
      <div className="px-4 py-3 border-b border-line bg-bg-inset/40">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xs uppercase tracking-wider font-medium text-ink-dim">Progresso geral</span>
          <span className="text-xs font-mono text-ink num">
            {done} / {total} <span className="text-ink-dim">({Math.round(overallPct)}%)</span>
          </span>
        </div>
        <Progress value={overallPct} tone={publishing ? "accent" : "positive"} size="sm" indeterminate={publishing && total === 0} />
      </div>

      {/* Tabela de jobs */}
      {jobs.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-ink-muted">A fila está vazia.</p>
          <p className="text-2xs text-ink-dim mt-1">Adicione anúncios pelo formulário acima.</p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-surface">
              <tr className="border-b border-line">
                <th className="px-4 py-2 text-left text-2xs font-medium uppercase tracking-wider text-ink-dim">Anúncio</th>
                <th className="px-4 py-2 text-left text-2xs font-medium uppercase tracking-wider text-ink-dim w-44">Status</th>
                <th className="px-4 py-2 text-right text-2xs font-medium uppercase tracking-wider text-ink-dim w-12">Ação</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <JobRow key={j.id} job={j} onRemove={() => onRemove(j.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function JobRow({ job, onRemove }: { job: QueueJob; onRemove: () => void }) {
  const StatusIcon = {
    queued: Clock,
    running: Loader2,
    done: CheckCircle2,
    failed: XCircle,
    cancelled: XCircle,
  }[job.status];

  const tone = {
    queued: "text-ink-dim",
    running: "text-accent",
    done: "text-positive",
    failed: "text-negative",
    cancelled: "text-ink-muted",
  }[job.status];

  return (
    <tr className="border-b border-line/40 last:border-b-0 hover:bg-bg-inset/40 transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={cn("size-3.5 shrink-0", tone, job.status === "running" && "animate-spin")} />
          <span className="text-ink truncate font-mono text-2xs">{job.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {job.status === "running" ? (
          <div className="flex items-center gap-2">
            <Progress value={job.progress} size="xs" className="flex-1" />
            <span className="font-mono text-2xs text-ink-dim w-8 text-right">{Math.round(job.progress)}%</span>
          </div>
        ) : (
          <Badge
            tone={
              job.status === "done" ? "positive"
              : job.status === "failed" ? "negative"
              : job.status === "cancelled" ? "warning"
              : "neutral"
            }
            size="xs"
          >
            {job.status === "queued" ? "Na fila"
              : job.status === "done" ? "Publicado"
              : job.status === "failed" ? "Falhou"
              : "Cancelado"}
          </Badge>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={onRemove}
          disabled={job.status === "running"}
          className="size-6 inline-flex items-center justify-center rounded text-ink-dim hover:text-negative hover:bg-bg-elevated transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Remover da fila"
        >
          <Trash2 className="size-3" />
        </button>
      </td>
    </tr>
  );
}
