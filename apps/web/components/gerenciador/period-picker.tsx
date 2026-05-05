"use client";

import * as React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import type { Period } from "@/lib/hooks/use-meta";

const PRESETS: { id: Period; label: string }[] = [
  { id: "today",      label: "Hoje" },
  { id: "yesterday",  label: "Ontem" },
  { id: "last_7d",    label: "Últimos 7 dias" },
  { id: "last_30d",   label: "Últimos 30 dias" },
  { id: "this_month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
  { id: "maximum",    label: "Máximo" },
];

interface Props {
  value?: Period;
  onChange?: (p: Period) => void;
}

export function PeriodPicker({ value, onChange }: Props) {
  const [internal, setInternal] = React.useState<Period>("last_30d");
  const active = value ?? internal;
  const setActive = (p: Period) => {
    if (onChange) onChange(p);
    else setInternal(p);
  };
  const current = PRESETS.find((p) => p.id === active) ?? PRESETS[3];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 px-2.5 inline-flex items-center gap-2 rounded-md border border-line bg-bg-surface text-xs font-medium text-ink hover:border-line-strong transition-colors cursor-pointer"
        >
          <Calendar className="size-3.5 text-ink-dim" />
          <span>{current.label}</span>
          <ChevronDown className="size-3 text-ink-dim" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Período</DropdownMenuLabel>
        {PRESETS.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => setActive(p.id)}
            className={active === p.id ? "text-ink bg-bg-surface" : ""}
          >
            {p.label}
            {active === p.id && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>Personalizado…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
