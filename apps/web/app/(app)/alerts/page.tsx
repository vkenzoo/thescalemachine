"use client";

import * as React from "react";
import {
  Bell,
  Plus,
  Play,
  MoreHorizontal,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { NewAlertModal } from "@/components/alerts/new-alert-modal";
import {
  useAlerts,
  updateAlert,
  deleteAlert,
  type Alert,
} from "@/lib/hooks/use-automation";
import { useMetaAccounts } from "@/lib/hooks/use-meta";
import { formatAlertNatural, formatMetric } from "@/lib/automation-format";
import { cn } from "@/lib/cn";

export default function AlertsPage() {
  const { push } = useToast();
  const { alerts, isLoading, error, refresh } = useAlerts();
  const { accounts } = useMetaAccounts();
  const [open, setOpen] = React.useState(false);

  const accountNameMap = React.useMemo(() => {
    const m = new Map<string, string>();
    accounts.forEach((a) => m.set(a.account_id, a.name));
    return m;
  }, [accounts]);

  const handleToggle = async (alert: Alert) => {
    try {
      await updateAlert(alert.id, { enabled: !alert.enabled });
      await refresh();
      push({
        tone: "info",
        title: alert.enabled ? "Alerta pausado" : "Alerta ativado",
      });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro", description: e.message });
    }
  };

  const handleDelete = async (alert: Alert) => {
    try {
      await deleteAlert(alert.id);
      await refresh();
      push({ tone: "info", title: "Alerta removido" });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao remover", description: e.message });
    }
  };

  const [verifying, setVerifying] = React.useState(false);
  const verify = async () => {
    setVerifying(true);
    push({
      tone: "info",
      title: "Verificando alertas…",
      description: `Avaliando ${alerts.length} alerta${alerts.length === 1 ? "" : "s"} contra Graph API.`,
    });
    try {
      const res = await fetch("/api/cron/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      push({
        tone: data.triggered > 0 ? "warning" : "success",
        title: data.triggered > 0
          ? `${data.triggered} alerta${data.triggered === 1 ? "" : "s"} disparou${data.triggered === 1 ? "" : "ram"}`
          : "Tudo dentro do limite",
        description: `${data.evaluated} avaliados. Veja o sino.`,
      });
      await refresh();
    } catch (e: any) {
      push({ tone: "danger", title: "Erro na verificação", description: e.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Automação"
        title="Alertas de métricas"
        description="Receba aviso por sino e e-mail quando alguma métrica passar do limite. Diferente das regras, alertas só notificam — não mexem nas campanhas."
        tutorial
        actions={
          <>
            <Button variant="secondary" onClick={verify} disabled={alerts.length === 0 || verifying} loading={verifying}>
              {!verifying && <Play />} Verificar agora
            </Button>
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus /> Novo alerta
            </Button>
          </>
        }
      />

      {isLoading && alerts.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-line bg-bg-elevated/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar alertas"
          description={error.message ?? "Tente recarregar a página."}
          size="md"
        />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nenhum alerta configurado"
          description="Crie alertas para receber aviso quando suas métricas passarem dos limites que você definir. Útil pra ROAS caindo, CPA subindo ou frequência alta."
          action={
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Plus /> Criar primeiro alerta
            </Button>
          }
        />
      ) : (
        <TooltipProvider delayDuration={250}>
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-md font-semibold text-ink">Seus alertas</h2>
              <span className="text-2xs text-ink-dim">
                {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"} ·{" "}
                {alerts.filter((a) => a.enabled).length} ativo{alerts.filter((a) => a.enabled).length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-3">
              {alerts.map((a) => {
                const accountName = a.account_filter === "all"
                  ? "todas as contas"
                  : accountNameMap.get(a.account_filter) ?? a.account_filter;
                return (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    naturalLanguage={formatAlertNatural(a, accountName)}
                    onToggle={() => handleToggle(a)}
                    onDelete={() => handleDelete(a)}
                  />
                );
              })}
            </div>
          </section>
        </TooltipProvider>
      )}

      <NewAlertModal open={open} onOpenChange={setOpen} onCreated={refresh} />
    </div>
  );
}

function AlertCard({
  alert,
  naturalLanguage,
  onToggle,
  onDelete,
}: {
  alert: Alert;
  naturalLanguage: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const lastTrigger = alert.last_triggered_at
    ? relativeTime(alert.last_triggered_at)
    : null;

  return (
    <div className={cn(
      "rounded-lg border bg-bg-surface p-4 transition-colors",
      alert.enabled ? "border-line hover:border-line-strong" : "border-line/60 opacity-75"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "size-10 rounded-md grid place-items-center shrink-0 mt-0.5",
          alert.enabled ? "bg-warning-subtle text-warning" : "bg-bg-elevated text-ink-dim"
        )}>
          <Bell className="size-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-ink capitalize">
              {alert.name || formatMetric(alert.metric)}
            </h3>
            <Badge tone={alert.enabled ? "warning" : "neutral"} dot size="xs">
              {alert.enabled ? "Monitorando" : "Pausado"}
            </Badge>
          </div>

          <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
            {naturalLanguage}
          </p>

          <div className="mt-2.5 flex items-center gap-3 text-2xs text-ink-dim flex-wrap">
            {lastTrigger ? (
              <Badge tone="warning" size="xs">
                Último disparo {lastTrigger}
              </Badge>
            ) : (
              <span>Aguardando primeiro disparo</span>
            )}
            {alert.triggers_count > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span>{alert.triggers_count} disparo{alert.triggers_count === 1 ? "" : "s"} no total</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Switch checked={alert.enabled} onCheckedChange={onToggle} />
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
                    aria-label="Mais ações"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Mais ações</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onDelete} className="text-negative">
                <Trash2 /> Excluir alerta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const days = Math.floor(hr / 24);
  return `${days}d atrás`;
}
