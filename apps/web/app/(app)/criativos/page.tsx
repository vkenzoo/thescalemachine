"use client";

import * as React from "react";
import Image from "next/image";
import {
  Trophy, TrendingUp, MousePointerClick, ShoppingCart,
  Receipt, DollarSign, Image as ImageIcon, Video, ExternalLink,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { AccountSwitcher } from "@/components/gerenciador/account-switcher";
import { PeriodPicker } from "@/components/gerenciador/period-picker";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { brl, num, pct } from "@/lib/format";
import { useMetaAccounts, useMetaAds, type MetaAccount, type Period, type MetaAdRow } from "@/lib/hooks/use-meta";
import { Plug, AlertTriangle, Search } from "lucide-react";
import { Private } from "@/lib/privacy";
import { cn } from "@/lib/cn";

type SortKey =
  | "roas" | "revenue" | "ctr" | "cpc" | "avgTicket" | "cpa";

const SORT_OPTIONS: { id: SortKey; label: string; dir: "desc" | "asc"; icon: any; color: string }[] = [
  { id: "roas",      label: "Maior ROAS",         dir: "desc", icon: TrendingUp,        color: "text-positive" },
  { id: "revenue",   label: "Maior Receita",      dir: "desc", icon: ShoppingCart,      color: "text-positive" },
  { id: "ctr",       label: "Maior CTR",          dir: "desc", icon: MousePointerClick, color: "text-info"     },
  { id: "cpc",       label: "Menor CPC",          dir: "asc",  icon: DollarSign,        color: "text-warning"  },
  { id: "avgTicket", label: "Maior Ticket Médio", dir: "desc", icon: Receipt,           color: "text-accent"   },
  { id: "cpa",       label: "Menor CPA",          dir: "asc",  icon: Receipt,           color: "text-warning"  },
];

export default function CriativosPage() {
  const { accounts, isLoading: accLoading } = useMetaAccounts();
  const [selectedAccount, setSelectedAccount] = React.useState<MetaAccount | null>(null);
  const [period, setPeriod] = React.useState<Period>("last_30d");
  const [sortKey, setSortKey] = React.useState<SortKey>("roas");
  const [activeOnly, setActiveOnly] = React.useState(true);
  const [hadSpend, setHadSpend] = React.useState(true);
  const [query, setQuery] = React.useState("");

  const accountId = selectedAccount?.account_id ?? null;
  const { ads, isLoading: adsLoading, error: adsError } = useMetaAds(accountId, period);

  // Auto-select primeira conta
  React.useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  const sortConfig = SORT_OPTIONS.find((s) => s.id === sortKey)!;

  const filtered = React.useMemo(() => {
    let list = ads;
    if (activeOnly) list = list.filter((a) => a.status === "ACTIVE");
    if (hadSpend) list = list.filter((a) => a.spend > 0);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.includes(query) ||
        a.campaignName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [ads, activeOnly, hadSpend, query]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      // Quando ordenar ASC (menor é melhor), excluir 0 do topo
      if (sortConfig.dir === "asc") {
        if (va === 0) return 1;
        if (vb === 0) return -1;
        return va - vb;
      }
      return vb - va;
    });
    return arr;
  }, [filtered, sortKey, sortConfig.dir]);

  if (!accLoading && accounts.length === 0) {
    return (
      <div className="px-3 sm:px-6 py-6 max-w-[1600px] mx-auto">
        <EmptyState
          icon={Plug}
          title="Nenhuma conta Meta conectada"
          description="Conecte sua conta primeiro pra analisar os criativos."
        />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      <ModuleHeader
        eyebrow="Análise"
        title="Criativos"
        description="Rankings dos seus anúncios pelo que importa: ROAS, Receita, CTR, CPC, Ticket Médio e CPA."
      />

      <div className="flex items-center gap-3 flex-wrap">
        <AccountSwitcher value={selectedAccount} onChange={setSelectedAccount} accounts={accounts} loading={accLoading} />
        <PeriodPicker value={period} onChange={setPeriod} />
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[200px]">
            <Trophy className="size-3.5 mr-1 text-warning" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.id} value={opt.id}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className={cn("size-3.5", opt.color)} />
                    {opt.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome do ad, ID ou campanha…"
            className="pl-8 h-8"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
          <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
          Apenas ativos
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
          <Switch checked={hadSpend} onCheckedChange={setHadSpend} />
          Tiveram veiculação
        </label>
        <Badge tone="neutral" size="xs">{sorted.length} anúncios</Badge>
      </div>

      {adsError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao buscar anúncios"
          description={adsError.message}
        />
      ) : adsLoading && ads.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-bg-elevated/40 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={query ? "Nenhum anúncio encontrado" : "Sem anúncios no período"}
          description={query ? "Tente outro termo ou limpe a busca." : "Sem dados nesse intervalo."}
        />
      ) : (
        <CreativesTable
          ads={sorted}
          highlightKey={sortKey}
          accountId={accountId}
        />
      )}
    </div>
  );
}

