"use client";

import * as React from "react";
import { Search, Play, Clock } from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TUTORIALS, type Tutorial } from "@/lib/mock-data";
import { cn } from "@/lib/cn";

const CATEGORIES = [
  { id: "all",                label: "Todos",            color: "bg-accent" },
  { id: "primeiros-passos",   label: "Primeiros passos", color: "bg-info" },
  { id: "operacao",           label: "Operação",          color: "bg-warning" },
  { id: "automacao",          label: "Automação",         color: "bg-positive" },
  { id: "avancado",           label: "Avançado",          color: "bg-accent" },
];

export default function TutoriaisPage() {
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState<string>("all");

  const filtered = TUTORIALS.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (query && !t.title.toLowerCase().includes(query.toLowerCase()) && !t.description.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Suporte"
        title="Tutoriais"
        description="Aprenda os recursos do Ad Manager em vídeos curtos. Cada tutorial dura entre 2 e 6 minutos."
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tutorial…"
            className="pl-8 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={cn(
                "h-8 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer",
                cat === c.id
                  ? "bg-bg-elevated text-ink shadow-elev-1"
                  : "text-ink-muted hover:text-ink hover:bg-bg-elevated"
              )}
            >
              <span className={cn("size-1.5 rounded-full inline-block mr-1.5", c.color)} aria-hidden />
              {c.label}
            </button>
          ))}
        </div>
        <Badge tone="neutral" size="sm" className="ml-auto">
          {filtered.length} {filtered.length === 1 ? "tutorial" : "tutoriais"}
        </Badge>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <TutorialCard key={t.id} tutorial={t} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Nenhum tutorial encontrado para "{query}".</p>
        </div>
      )}
    </div>
  );
}

function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  return (
    <article className="group cursor-pointer">
      {/* Thumb */}
      <div className="relative aspect-video rounded-lg overflow-hidden border border-line bg-gradient-to-br from-bg-elevated to-bg-inset transition-transform group-hover:-translate-y-0.5">
        <div className="absolute inset-0 grid place-items-center">
          <div className="size-12 rounded-full bg-accent grid place-items-center shadow-elev-2 transition-transform duration-300 group-hover:scale-110">
            <Play className="size-4 text-ink-inverse fill-ink-inverse ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 h-5 rounded-sm bg-bg-base/80 backdrop-blur text-2xs font-mono text-ink flex items-center gap-1">
          <Clock className="size-2.5" />
          {tutorial.duration}
        </div>
        {/* Decorative waveform */}
        <div className="absolute top-3 left-3 right-3 flex gap-0.5">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-ink/8 rounded-sm"
              style={{ height: `${3 + Math.sin(i * 0.6) * 2.5}px` }}
            />
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge tone="neutral" size="xs">
            <span className={cn(
              "size-1.5 rounded-full",
              tutorial.category === "primeiros-passos" ? "bg-info" :
              tutorial.category === "operacao" ? "bg-warning" :
              tutorial.category === "automacao" ? "bg-positive" : "bg-accent"
            )} />
            {CATEGORIES.find((c) => c.id === tutorial.category)?.label}
          </Badge>
          <span className="text-2xs text-ink-dim font-mono">#{tutorial.id.toString().padStart(2, "0")}</span>
        </div>
        <h3 className="text-sm font-medium text-ink leading-tight group-hover:text-accent transition-colors">
          {tutorial.title}
        </h3>
        <p className="text-2xs text-ink-dim leading-relaxed pretty">{tutorial.description}</p>
      </div>
    </article>
  );
}
