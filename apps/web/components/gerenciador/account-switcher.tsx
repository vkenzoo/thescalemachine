"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Wallet, Plus, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { useMetaAccounts, type MetaAccount } from "@/lib/hooks/use-meta";
import { brl } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Private } from "@/lib/privacy";

interface Props {
  selectedAccountId: string | null;
  onSelect: (account: MetaAccount | null) => void;
}

const STORAGE_KEY = "gerenciador:selected-account";

export function AccountSwitcher({ selectedAccountId, onSelect }: Props) {
  const { accounts, isLoading, error } = useMetaAccounts();

  // Auto-seleciona primeira conta se nenhuma selecionada (e tem alguma)
  React.useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      // Tenta restaurar do localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      const restored = stored ? accounts.find((a) => a.account_id === stored) : null;
      onSelect(restored ?? accounts[0]);
    }
  }, [accounts, selectedAccountId, onSelect]);

  const active = accounts.find((a) => a.account_id === selectedAccountId);

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="h-9 pl-2 pr-3 inline-flex items-center gap-3 rounded-md border border-line bg-bg-surface min-w-[280px] animate-pulse">
        <div className="size-6 rounded bg-bg-elevated" />
        <div className="flex-1">
          <div className="h-3 bg-bg-elevated rounded w-2/3 mb-1.5" />
          <div className="h-2 bg-bg-elevated rounded w-1/2" />
        </div>
      </div>
    );
  }

  // Sem nenhuma conta — empty state
  if (accounts.length === 0) {
    return (
      <Link
        href="/connect"
        className="h-9 pl-2 pr-3 inline-flex items-center gap-2.5 rounded-md border border-dashed border-accent/40 bg-accent-subtle text-accent hover:bg-accent-subtle/70 transition-colors cursor-pointer min-w-[280px] text-left"
      >
        <Plus className="size-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold leading-tight">Conectar conta Meta</div>
          <div className="text-2xs opacity-70 mt-0.5">Nenhuma conta conectada ainda</div>
        </div>
      </Link>
    );
  }

  // Erro real
  if (error) {
    return (
      <div className="h-9 pl-2 pr-3 inline-flex items-center gap-2 rounded-md border border-negative/40 bg-negative-subtle text-negative min-w-[280px]">
        <AlertCircle className="size-4" />
        <span className="text-xs font-medium">Erro ao buscar contas</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-9 pl-2 pr-3 inline-flex items-center gap-3 rounded-md border border-line bg-bg-surface hover:border-line-strong transition-colors cursor-pointer min-w-[280px] text-left"
        >
          <div className="size-6 rounded bg-accent-subtle text-accent grid place-items-center text-2xs font-mono font-semibold shrink-0">
            {active?.name.split(" ").slice(0, 2).map((s) => s[0]).join("") ?? "??"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-ink truncate leading-tight">
              <Private>{active?.name ?? "Selecione uma conta"}</Private>
            </div>
            <div className="text-2xs text-ink-dim font-mono mt-0.5 tracking-tight">
              {active?.account_id ?? `${accounts.length} contas disponíveis`}
            </div>
          </div>
          <ChevronsUpDown className="size-3.5 text-ink-dim shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[360px] max-h-[480px] overflow-y-auto">
        <DropdownMenuLabel>Selecionar conta</DropdownMenuLabel>
        {accounts.map((acc) => {
          const isActive = acc.account_id === selectedAccountId;
          return (
            <DropdownMenuItem
              key={acc.id}
              onSelect={() => {
                onSelect(acc);
                localStorage.setItem(STORAGE_KEY, acc.account_id);
              }}
              className="flex items-start gap-3 py-2"
            >
              <div className={cn(
                "size-6 rounded grid place-items-center text-2xs font-mono font-semibold shrink-0 mt-0.5",
                isActive ? "bg-accent text-ink-inverse" : "bg-bg-inset text-ink-dim"
              )}>
                {acc.name.split(" ").slice(0, 2).map((s) => s[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink truncate font-medium">
                  <Private>{acc.name}</Private>
                </div>
                <div className="text-2xs text-ink-dim font-mono mt-0.5 flex items-center gap-2">
                  <span>{acc.account_id}</span>
                  <span className="text-ink-dim/60">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="size-3" />
                    {brl(acc.balance_cents / 100)}
                  </span>
                </div>
                {acc.business_manager_name && (
                  <div className="text-2xs text-ink-dim/80 mt-0.5 truncate">
                    {acc.business_manager_name}
                  </div>
                )}
              </div>
              {isActive && <Check className="size-3.5 text-accent shrink-0 mt-1" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <Link href="/connect" className="block">
          <DropdownMenuItem className="text-accent">
            <Plus />
            Conectar nova conta…
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
