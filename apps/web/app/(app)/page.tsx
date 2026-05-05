"use client";

import * as React from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountSwitcher } from "@/components/gerenciador/account-switcher";
import { AttributedSalesBar } from "@/components/integracoes/attributed-sales-bar";
import { ApplyUtmsButton } from "@/components/gerenciador/apply-utms-button";
import { PeriodPicker } from "@/components/gerenciador/period-picker";
import { MetricCards } from "@/components/gerenciador/metric-cards";
import { FilterBar } from "@/components/gerenciador/filter-bar";
import { CampaignTable } from "@/components/gerenciador/campaign-table";
import { AdSetTable } from "@/components/gerenciador/adset-table";
import { AdTable } from "@/components/gerenciador/ad-table";
import { ColumnPicker } from "@/components/shared/column-picker";
import { MetricsPicker } from "@/components/shared/metrics-picker";
import { AccountNotesDrawer } from "@/components/shared/account-notes-drawer";
import { EditBudgetModal } from "@/components/shared/edit-budget-modal";
import { BulkProgressModal, type BulkProgressState } from "@/components/shared/bulk-progress-modal";
import { BulkEditModal, type BulkEditPayload } from "@/components/shared/bulk-edit-modal";
import { bulkAction, type EntityKind, type BulkActionKind } from "@/lib/bulk-action";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { brl, brlCompact, num, pct } from "@/lib/format";
import { parseFilter } from "@/lib/filter-syntax";
import { useToast } from "@/components/ui/toast";
import {
  useMetaAccounts,
  useMetaCampaigns,
  useMetaAdsets,
  useMetaAds,
  refreshAllMetaData,
  syncAccountBalance,
  type MetaAccount,
  type Period,
} from "@/lib/hooks/use-meta";
import { useUserPreferences, updateUserPreferences } from "@/lib/hooks/use-preferences";
import { postJSON } from "@/lib/api";
import { Plug, AlertTriangle, X } from "lucide-react";

type EditTarget = {
  id: string;
  name: string;
  type: "campanha" | "conjunto";
  currentDailyBudget: number;
};

type DrillRef = { id: string; name: string };
type ActiveTab = "campaigns" | "adsets" | "ads";

