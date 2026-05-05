"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Plus, Copy, Trash2, ChevronDown, ChevronUp, Pencil, Code, Tag, Link2,
  MessageSquarePlus, Webhook, MousePointer2, ShoppingCart, TrendingUp, ArrowRight,
  CheckCircle2, Circle, Zap, Activity, Loader2, Eye, EyeOff, Beaker, BookOpen,
  ExternalLink, Lightbulb,
} from "lucide-react";
import { PLATFORM_TUTORIALS } from "@/lib/utm/tutorials";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { UTM_PLATFORMS, type PlatformDef } from "@/lib/mock-data";
import { Private } from "@/lib/privacy";
import { cn } from "@/lib/cn";
import { useMetaAccounts } from "@/lib/hooks/use-meta";
import { brl } from "@/lib/format";

// ============================================================
// Tipos vindos do servidor (/api/integracoes/projects)
// ============================================================
interface UtmProject {
  id: string;
  name: string;
  platform: string;                                     // 'hotmart' | 'kiwify' | ...
  ad_account_id: string | null;
  webhook_token: string;
  script_installed: boolean;
  utms_configured: boolean;
  webhook_configured: boolean;
  has_secret: boolean;
  last_event_at: string | null;
  created_at: string;
  ad_account: { account_id: string; name: string } | null;
  recent_events: Array<{
    id: string;
    occurred_at: string;
    gross_value_cents: number | null;
    utm_campaign: string | null;
    utm_term: string | null;
    product_name: string | null;
    status: string | null;
  }>;
  events_count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ============================================================
// Página
// ============================================================
export default function IntegracoesPage() {
  const { push } = useToast();
  const { accounts: metaAccounts, isLoading: accLoading } = useMetaAccounts();
  const { data, isLoading, mutate } = useSWR<{ projects: UtmProject[] }>(
    "/api/integracoes/projects", fetcher, { refreshInterval: 5000 }
  );
  const projects = data?.projects ?? [];

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Form
  const [newName, setNewName] = React.useState("");
  const [newPlatform, setNewPlatform] = React.useState(UTM_PLATFORMS[0].id);
  const [newAccount, setNewAccount] = React.useState<string>("");
  const [creating, setCreating] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    if (!newAccount && metaAccounts.length > 0) {
      setNewAccount(metaAccounts[0].account_id);
    }
  }, [metaAccounts, newAccount]);

  const create = async () => {
    if (!newName) {
      push({ tone: "warning", title: "Dê um nome ao projeto" });
      return;
    }
    if (!newAccount) {
      push({ tone: "warning", title: "Selecione uma conta de anúncios" });
      return;
    }
    setCreating(true);
    try {
      // Resolve account_id (Meta) → uuid local da tabela ad_accounts
      const acc = metaAccounts.find((a) => a.account_id === newAccount);
      const adAccountUuid = (acc as any)?.id ?? null;

      const res = await fetch("/api/integracoes/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          platform: newPlatform,
          ad_account_id: adAccountUuid,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        push({ tone: "warning", title: "Falhou ao criar", description: json.detail ?? json.error });
        return;
      }
      push({ tone: "success", title: "Projeto criado!", description: "Siga os 2 passos pra começar a receber vendas." });
      setNewName("");
      setFormOpen(false);
      await mutate();
      setExpanded((curr) => new Set([json.project.id, ...Array.from(curr)]));
    } finally {
      setCreating(false);
    }
  };

  const togglePanel = (id: string) => {
    setExpanded((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este projeto e todas as vendas atribuídas?")) return;
    const res = await fetch(`/api/integracoes/projects?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      push({ tone: "warning", title: "Falhou ao remover", description: json.detail ?? json.error });
      return;
    }
    push({ tone: "info", title: "Projeto removido" });
    await mutate();
  };

  const isFirstProject = projects.length === 0 && !isLoading;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Operação"
        title="Integrações UTMs"
        description="Saiba quais anúncios geram vendas de verdade — não só o que o pixel da Meta diz."
        tutorial
        actions={
          <div className="flex gap-2">
            <a href="/integracoes/saude">
              <Button variant="secondary">
                <Activity />
                Saúde da atribuição
              </Button>
            </a>
            <Button variant="secondary">
              <MessageSquarePlus />
              Solicitar nova integração
            </Button>
          </div>
        }
      />

      {isFirstProject && <EducationalHero />}

      <section className="rounded-2xl border border-line bg-bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h2 className="text-md font-semibold text-ink">
            {isFirstProject ? "Crie seu primeiro projeto" : (formOpen ? "Novo projeto" : "Adicionar projeto")}
          </h2>
          <div className="flex items-center gap-2">
            {!isFirstProject && (
              <Badge tone="neutral" size="xs">
                {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
              </Badge>
            )}
            {!isFirstProject && (
              <Button variant="ghost" size="sm" onClick={() => setFormOpen((v) => !v)}>
                {formOpen ? <ChevronUp className="size-3.5" /> : <Plus className="size-3.5" />}
                {formOpen ? "Fechar" : "Novo"}
              </Button>
            )}
          </div>
        </div>
        {(isFirstProject || formOpen) && (
          <p className="text-2xs text-ink-muted mb-4">
            Cada projeto representa uma plataforma de checkout que você usa.
          </p>
        )}
        {(isFirstProject || formOpen) && (
        <div>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Nome do projeto</Label>
            <Input id="proj-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Curso Premium — Hotmart" />
          </div>
          <div className="space-y-1.5">
            <Label>Plataforma</Label>
            <Select value={newPlatform} onValueChange={setNewPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UTM_PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Conta Meta vinculada</Label>
            <Select value={newAccount} onValueChange={setNewAccount} disabled={accLoading || metaAccounts.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={accLoading ? "Carregando…" : "Selecione uma conta"} />
              </SelectTrigger>
              <SelectContent>
                {metaAccounts.map((a) => (
                  <SelectItem key={a.account_id} value={a.account_id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="primary" onClick={create} disabled={creating || metaAccounts.length === 0}>
            {creating ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
            Criar
          </Button>
        </div>
        <p className="text-2xs text-ink-muted mt-3">
          Você cadastra o token de assinatura do gateway depois — explicaremos passo a passo.
        </p>
        {metaAccounts.length === 0 && !accLoading && (
          <p className="text-2xs text-warning mt-3 flex items-center gap-1.5">
            <Circle className="size-3 fill-warning" />
            Você precisa conectar uma conta Meta antes —{" "}
            <a href="/connect" className="underline font-medium">conecte aqui</a>.
          </p>
        )}
        </div>
        )}
      </section>

      {isLoading && (
        <p className="text-sm text-ink-muted py-8 text-center">Carregando seus projetos…</p>
      )}

      {projects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-md font-semibold text-ink">Meus projetos</h2>
          <div className="space-y-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                expanded={expanded.has(p.id)}
                onToggle={() => togglePanel(p.id)}
                onDelete={() => remove(p.id)}
                onUpdate={mutate}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Hero educacional
// ============================================================
function EducationalHero() {
  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-bg-surface to-bg-elevated/30 p-6 lg:p-8">
      <div className="space-y-1 mb-6">
        <p className="eyebrow text-accent">Por que isso importa</p>
        <h2 className="text-lg font-semibold text-ink leading-tight">
          O pixel da Meta perde até 40% das vendas após o iOS 14.
        </h2>
        <p className="text-xs text-ink-muted leading-relaxed max-w-2xl mt-1">
          Com Integrações UTMs, casamos cada clique do anúncio com a venda real do checkout.
          Você vê de verdade qual campanha vendeu, quanto faturou, qual o ROAS verdadeiro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-2 items-center">
        <FlowStep n={1} icon={MousePointer2} title="Clique no anúncio" desc="Visitante clica no anúncio do Meta. Adicionamos UTMs invisíveis na URL." tone="info" />
        <ArrowRight className="hidden md:block size-5 text-ink-dim mx-auto" />
        <FlowStep n={2} icon={ShoppingCart} title="Compra no checkout" desc="Visitante compra. A plataforma (Hotmart, Kiwify…) registra a venda." tone="warning" />
        <ArrowRight className="hidden md:block size-5 text-ink-dim mx-auto" />
        <FlowStep n={3} icon={TrendingUp} title="Atribuição correta" desc="O webhook avisa nosso sistema. A venda volta pra campanha que originou o clique." tone="positive" />
      </div>
    </section>
  );
}

function FlowStep({ n, icon: Icon, title, desc, tone }: {
  n: number; icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; tone: "info" | "warning" | "positive";
}) {
  const toneCls = {
    info: "bg-info-subtle text-info border-info/20",
    warning: "bg-warning-subtle text-warning border-warning/20",
    positive: "bg-positive-subtle text-positive border-positive/20",
  }[tone];
  return (
    <div className="rounded-lg border bg-bg-base p-4 border-line">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("size-8 rounded-md grid place-items-center border", toneCls)}>
          <Icon className="size-4" />
        </div>
        <span className="text-2xs font-mono text-ink-dim font-semibold">PASSO {n}</span>
      </div>
      <p className="text-sm font-medium text-ink leading-tight">{title}</p>
      <p className="text-2xs text-ink-muted mt-1.5 leading-relaxed pretty">{desc}</p>
    </div>
  );
}

// ============================================================
// Project Card
// ============================================================
function ProjectCard({
  project, expanded, onToggle, onDelete, onUpdate,
}: {
  project: UtmProject;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const platformDef: PlatformDef =
    UTM_PLATFORMS.find((p) => p.id === project.platform) ?? UTM_PLATFORMS[0];

  // Estado semântico: o user só precisa saber qual é a PRÓXIMA ação
  const status = computeStatus(project);

  return (
    <article className={cn(
      "rounded-2xl border bg-bg-surface overflow-hidden transition-shadow",
      status.tone === "positive" ? "border-positive/30" :
      status.tone === "warning" ? "border-warning/30" :
      status.tone === "negative" ? "border-negative/30" :
      "border-line"
    )}>
      <header className="px-5 pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="size-10 rounded-md grid place-items-center text-ink-inverse text-md font-bold shrink-0"
                 style={{ backgroundColor: platformDef.color }}>
              {platformDef.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-md font-semibold text-ink leading-tight">
                <Private>{project.name}</Private>
              </h3>
              <p className="text-2xs text-ink-muted mt-0.5">
                {platformDef.name}
                {project.ad_account ? ` · ${project.ad_account.name}` : ""}
                {project.events_count > 0 ? ` · ${project.events_count} venda${project.events_count === 1 ? "" : "s"}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              tone={status.tone === "positive" ? "positive" : status.tone === "warning" ? "warning" : status.tone === "negative" ? "negative" : "neutral"}
              size="xs"
              dot={status.tone === "positive"}
            >
              {status.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              className="text-negative hover:text-negative bg-negative/10 hover:bg-negative/20"
              aria-label="Remover projeto"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        {/* Próxima ação sugerida */}
        {status.next && !expanded && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-ink-muted leading-tight">
              <span className="text-ink-dim">Próximo passo:</span> <span className="text-ink">{status.next}</span>
            </p>
            <Button variant="primary" size="sm" onClick={onToggle}>
              {status.tone === "negative" ? "Configurar agora" : "Continuar"}
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Botão simples quando já completo ou expandido */}
        {(!status.next || expanded) && (
          <button
            type="button"
            onClick={onToggle}
            className="text-xs text-accent hover:underline font-medium inline-flex items-center gap-1.5 cursor-pointer pt-1"
          >
            <Zap className="size-3.5" />
            {expanded ? "Ocultar detalhes" : "Ver detalhes"}
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        )}
      </header>

      {expanded && (
        <div className="border-t border-line bg-bg-inset/40 p-5 space-y-4">
          <SetupChecklist project={project} platformDef={platformDef} onUpdate={onUpdate} />
          <RecentEventsPanel project={project} />
        </div>
      )}
    </article>
  );
}

// Estado do projeto + próximo passo
function computeStatus(p: UtmProject): {
  tone: "neutral" | "positive" | "warning" | "negative";
  label: string;
  next: string | null;
} {
  if (!p.has_secret) return { tone: "negative", label: "Falta token", next: "Cadastre o token de assinatura do gateway" };
  if (!p.utms_configured) return { tone: "warning", label: "Falta UTMs", next: "Cole o template UTM nas suas campanhas Meta" };
  if (!p.webhook_configured) return { tone: "warning", label: "Falta webhook", next: "Cole a URL única no painel do gateway" };
  if (p.last_event_at) return { tone: "positive", label: "Recebendo vendas", next: null };
  return { tone: "neutral", label: "Pronto · aguardando 1ª venda", next: "Faça uma compra de teste pra validar" };
}

// ============================================================
// Setup Checklist (3 passos)
// ============================================================
function SetupChecklist({
  project, platformDef, onUpdate,
}: {
  project: UtmProject; platformDef: PlatformDef; onUpdate: () => void;
}) {
  const { push } = useToast();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${origin}/api/webhooks/${project.platform}/${project.webhook_token}`;
  const tutorial = PLATFORM_TUTORIALS[project.platform];

  const utmTemplate =
    "utm_source=fb&utm_campaign={{campaign.name}}|{{campaign.id}}" +
    "&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}" +
    "&utm_term={{ad.id}}";

  const toggleFlag = async (key: "script_installed" | "utms_configured" | "webhook_configured", value: boolean) => {
    await fetch("/api/integracoes/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id, [key]: value }),
    });
    onUpdate();
  };

  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);

  const sendTestSale = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integracoes/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      });
      const json = await res.json();
      setTestResult(json);
      if (json.ok) {
        if (json.attribution?.matched) {
          push({
            tone: "success",
            title: "Venda atribuída!",
            description: `${json.attribution.match_method} (${(json.attribution.match_confidence * 100).toFixed(0)}% confiança)`,
          });
        } else {
          push({
            tone: "info",
            title: "Venda recebida",
            description: "Sem match — caiu em Direct.",
          });
        }
        onUpdate();
      } else {
        push({ tone: "warning", title: "Falhou", description: json.detail ?? json.error });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink uppercase tracking-wider">Configure em 3 passos</p>
        {tutorial && (
          <PlatformTutorialButton
            platformName={platformDef.name}
            tutorial={tutorial}
          />
        )}
      </div>

      {/* Bloco prominente de cadastro do secret quando faltando */}
      {!project.has_secret && tutorial && (
        <SecretSetupBlock
          project={project}
          platformName={platformDef.name}
          secretLabel={tutorial.secret.label}
          secretDescription={tutorial.secret.description}
          secretSteps={tutorial.secret.steps}
          docsUrl={tutorial.secret.docs_url}
          onUpdate={onUpdate}
        />
      )}

      <SetupStep
        n={1} icon={Tag} iconBg="bg-accent-subtle text-accent"
        done={project.utms_configured}
        onToggle={(v) => toggleFlag("utms_configured", v)}
        title="Cole as UTMs nas suas campanhas Meta"
        desc='Em "Configuração de URL → Parâmetros de URL" no Gerenciador de Anúncios. Funciona em campanhas novas E nas que já estão ativas.'
        code={utmTemplate}
      />

      <SetupStep
        n={2} icon={Webhook} iconBg="bg-positive-subtle text-positive"
        done={project.webhook_configured}
        onToggle={(v) => toggleFlag("webhook_configured", v)}
        title={`Cadastre essa URL na ${platformDef.name}`}
        desc={`Cole no campo "Webhook" / "Postback" / "Notificação" do produto na ${platformDef.name}.`}
        code={webhookUrl}
        highlight
      />

      {/* Bloco de teste — depois dos 3 passos */}
      <div className="rounded-lg border border-line bg-bg-base p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink flex items-center gap-2">
              <Beaker className="size-4 text-accent" />
              Testar fluxo completo
            </p>
            <p className="text-2xs text-ink-muted mt-1 leading-relaxed max-w-xl">
              Simula uma venda <strong>{platformDef.name}</strong> usando um anúncio real seu (se houver Meta sincronizado).
              Faz o caminho inteiro: webhook → grava venda → resolve UTM → atribui à campanha.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={sendTestSale} disabled={testing}>
            {testing ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Beaker className="size-3.5 mr-1" />}
            Enviar venda de teste
          </Button>
        </div>

        {testResult && (
          <div className={cn(
            "rounded-md border p-3 text-2xs",
            testResult.ok ? "border-positive/30 bg-positive-subtle/15" : "border-negative/30 bg-negative-subtle/15"
          )}>
            {testResult.ok ? (
              <div className="space-y-1">
                <p className="font-medium text-ink flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-positive" />
                  Webhook entrou em {testResult.elapsed_ms}ms
                </p>
                {testResult.attribution ? (
                  testResult.attribution.matched ? (
                    <p className="text-ink-muted">
                      ✓ Atribuição: <strong className="text-ink">{testResult.attribution.match_method}</strong>
                      {" · "}confiança {(testResult.attribution.match_confidence * 100).toFixed(0)}%
                      {testResult.used_real_ids && testResult.test_payload?.campaign_name && (
                        <span> · campanha <strong className="text-ink">{testResult.test_payload.campaign_name}</strong></span>
                      )}
                    </p>
                  ) : (
                    <p className="text-ink-muted">
                      ⚠ Sem match — caiu em Direct (esperado se você ainda não tem ads sincronizados ou utm_term não bate com meta_id).
                    </p>
                  )
                ) : (
                  <p className="text-ink-muted">Atribuição em processamento…</p>
                )}
              </div>
            ) : (
              <p className="text-negative">{testResult.detail ?? testResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Avançado: script de captura UTM (raro) */}
      <AdvancedScriptBlock
        project={project}
        origin={origin}
        onToggle={(v) => toggleFlag("script_installed", v)}
      />
    </div>
  );
}

function AdvancedScriptBlock({
  project, origin, onToggle,
}: { project: UtmProject; origin: string; onToggle: (v: boolean) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border border-line bg-bg-base/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-2xs text-ink-muted hover:text-ink"
      >
        <span className="inline-flex items-center gap-1.5">
          <Code className="size-3.5" />
          Avançado: script de captura UTM
          {project.script_installed && <CheckCircle2 className="size-3 text-positive" />}
        </span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <div className="border-t border-line p-4 space-y-2">
          <p className="text-2xs text-ink-muted leading-relaxed">
            <strong className="text-ink">Só precisa se você usa landing intermediária</strong> (anúncio Meta → SUA landing → checkout).
            Se manda direto pro checkout do gateway, pula essa parte.
          </p>
          <CodeBlock code={`<script src="${origin}/utms/latest.js" data-prevent-subids async defer></script>`} />
          <button
            type="button"
            onClick={() => onToggle(!project.script_installed)}
            className="text-2xs text-accent hover:underline"
          >
            {project.script_installed ? "Desmarcar como instalado" : "Já instalei — marcar como feito"}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Bloco "Cadastre o Hottok / Token" — guiado, com tutorial inline
// ============================================================
function SecretSetupBlock({
  project, platformName, secretLabel, secretDescription, secretSteps, docsUrl, onUpdate,
}: {
  project: UtmProject;
  platformName: string;
  secretLabel: string;
  secretDescription: string;
  secretSteps: { title: string; body: string; tip?: string }[];
  docsUrl?: string;
  onUpdate: () => void;
}) {
  const [secret, setSecret] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(true);
  const { push } = useToast();

  const save = async () => {
    if (!secret.trim()) {
      push({ tone: "warning", title: "Cole o token primeiro" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/integracoes/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, signing_secret: secret.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        push({ tone: "warning", title: "Falhou", description: json.detail ?? json.error });
        return;
      }
      push({ tone: "success", title: "Token salvo", description: "Agora você pode receber webhooks reais." });
      setSecret("");
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-warning/40 bg-warning-subtle/15 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-md bg-warning/15 text-warning grid place-items-center shrink-0">
          <Lightbulb className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-ink">
            Antes de tudo, cadastre o {secretLabel} da {platformName}
          </h4>
          <p className="text-2xs text-ink-muted mt-1 leading-relaxed">
            {secretDescription} Sem ele, descartamos qualquer webhook por segurança.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="text-2xs text-accent hover:underline shrink-0"
        >
          {showHelp ? "Ocultar passos" : "Mostrar passos"}
        </button>
      </div>

      {showHelp && (
        <ol className="space-y-1.5 pl-3">
          {secretSteps.map((step, i) => (
            <li key={i} className="rounded-md bg-bg-base px-3 py-2">
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-bg-inset text-2xs font-mono font-bold text-ink-muted grid place-items-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink leading-tight">{step.title}</p>
                  {step.body && <p className="text-2xs text-ink-muted mt-0.5 leading-relaxed">{step.body}</p>}
                  {step.tip && (
                    <p className="text-2xs text-warning mt-1 flex items-start gap-1 leading-relaxed">
                      <Lightbulb className="size-3 shrink-0 mt-0.5" />
                      <span>{step.tip}</span>
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
          {docsUrl && (
            <li className="px-3 pt-1">
              <a href={docsUrl} target="_blank" rel="noreferrer" className="text-2xs text-accent hover:underline inline-flex items-center gap-1">
                Ver doc oficial da {platformName} <ExternalLink className="size-3" />
              </a>
            </li>
          )}
        </ol>
      )}

      <div className="flex gap-2 pt-1">
        <Input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={`Cole aqui o ${secretLabel}`}
          className="font-mono text-xs"
        />
        <Button onClick={save} disabled={saving || !secret.trim()}>
          {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Botão / Drawer de tutorial por plataforma
// ============================================================
function PlatformTutorialButton({
  platformName, tutorial,
}: {
  platformName: string;
  tutorial: typeof PLATFORM_TUTORIALS[string];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs text-accent gap-1.5"
      >
        <BookOpen className="size-3.5" />
        Tutorial {platformName}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="bg-bg-surface rounded-xl border border-line max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <p className="text-2xs uppercase tracking-wider text-ink-dim">Tutorial</p>
                <h2 className="text-lg font-semibold text-ink">Como configurar {platformName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-muted hover:text-ink p-2 rounded"
              >
                <ChevronUp className="size-4" />
              </button>
            </header>

            <div className="p-6 space-y-6">
              <TutorialSection icon={Lightbulb} title={tutorial.secret.label} description={tutorial.secret.description} steps={tutorial.secret.steps} docsUrl={tutorial.secret.docs_url} />
              <TutorialSection icon={Webhook} title={tutorial.webhook.label} description={tutorial.webhook.description} steps={tutorial.webhook.steps} docsUrl={tutorial.webhook.docs_url} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TutorialSection({
  icon: Icon, title, description, steps, docsUrl,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; description: string;
  steps: { title: string; body: string; tip?: string }[];
  docsUrl?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-md bg-accent-subtle text-accent grid place-items-center shrink-0">
          <Icon className="size-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="text-2xs text-ink-muted mt-0.5">{description}</p>
        </div>
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-2xs text-accent hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Docs oficiais <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <ol className="space-y-2 pl-3">
        {steps.map((step, i) => (
          <li key={i} className="rounded-md border border-line bg-bg-base px-3 py-2.5">
            <div className="flex items-start gap-3">
              <span className="size-5 rounded-full bg-bg-inset text-2xs font-mono font-bold text-ink-muted grid place-items-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-ink">{step.title}</p>
                {step.body && <p className="text-2xs text-ink-muted mt-0.5 leading-relaxed">{step.body}</p>}
                {step.tip && (
                  <p className="text-2xs text-warning mt-1.5 flex items-start gap-1.5 leading-relaxed">
                    <Lightbulb className="size-3 shrink-0 mt-0.5" />
                    <span>{step.tip}</span>
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SetupStep({
  n, icon: Icon, iconBg, done, onToggle, title, desc, code, highlight,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  done: boolean;
  onToggle: (v: boolean) => void;
  title: string; desc: string; code: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border bg-bg-base p-4 space-y-3",
      done ? "border-positive/30 bg-positive-subtle/10" : "border-line",
      highlight && !done && "border-accent/30 bg-accent-subtle/10"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggle(!done)}
            className={cn(
              "size-7 rounded-full grid place-items-center text-2xs font-mono font-bold transition-colors cursor-pointer",
              done
                ? "bg-positive text-ink-inverse hover:bg-positive/85"
                : "bg-bg-inset text-ink-muted border border-line hover:border-positive/50"
            )}
            aria-label={done ? "Desmarcar" : "Marcar como feito"}
          >
            {done ? <CheckCircle2 className="size-3.5" /> : n}
          </button>
          <div className={cn("size-7 rounded-md grid place-items-center", iconBg)}>
            <Icon className="size-3.5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink leading-tight">{title}</p>
          <p className="text-2xs text-ink-muted mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <CodeBlock code={code} />
    </div>
  );
}

// ============================================================
// Recent events (real)
// ============================================================
function RecentEventsPanel({ project }: { project: UtmProject }) {
  const events = project.recent_events ?? [];

  return (
    <div className="rounded-lg border border-line bg-bg-base">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-ink-muted" />
          <p className="text-sm font-semibold text-ink">Últimas vendas</p>
          {events.length > 0 && <Badge tone="neutral" size="xs">{project.events_count}</Badge>}
        </div>
        <span className="text-2xs text-ink-dim flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-positive animate-pulse" />
          ao vivo
        </span>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <ShoppingCart className="size-6 mx-auto text-ink-muted opacity-50" />
          <p className="text-sm text-ink mt-3 font-medium">Nenhuma venda ainda</p>
          <p className="text-2xs text-ink-muted mt-1 leading-relaxed max-w-sm mx-auto">
            Quando a primeira venda passar pelo gateway, aparece aqui em segundos —
            já casada com a campanha que originou.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {events.map((e) => {
            const statusTone =
              e.status === "approved" ? "positive" :
              e.status === "refunded" || e.status === "chargedback" ? "negative" :
              "warning";
            const date = new Date(e.occurred_at);
            return (
              <li key={e.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className={cn(
                  "size-2 rounded-full shrink-0",
                  statusTone === "positive" ? "bg-positive" :
                  statusTone === "negative" ? "bg-negative" : "bg-warning"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate font-medium">
                    {e.product_name ?? "Produto sem nome"}
                  </p>
                  <p className="text-2xs text-ink-muted mt-0.5 font-mono truncate">
                    {date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {e.utm_term && <span className="ml-2">utm_term={e.utm_term}</span>}
                  </p>
                </div>
                <span className={cn(
                  "text-sm tabular-nums font-semibold shrink-0",
                  statusTone === "negative" ? "text-negative line-through" : "text-positive"
                )}>
                  {e.gross_value_cents != null ? brl(e.gross_value_cents / 100) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// Code block reusable
// ============================================================
function CodeBlock({ code }: { code: string }) {
  const { push } = useToast();
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    push({ tone: "success", title: "Copiado!" });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <pre className="rounded-lg bg-bg-inset border border-line px-3 py-2.5 pr-10 text-2xs font-mono text-ink-muted leading-relaxed overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className={cn(
          "absolute right-2 top-2 size-7 grid place-items-center rounded-md transition-colors cursor-pointer",
          copied ? "bg-positive-subtle text-positive" : "bg-bg-surface text-ink-dim hover:text-ink hover:bg-bg-elevated border border-line"
        )}
        aria-label="Copiar"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}
