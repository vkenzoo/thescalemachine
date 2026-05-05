import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  phase: string;
  highlights?: string[];
}

export function ComingSoon({ title, eyebrow, description, icon: Icon, phase, highlights = [] }: Props) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-wider font-medium text-ink-dim hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3" />
          Voltar para o gerenciador
        </Link>

        <div className="flex items-start gap-5 pt-2">
          <div className="size-12 rounded-md bg-bg-surface border border-line grid place-items-center shrink-0">
            <Icon className="size-5 text-ink-muted" />
          </div>
          <div className="flex-1 space-y-3">
            <p className="eyebrow text-accent">{eyebrow}</p>
            <h1 className="font-display text-3xl text-ink tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-md text-ink-muted leading-relaxed pretty">{description}</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-line bg-bg-surface/40 p-5 mt-6 ml-[68px]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-2xs uppercase tracking-widest font-medium text-ink-dim">Status</span>
            <span className="text-2xs font-mono text-accent uppercase tracking-wider font-medium">{phase}</span>
          </div>
          {highlights.length > 0 && (
            <ul className="space-y-2 mt-3">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-ink-muted">
                  <span className="mt-1.5 size-1 rounded-full bg-ink-dim shrink-0" />
                  <span className="leading-relaxed">{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