// =============================================================
function CreativesTable({
  ads, highlightKey, accountId,
}: { ads: MetaAdRow[]; highlightKey: SortKey; accountId: string | null }) {
  return (
    <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-inset/40 border-b border-line">
            <tr>
              <th className="text-2xs uppercase tracking-wider text-ink-dim font-semibold px-3 py-2.5 text-left w-10">#</th>
              <th className="text-2xs uppercase tracking-wider text-ink-dim font-semibold px-3 py-2.5 text-left">Anúncio</th>
              <th className="text-2xs uppercase tracking-wider text-ink-dim font-semibold px-3 py-2.5 text-left hidden md:table-cell">Campanha</th>
              <Th label="Investido" active={highlightKey === "spend" as any} />
              <Th label="Receita" active={highlightKey === "revenue"} />
              <Th label="ROAS" active={highlightKey === "roas"} />
              <Th label="CTR" active={highlightKey === "ctr"} />
              <Th label="CPC" active={highlightKey === "cpc"} />
              <Th label="CPA" active={highlightKey === "cpa"} />
              <Th label="Ticket" active={highlightKey === "avgTicket"} />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {ads.map((ad, idx) => (
              <CreativeRow key={ad.id} ad={ad} rank={idx + 1} highlightKey={highlightKey} accountId={accountId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, active }: { label: string; active: boolean }) {
  return (
    <th className={cn(
      "text-2xs uppercase tracking-wider font-semibold px-3 py-2.5 text-right whitespace-nowrap",
      active ? "text-warning" : "text-ink-dim"
    )}>
      {active && <Trophy className="size-3 inline mr-1" />}
      {label}
    </th>
  );
}

function CreativeRow({
  ad, rank, highlightKey, accountId,
}: { ad: MetaAdRow; rank: number; highlightKey: SortKey; accountId: string | null }) {
  const isActive = ad.status === "ACTIVE";
  const isTop3 = rank <= 3;

  return (
    <tr className={cn(
      "border-b border-line/60 hover:bg-bg-inset/40 transition-colors",
      !isActive && "opacity-60"
    )}>
      <td className="px-3 py-2.5 text-center">
        <span className={cn(
          "inline-flex items-center justify-center size-6 rounded-full text-2xs font-bold font-mono",
          isTop3 && rank === 1 ? "bg-warning/20 text-warning" :
          isTop3 && rank === 2 ? "bg-info/20 text-info" :
          isTop3 && rank === 3 ? "bg-ink-muted/20 text-ink-muted" :
          "text-ink-dim"
        )}>
          {rank}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <CreativeThumb url={ad.thumbnailUrl} type={ad.creativeType} />
          <div className="min-w-0">
            <p className="text-ink font-medium truncate max-w-[280px] leading-tight">
              <Private>{ad.name}</Private>
            </p>
            <p className="font-mono text-2xs text-ink-dim mt-0.5">
              ID {ad.id}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-ink-muted text-2xs truncate max-w-[200px] hidden md:table-cell">
        <Private>{ad.campaignName}</Private>
      </td>
      <Cell highlight={highlightKey === ("spend" as any)}>{brl(ad.spend)}</Cell>
      <Cell highlight={highlightKey === "revenue"}>{ad.revenue > 0 ? brl(ad.revenue) : "—"}</Cell>
      <Cell highlight={highlightKey === "roas"} good={ad.roas >= 1}>
        {ad.roas > 0 ? `${ad.roas.toFixed(2)}×` : "—"}
      </Cell>
      <Cell highlight={highlightKey === "ctr"}>{pct(ad.ctr)}</Cell>
      <Cell highlight={highlightKey === "cpc"}>{ad.cpc > 0 ? brl(ad.cpc) : "—"}</Cell>
      <Cell highlight={highlightKey === "cpa"}>{ad.cpa > 0 ? brl(ad.cpa) : "—"}</Cell>
      <Cell highlight={highlightKey === "avgTicket"}>{ad.avgTicket > 0 ? brl(ad.avgTicket) : "—"}</Cell>
      <td className="px-2 py-2.5 text-right">
        {accountId && (
          <a
            href={`https://www.facebook.com/adsmanager/manage/ads?act=${accountId.replace("act_", "")}&selected_ad_ids=${ad.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-accent hover:bg-bg-elevated transition-colors"
            title="Abrir no Meta Ads"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </td>
    </tr>
  );
}

function Cell({
  children, highlight, good,
}: { children: React.ReactNode; highlight?: boolean; good?: boolean }) {
  return (
    <td className={cn(
      "px-3 py-2.5 text-right num font-medium whitespace-nowrap",
      highlight ? "text-warning font-bold" : good === true ? "text-positive" : "text-ink"
    )}>
      {children}
    </td>
  );
}

function CreativeThumb({ url, type }: { url: string | null; type: string }) {
  if (!url) {
    return (
      <div className="size-10 rounded bg-bg-inset grid place-items-center shrink-0">
        {type === "video" ? <Video className="size-4 text-ink-dim" /> : <ImageIcon className="size-4 text-ink-dim" />}
      </div>
    );
  }
  return (
    <div className="size-10 rounded overflow-hidden shrink-0 relative bg-bg-inset">
      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
      {type === "video" && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <Video className="size-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