export default function GerenciadorPage() {
  const { push } = useToast();
  const { preferences, refresh: refreshPrefs } = useUserPreferences();
  const { accounts, isLoading: accLoading, error: accError } = useMetaAccounts();
  const [selectedAccount, setSelectedAccount] = React.useState<MetaAccount | null>(null);
  const [period, setPeriod] = React.useState<Period>("last_30d");

  const accountId = selectedAccount?.account_id ?? null;
  const {
    campaigns,
    isLoading: campLoading,
    error: campError,
    refresh: refreshCampaigns,
  } = useMetaCampaigns(accountId, period);
  const {
    adsets,
    isLoading: adsetsLoading,
    error: adsetsError,
    refresh: refreshAdsets,
  } = useMetaAdsets(accountId, period);
  const {
    ads,
    isLoading: adsLoading,
    error: adsError,
    refresh: refreshAds,
  } = useMetaAds(accountId, period);

  const [query, setQuery] = React.useState("");
  const [onlyActive, setOnlyActive] = React.useState(false);
  const [hadSpend, setHadSpend] = React.useState(false);

  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<EditTarget | null>(null);

  // Bulk action progress
  const [bulkProgressOpen, setBulkProgressOpen] = React.useState(false);
  const [bulkProgress, setBulkProgress] = React.useState<BulkProgressState>({
    total: 0, done: 0, success: 0, failed: 0, errors: [], status: "complete",
  });
  const [bulkTitle, setBulkTitle] = React.useState("");
  // Bulk edit modal — qual nível ativou + count + ids selecionados
  const [bulkEditCtx, setBulkEditCtx] = React.useState<{
    kind: EntityKind;
    ids: string[];
    label: string;
    onComplete: () => Promise<unknown>;
  } | null>(null);

  // Drill-down state — replica padrão do Meta Ads
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("campaigns");
  const [drillCampaign, setDrillCampaign] = React.useState<DrillRef | null>(null);
  const [drillAdset, setDrillAdset] = React.useState<DrillRef | null>(null);

  // Selection — 1 set por nível (igual Meta Ads)
  const [selectedCampaigns, setSelectedCampaigns] = React.useState<Set<string>>(new Set());
  const [selectedAdsets, setSelectedAdsets] = React.useState<Set<string>>(new Set());
  const [selectedAds, setSelectedAds] = React.useState<Set<string>>(new Set());

  // Quando troca de conta, limpa qualquer drill ativo + seleções
  React.useEffect(() => {
    setDrillCampaign(null);
    setDrillAdset(null);
    setActiveTab("campaigns");
    setSelectedCampaigns(new Set());
    setSelectedAdsets(new Set());
    setSelectedAds(new Set());
  }, [accountId]);

  const filteredCampaigns = React.useMemo(() => {
    const pred = parseFilter(query);
    return campaigns.filter((r) => {
      if (onlyActive && r.status !== "ACTIVE") return false;
      if (hadSpend && r.spend <= 0) return false;
      if (!pred(r.name)) return false;
      return true;
    });
  }, [campaigns, query, onlyActive, hadSpend]);

  const filteredAdsets = React.useMemo(() => {
    const pred = parseFilter(query);
    return adsets.filter((r) => {
      if (drillCampaign && r.campaignId !== drillCampaign.id) return false;
      if (onlyActive && r.status !== "ACTIVE") return false;
      if (hadSpend && r.spend <= 0) return false;
      if (!pred(r.name)) return false;
      return true;
    });
  }, [adsets, query, onlyActive, hadSpend, drillCampaign]);

  const filteredAds = React.useMemo(() => {
    const pred = parseFilter(query);
    return ads.filter((r) => {
      if (drillAdset && r.adsetId !== drillAdset.id) return false;
      if (drillCampaign && r.campaignId !== drillCampaign.id) return false;
      if (onlyActive && r.status !== "ACTIVE") return false;
      if (hadSpend && r.spend <= 0) return false;
      if (!pred(r.name)) return false;
      return true;
    });
  }, [ads, query, onlyActive, hadSpend, drillCampaign, drillAdset]);

  const totals = React.useMemo(() => {
    const t = filteredCampaigns.reduce(
      (acc, r) => {
        acc.spend += r.spend;
        acc.purchases += r.purchases;
        acc.revenue += r.revenue;
        acc.clicks += r.clicks;
        acc.impressions += r.impressions;
        return acc;
      },
      { spend: 0, purchases: 0, revenue: 0, clicks: 0, impressions: 0 }
    );
    return {
      ...t,
      cpa: t.purchases ? t.spend / t.purchases : 0,
      roas: t.spend ? t.revenue / t.spend : 0,
      ctr: t.impressions ? t.clicks / t.impressions : 0,
      cpc: t.clicks ? t.spend / t.clicks : 0,
    };
  }, [filteredCampaigns]);

  // Constrói cards dinamicamente baseado em selected_metrics do user
  const selectedMetricIds = preferences?.selected_metrics ?? ["spend", "revenue", "roas", "purchases", "cpa", "ctr"];
  const metricCards = React.useMemo(() => {
    const map: Record<string, { label: string; value: string }> = {
      spend:      { label: "Investido",     value: brl(totals.spend) },
      budget:     { label: "Orçamento",     value: brl(filteredCampaigns.reduce((s, c) => s + (c.dailyBudget || 0), 0)) },
      revenue:    { label: "Receita",       value: brlCompact(totals.revenue) },
      roas:       { label: "ROAS",          value: totals.roas.toFixed(2) + "×" },
      purchases:  { label: "Compras",       value: num(totals.purchases) },
      cpa:        { label: "Custo/Compra",  value: totals.cpa ? brl(totals.cpa) : "—" },
      ctr:        { label: "CTR",           value: pct(totals.ctr) },
      cpc:        { label: "CPC",           value: totals.cpc ? brl(totals.cpc) : "—" },
      cpm:        { label: "CPM",           value: filteredCampaigns.length ? brl(filteredCampaigns.reduce((s, c) => s + c.cpm, 0) / filteredCampaigns.length) : "—" },
      clicks:     { label: "Cliques",       value: num(totals.clicks) },
      impressions:{ label: "Impressões",    value: num(totals.impressions) },
      reach:      { label: "Alcance",       value: num(filteredCampaigns.reduce((s, c) => s + c.reach, 0)) },
      frequency:  { label: "Frequência",    value: filteredCampaigns.length ? (filteredCampaigns.reduce((s, c) => s + c.frequency, 0) / filteredCampaigns.length).toFixed(2) : "—" },
      leads:      { label: "Leads",         value: num(filteredCampaigns.reduce((s, c) => s + c.leads, 0)) },
      cpl:        { label: "Custo/Lead",    value: filteredCampaigns.reduce((s, c) => s + c.leads, 0) ? brl(totals.spend / filteredCampaigns.reduce((s, c) => s + c.leads, 0)) : "—" },
      messages:   { label: "Mensagens",     value: num(filteredCampaigns.reduce((s, c) => s + c.messages, 0)) },
      cp_message: { label: "Custo/Mensagem", value: filteredCampaigns.reduce((s, c) => s + c.messages, 0) ? brl(totals.spend / filteredCampaigns.reduce((s, c) => s + c.messages, 0)) : "—" },
      ig_visits:  { label: "Visitas IG",    value: num(filteredCampaigns.reduce((s, c) => s + c.igVisits, 0)) },
      cp_ig_visit:{ label: "Custo/Visita IG", value: filteredCampaigns.reduce((s, c) => s + c.igVisits, 0) ? brl(totals.spend / filteredCampaigns.reduce((s, c) => s + c.igVisits, 0)) : "—" },
      cart_adds:  { label: "Carrinhos",     value: num(filteredCampaigns.reduce((s, c) => s + c.cartAdds, 0)) },
      cp_cart:    { label: "Custo/Carrinho", value: filteredCampaigns.reduce((s, c) => s + c.cartAdds, 0) ? brl(totals.spend / filteredCampaigns.reduce((s, c) => s + c.cartAdds, 0)) : "—" },
      checkouts:  { label: "Checkouts",     value: num(filteredCampaigns.reduce((s, c) => s + c.checkouts, 0)) },
      cp_checkout:{ label: "Custo/Checkout", value: filteredCampaigns.reduce((s, c) => s + c.checkouts, 0) ? brl(totals.spend / filteredCampaigns.reduce((s, c) => s + c.checkouts, 0)) : "—" },
    };
    return selectedMetricIds
      .map((id) => map[id])
      .filter(Boolean)
      .map((m) => ({ ...m, delta: 0, spark: [] }));
  }, [selectedMetricIds, totals, filteredCampaigns]);

  const handleSaveMetrics = async (ids: string[]) => {
    try {
      await updateUserPreferences({ selected_metrics: ids });
      await refreshPrefs();
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao salvar preferências", description: e.message });
    }
  };

  const copyReport = () => {
    const lines = [
      `*Relatório Meta Ads — ${selectedAccount?.name ?? ""}*`,
      ``,
      `Investido: ${brl(totals.spend)}`,
      `Receita: ${brlCompact(totals.revenue)}`,
      `ROAS: ${totals.roas.toFixed(2)}×`,
      `Compras: ${num(totals.purchases)}`,
      `Custo por compra: ${totals.cpa ? brl(totals.cpa) : "—"}`,
      `CTR: ${pct(totals.ctr)}`,
      ``,
      `${filteredCampaigns.length} campanhas analisadas.`,
    ].join("\n");
    navigator.clipboard.writeText(lines);
    push({ tone: "success", title: "Relatório copiado", description: "Cole no WhatsApp do cliente." });
  };

  const handleRefresh = () => {
    refreshAllMetaData();
    push({ tone: "info", title: "Atualizando…", description: "Sincronizando com a Graph API." });
  };

  const handleCampaignAction = async (
    metaId: string,
    action: "pause" | "activate" | "edit-budget" | "duplicate" | "delete"
  ) => {
    if (action === "edit-budget") {
      const c = campaigns.find((x) => x.id === metaId);
      if (c) {
        setEditTarget({
          id: c.id,
          name: c.name,
          type: "campanha",
          currentDailyBudget: c.dailyBudget,
        });
      }
      return;
    }
    if (action === "duplicate") {
      try {
        await postJSON(`/api/meta/campaigns/${metaId}/duplicate`, {});
        await refreshCampaigns();
        push({ tone: "success", title: "Campanha duplicada", description: "Cópia criada como pausada." });
      } catch (e: any) {
        push({ tone: "danger", title: "Erro ao duplicar", description: e.message ?? "" });
      }
      return;
    }
    if (action === "delete") {
      try {
        const res = await fetch(`/api/meta/campaigns/${metaId}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message ?? `HTTP ${res.status}`);
        await refreshCampaigns();
        push({ tone: "success", title: "Campanha excluída" });
      } catch (e: any) {
        push({ tone: "danger", title: "Erro ao excluir", description: e.message ?? "" });
      }
      return;
    }
    try {
      const status = action === "pause" ? "PAUSED" : "ACTIVE";
      await postJSON(`/api/meta/campaigns/${metaId}`, { status });
      await refreshCampaigns();
      if (accountId) syncAccountBalance(accountId);
      push({
        tone: "success",
        title: action === "pause" ? "Campanha pausada" : "Campanha ativada",
      });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao atualizar", description: e.message ?? "" });
    }
  };

  const handleAdsetAction = async (
    metaId: string,
    action: "pause" | "activate" | "edit-budget" | "duplicate" | "delete"
  ) => {
    if (action === "edit-budget") {
      const a = adsets.find((x) => x.id === metaId);
      if (a) {
        setEditTarget({
          id: a.id,
          name: a.name,
          type: "conjunto",
          currentDailyBudget: a.dailyBudget,
        });
      }
      return;
    }
    if (action === "duplicate") {
      try {
        await postJSON(`/api/meta/adsets/${metaId}/duplicate`, {});
        await refreshAdsets();
        push({ tone: "success", title: "Conjunto duplicado", description: "Cópia criada como pausada." });
      } catch (e: any) {
        push({ tone: "danger", title: "Erro ao duplicar", description: e.message ?? "" });
      }
      return;
    }
    if (action === "delete") {
      try {
        const res = await fetch(`/api/meta/adsets/${metaId}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message ?? `HTTP ${res.status}`);
        await refreshAdsets();
        push({ tone: "success", title: "Conjunto excluído" });
      } catch (e: any) {
        push({ tone: "danger", title: "Erro ao excluir", description: e.message ?? "" });
      }
      return;
    }
    try {
      const status = action === "pause" ? "PAUSED" : "ACTIVE";
      await postJSON(`/api/meta/adsets/${metaId}`, { status });
      await refreshAdsets();
      if (accountId) syncAccountBalance(accountId);
      push({
        tone: "success",
        title: action === "pause" ? "Conjunto pausado" : "Conjunto ativado",
      });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao atualizar", description: e.message ?? "" });
    }
  };

  const handleAdAction = async (
    metaId: string,
    action: "pause" | "activate" | "duplicate" | "delete"
  ) => {
    if (action === "duplicate") {
      try {
        await postJSON(`/api/meta/ads/${metaId}/duplicate`, {});
        await refreshAds();
        push({ tone: "success", title: "Anúncio duplicado", description: "Cópia criada como pausada." });
      } catch (e: any) {
        push({ tone: "danger", title: "Erro ao duplicar", description: e.message ?? "" });
      }
      return;
    }
    if (action === "delete") {
      try {
        const res = await fetch(`/api/meta/ads/${metaId}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message ?? `HTTP ${res.status}`);
        await refreshAds();
        push({ tone: "success", title: "Anúncio excluído" });
      } catch (e: any) {
        push({ tone: "danger", title: "Erro ao excluir", description: e.message ?? "" });
      }
      return;
    }
    try {
      const status = action === "pause" ? "PAUSED" : "ACTIVE";
      await postJSON(`/api/meta/ads/${metaId}`, { status });
      await refreshAds();
      if (accountId) syncAccountBalance(accountId);
      push({
        tone: "success",
        title: action === "pause" ? "Anúncio pausado" : "Anúncio ativado",
      });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao atualizar", description: e.message ?? "" });
    }
  };

  const handleDrillCampaign = (id: string, name: string) => {
    setDrillCampaign({ id, name });
    setDrillAdset(null);  // limpa drill mais profundo
    setActiveTab("adsets");
  };

  const handleDrillAdset = (id: string, name: string) => {
    setDrillAdset({ id, name });
    setActiveTab("ads");
  };

  const handleBulkEditApply = async (payload: BulkEditPayload) => {
    if (!bulkEditCtx) return;
    const { kind, ids, label, onComplete } = bulkEditCtx;
    const labelKind = label;

    if (payload.mode === "budget") {
      const dirText =
        payload.budgetDirection === "up" ? "Aumentando" :
        payload.budgetDirection === "down" ? "Diminuindo" : "Definindo";
      setBulkTitle(`${dirText} orçamento de ${ids.length} ${labelKind}${ids.length === 1 ? "" : "s"}`);
      setBulkProgress({ total: ids.length, done: 0, success: 0, failed: 0, errors: [], status: "running" });
      setBulkProgressOpen(true);

      // Pra direction "set", payload é absoluto. Pra up/down, precisaríamos do current
      // budget de cada item — pra simplificar V1, "set" é absoluto e up/down só funciona em campanhas/adsets que têm budget próprio (CBO/ABO).
      // V2: buscar current budget pra cada e aplicar percentual.
      const result = await bulkAction({
        kind,
        ids,
        action: "update",
        payload: payload.budgetDirection === "set"
          ? { daily_budget: payload.budgetAbsolute }
          : { /* TODO: precisa do current */ daily_budget: payload.budgetAbsolute ?? 0 },
        onProgress: (done, total, _id, success) => {
          setBulkProgress((curr) => ({
            ...curr,
            done,
            success: curr.success + (success ? 1 : 0),
            failed: curr.failed + (success ? 0 : 1),
          }));
        },
      });
      setBulkProgress({
        total: ids.length, done: ids.length,
        success: result.success, failed: result.failed,
        errors: result.errors, status: "complete",
      });
      await onComplete();
      return;
    }

    if (payload.mode === "name") {
      setBulkTitle(`Renomeando ${ids.length} ${labelKind}${ids.length === 1 ? "" : "s"}`);
      setBulkProgress({ total: ids.length, done: 0, success: 0, failed: 0, errors: [], status: "running" });
      setBulkProgressOpen(true);

      // Constrói map de current names
      const currentNames = new Map<string, string>();
      if (kind === "campaign") campaigns.forEach((c) => currentNames.set(c.id, c.name));
      else if (kind === "adset") adsets.forEach((a) => currentNames.set(a.id, a.name));
      else ads.forEach((a) => currentNames.set(a.id, a.name));

      const find = payload.findText ?? "";
      const replace = payload.replaceText ?? "";
      const flags = payload.caseSensitive ? "g" : "gi";
      const re = new RegExp(escapeRegex(find), flags);

      const result = await bulkAction({
        kind,
        ids,
        action: "update",
        currentNames,
        computeName: (_id, current) => current.replace(re, replace),
        onProgress: (done, total, _id, success) => {
          setBulkProgress((curr) => ({
            ...curr,
            done,
            success: curr.success + (success ? 1 : 0),
            failed: curr.failed + (success ? 0 : 1),
          }));
        },
      });
      setBulkProgress({
        total: ids.length, done: ids.length,
        success: result.success, failed: result.failed,
        errors: result.errors, status: "complete",
      });
      await onComplete();
      return;
    }
  };

  const handleBulkRun = async (
    kind: EntityKind,
    action: BulkActionKind,
    ids: string[],
    onComplete: () => Promise<unknown>
  ) => {
    if (ids.length === 0) return;
    const labelKind = kind === "campaign" ? "campanha" : kind === "adset" ? "conjunto" : "anúncio";
    const labelAction = action === "pause" ? "Pausando" : action === "activate" ? "Ativando" : "Excluindo";
    setBulkTitle(`${labelAction} ${ids.length} ${labelKind}${ids.length === 1 ? "" : "s"}`);
    setBulkProgress({
      total: ids.length, done: 0, success: 0, failed: 0, errors: [], status: "running",
    });
    setBulkProgressOpen(true);

    const result = await bulkAction({
      kind,
      ids,
      action,
      onProgress: (done, total, _id, success) => {
        setBulkProgress((curr) => ({
          ...curr,
          done,
          success: curr.success + (success ? 1 : 0),
          failed: curr.failed + (success ? 0 : 1),
        }));
      },
    });

    setBulkProgress({
      total: ids.length,
      done: ids.length,
      success: result.success,
      failed: result.failed,
      errors: result.errors,
      status: "complete",
    });
    await onComplete();
  };

  const handleSaveBudget = async (newDailyBudget: number) => {
    if (!editTarget) return;
    const path =
      editTarget.type === "campanha"
        ? `/api/meta/campaigns/${editTarget.id}`
        : `/api/meta/adsets/${editTarget.id}`;
    try {
      await postJSON(path, { daily_budget: newDailyBudget });
      if (editTarget.type === "campanha") await refreshCampaigns();
      else await refreshAdsets();
      if (accountId) syncAccountBalance(accountId);
      push({
        tone: "success",
        title: "Orçamento atualizado",
        description: `Novo valor: ${brl(newDailyBudget)}/dia`,
      });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao atualizar orçamento", description: e.message ?? "" });
      throw e;
    }
  };

  // ============================================================
  // EMPTY STATES — bloqueiam render principal
  // ============================================================
  if (accLoading) {
    return (
      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        <div className="h-9 w-72 bg-bg-elevated rounded-md animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-bg-elevated/60 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="mt-6 h-[400px] bg-bg-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (accError) {
    return (
      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao buscar contas"
          description="Não conseguimos ler suas contas Meta. Tente recarregar a página."
          action={
            <Button variant="primary" onClick={() => location.reload()}>
              Recarregar
            </Button>
          }
          size="lg"
        />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        <EmptyState
          icon={Plug}
          title="Conecte sua primeira conta Meta"
          description="Para ver campanhas, métricas e gerenciar anúncios, conecte uma conta do Meta Ads."
          action={
            <Link href="/connect">
              <Button variant="primary">Conectar conta Meta</Button>
            </Link>
          }
          size="lg"
        />
      </div>
    );
  }

  const connectionInvalid =
    selectedAccount && selectedAccount.connection_status !== "active";

  return (
    <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <AccountSwitcher
          selectedAccountId={accountId}
          onSelect={setSelectedAccount}
        />
        <div className="ml-auto flex items-center gap-3">
          <ConnectionBadge
            status={selectedAccount?.connection_status ?? "active"}
          />
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>
      </div>

      {connectionInvalid ? (
        <EmptyState
          icon={AlertTriangle}
          title="Conexão inválida"
          description="O token desta conta foi revogado ou expirou. Reconecte para continuar."
          action={
            <Link href="/connect">
              <Button variant="primary">Reconectar</Button>
            </Link>
          }
          size="lg"
        />
      ) : (
        <>
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Resumo do Período</p>
              <button
                onClick={() => setMetricsOpen(true)}
                className="text-2xs text-ink-dim hover:text-accent transition-colors font-medium tracking-wide cursor-pointer"
              >
                personalizar métricas →
              </button>
            </div>
            <MetricCards metrics={metricCards} />
          </section>

          <AttributedSalesBar
            accountId={selectedAccount?.account_id ?? null}
            period={period}
            totalSpend={totals.spend}
          />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <TabsList>
                <TabsTrigger value="campaigns">
                  Campanhas
                  <SelectedBadge
                    count={selectedCampaigns.size}
                    onClear={() => setSelectedCampaigns(new Set())}
                  />
                </TabsTrigger>
                <TabsTrigger value="adsets">
                  {drillCampaign ? `Conjuntos para 1 campanha` : "Conjuntos"}
                  {drillCampaign && (
                    <DrillX
                      label="Limpar filtro de campanha"
                      onClear={() => {
                        setDrillCampaign(null);
                        setDrillAdset(null);
                      }}
                    />
                  )}
                  <SelectedBadge
                    count={selectedAdsets.size}
                    onClear={() => setSelectedAdsets(new Set())}
                  />
                </TabsTrigger>
                <TabsTrigger value="ads">
                  {drillAdset
                    ? `Anúncios para 1 conjunto`
                    : drillCampaign
                    ? `Anúncios para 1 campanha`
                    : "Anúncios"}
                  {(drillAdset || drillCampaign) && (
                    <DrillX
                      label="Limpar filtro de anúncios"
                      onClear={() => {
                        setDrillAdset(null);
                        if (drillCampaign) setDrillCampaign(null);
                      }}
                    />
                  )}
                  <SelectedBadge
                    count={selectedAds.size}
                    onClear={() => setSelectedAds(new Set())}
                  />
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {activeTab === "campaigns" && selectedCampaigns.size > 0 && (
                  <ApplyUtmsButton
                    selectedCount={selectedCampaigns.size}
                    campaignMetaIds={Array.from(selectedCampaigns)}
                    onComplete={async () => { await refreshCampaigns(); }}
                  />
                )}
                {(drillCampaign || drillAdset) && (
                  <div className="text-2xs text-ink-dim flex items-center gap-1">
                    <span className="opacity-60">Filtrado por:</span>
                    {drillCampaign && (
                      <span className="font-medium text-ink truncate max-w-[200px]" title={drillCampaign.name}>
                        {drillCampaign.name}
                      </span>
                    )}
                    {drillAdset && (
                      <>
                        <span className="opacity-40">/</span>
                        <span className="font-medium text-ink truncate max-w-[180px]" title={drillAdset.name}>
                          {drillAdset.name}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <FilterBar
              query={query}
              onQuery={setQuery}
              onlyActive={onlyActive}
              onOnlyActive={setOnlyActive}
              hadSpend={hadSpend}
              onHadSpend={setHadSpend}
              onColumnsClick={() => setColumnsOpen(true)}
              onNotesClick={() => setNotesOpen(true)}
              onCopyReportClick={copyReport}
              onRefresh={handleRefresh}
            />

            <TabsContent value="campaigns" className="mt-4">
              {campLoading && campaigns.length === 0 ? (
                <div className="h-[400px] bg-bg-elevated/40 rounded-xl animate-pulse" />
              ) : campError ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Erro ao buscar campanhas"
                  description={campError.message ?? "Verifique a conexão da conta."}
                  size="md"
                />
              ) : (
                <CampaignTable
                  rows={filteredCampaigns}
                  onBulkAction={() => {
                    setBulkEditCtx({
                      kind: "campaign",
                      ids: Array.from(selectedCampaigns),
                      label: "campanha",
                      onComplete: async () => {
                        setSelectedCampaigns(new Set());
                        await refreshCampaigns();
                      },
                    });
                  }}
                  onBulkRun={(action, ids) =>
                    handleBulkRun("campaign", action, ids, async () => {
                      setSelectedCampaigns(new Set());
                      await refreshCampaigns();
                    })
                  }
                  onRowAction={handleCampaignAction}
                  onDrillDown={handleDrillCampaign}
                  accountId={accountId}
                  selected={selectedCampaigns}
                  onSelectionChange={setSelectedCampaigns}
                />
              )}
            </TabsContent>

            <TabsContent value="adsets">
              {adsetsLoading && adsets.length === 0 ? (
                <div className="h-[400px] bg-bg-elevated/40 rounded-xl animate-pulse" />
              ) : adsetsError ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Erro ao buscar conjuntos"
                  description={adsetsError.message ?? ""}
                  size="md"
                />
              ) : (
                <AdSetTable
                  rows={filteredAdsets}
                  onRowAction={handleAdsetAction}
                  onDrillDown={handleDrillAdset}
                  accountId={accountId}
                  selected={selectedAdsets}
                  onSelectionChange={setSelectedAdsets}
                  onBulkAction={() => {
                    setBulkEditCtx({
                      kind: "adset",
                      ids: Array.from(selectedAdsets),
                      label: "conjunto",
                      onComplete: async () => {
                        setSelectedAdsets(new Set());
                        await refreshAdsets();
                      },
                    });
                  }}
                  onBulkRun={(action, ids) =>
                    handleBulkRun("adset", action, ids, async () => {
                      setSelectedAdsets(new Set());
                      await refreshAdsets();
                    })
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="ads">
              {adsLoading && ads.length === 0 ? (
                <div className="h-[400px] bg-bg-elevated/40 rounded-xl animate-pulse" />
              ) : adsError ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Erro ao buscar anúncios"
                  description={adsError.message ?? ""}
                  size="md"
                />
              ) : (
                <AdTable
                  rows={filteredAds}
                  onRowAction={handleAdAction}
                  accountId={accountId}
                  selected={selectedAds}
                  onSelectionChange={setSelectedAds}
                  onBulkAction={() => {
                    setBulkEditCtx({
                      kind: "ad",
                      ids: Array.from(selectedAds),
                      label: "anúncio",
                      onComplete: async () => {
                        setSelectedAds(new Set());
                        await refreshAds();
                      },
                    });
                  }}
                  onBulkRun={(action, ids) =>
                    handleBulkRun("ad", action, ids, async () => {
                      setSelectedAds(new Set());
                      await refreshAds();
                    })
                  }
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <ColumnPicker open={columnsOpen} onOpenChange={setColumnsOpen} />
      <MetricsPicker
        open={metricsOpen}
        onOpenChange={setMetricsOpen}
        defaultSelected={selectedMetricIds}
        onSave={handleSaveMetrics}
      />
      <AccountNotesDrawer
        open={notesOpen}
        onOpenChange={setNotesOpen}
        accountId={selectedAccount?.account_id ?? null}
        accountName={selectedAccount?.name ?? ""}
      />
      <BulkEditModal
        open={!!bulkEditCtx}
        onOpenChange={(o) => !o && setBulkEditCtx(null)}
        selectedCount={bulkEditCtx?.ids.length ?? 0}
        entityLabel={bulkEditCtx?.label ?? ""}
        onApply={handleBulkEditApply}
      />
      <BulkProgressModal
        open={bulkProgressOpen}
        onOpenChange={setBulkProgressOpen}
        title={bulkTitle}
        state={bulkProgress}
      />
      <EditBudgetModal
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        targetName={editTarget?.name ?? ""}
        targetType={editTarget?.type ?? "campanha"}
        currentDailyBudget={editTarget?.currentDailyBudget ?? 0}
        onSave={handleSaveBudget}
      />
    </div>
  );
}

function SelectedBadge({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent text-ink-inverse text-2xs font-medium num">
      {count} selecionado{count > 1 ? "s" : ""}
      <span
        role="button"
        tabIndex={0}
        aria-label="Limpar seleção"
        className="inline-flex items-center justify-center size-3.5 rounded hover:bg-black/15 transition-colors cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            onClear();
          }
        }}
      >
        <X className="size-3" />
      </span>
    </span>
  );
}

function DrillX({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      className="ml-1.5 inline-flex items-center justify-center size-4 rounded hover:bg-bg-elevated text-ink-dim hover:text-ink transition-colors cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          onClear();
        }
      }}
    >
      <X className="size-3" />
    </span>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ConnectionBadge({ status }: { status: "active" | "invalid" | "revoked" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-positive">
        <span className="status-dot bg-positive" />
        Conectado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-negative">
      <span className="status-dot bg-negative" />
      {status === "invalid" ? "Token inválido" : "Revogado"}
    </span>
  );
}
