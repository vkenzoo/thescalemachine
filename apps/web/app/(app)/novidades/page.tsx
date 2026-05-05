"use client";

import * as React from "react";
import { Sparkles, Wrench, Zap, Filter } from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Badge } from "@/components/ui/badge";
import { CHANGELOG, type ChangelogEntry } from "@/lib/mock-data";
import { cn } from "@/lib/cn";

const TYPE_META: Record<ChangelogEntry["type"], { label: string; icon: React.ComponentType<{ className?: string }>; tone: "accent" | "info" | "positive" }> = {
  feature:     { label: "Feature",        icon: Sparkles, tone: "accent" },
  improvement: { label: "Melhoria",       icon: Zap,      tone: "info" },
  fix:         { label: "Correção",       icon: Wrench,   tone: "positive" },
};

export default function NovidadesPage() {
  const [filter, setFilter] = React.useState<"all" | ChangelogEntry["type"]>("all");

  const filtered = filter === "all" ? CHANGELOG : CHANGELOG.filter((c) => c.type === filter);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Suporte"
        title="Novidades"
        description="Tudo que mudou no Ad Manager. Filtre por tipo se estiver procurando algo específico."
      />

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "feature", "improvement", "fix"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer",
              filter === t
                ? "bg-bg-elevated text-ink shadow-elev-1"
                : "text-ink-muted hover:text-ink hover:bg-bg-elevated"
            )}
          >
            {t === "all" ? <>Todas <span className="ml-1.5 text-2xs text-ink-dim font-mono">{CHANGELOG.length}</span></>
              : t === "feature"     ? "Features"
              : t === "improvement" ? "Melhorias"
              : "Correções"}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <ol className="relative space-y-8 pl-7">
        <span className="absolute left-2 top-2 bottom-2 w-px bg-line" aria-hidden />
        {filtered.map((entry, i) => {
          const meta = TYPE_META[entry.type];
          const MIcon = meta.icon;
          return (
            <li key={entry.id} className="relative">
              <span
                className={cn(
                  "absolute -left-7 top-0.5 size-4 rounded-full grid place-items-center ring-4 ring-bg-base shrink-0",
                  meta.tone === "accent" ? "bg-accent text-ink-inverse"
                    : meta.tone === "info" ? "bg-info text-ink-inverse"
                    : "bg-positive text-ink-inverse"
                )}
              >
                <MIcon className="size-2" />
              </span>

              <div className="space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <time className="text-2xs uppercase tracking-wider font-medium text-ink-dim font-mono">
                    {entry.date.split("-").reverse().join("/")}
                  </time>
                  <Badge tone={meta.tone} size="xs">
                    <MIcon className="size-2.5" />
                    {meta.label}
                  </Badge>
                  {entry.isNew && (
                    <Badge tone="accent" size="xs" className="animate-pulse-dot">
                      novo
                    </Badge>
                  )}
                </div>
                <h2 className="font-display text-xl text-ink tracking-tight leading-tight">
                  {entry.title}
                </h2>
                <p className="text-sm text-ink-muted leading-relaxed pretty">{entry.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
