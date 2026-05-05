"use client";

import * as React from "react";
import { Plus, Send, Info, RefreshCw, Eye } from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { UploadZone, type CreativeFile } from "@/components/editor/upload-zone";
import { QueuePanel, type QueueJob } from "@/components/editor/queue-panel";
import { cn } from "@/lib/cn";
import { useMetaAccounts, useMetaCampaigns, useMetaAdsets } from "@/lib/hooks/use-meta";

export default function EditorPage() {
  const { push } = useToast();
  const [tab, setTab] = React.useState("create");

  // Real Meta data
  const { accounts: metaAccounts } = useMetaAccounts();

  // Form state
  const [accountQuery, setAccountQuery] = React.useState("");
  const [selectedAccts, setSelectedAccts] = React.useState<Set<string>>(new Set());
  const [selectedCamps, setSelectedCamps] = React.useState<Set<string>>(new Set());
  const [selectedAdsets, setSelectedAdsets] = React.useState<Set<string>>(new Set());

  // Pega dados reais da PRIMEIRA conta selecionada (multi-conta = fase 2)
  const primaryAccountId = React.useMemo(() => Array.from(selectedAccts)[0] ?? null, [selectedAccts]);
  const { campaigns: realCampaigns } = useMetaCampaigns(primaryAccountId, "last_30d");
  const { adsets: realAdsets } = useMetaAdsets(primaryAccountId, "last_30d");
  const [campsActiveOnly, setCampsActiveOnly] = React.useState(true);
  const [adsetsActiveOnly, setAdsetsActiveOnly] = React.useState(true);
  const [adName, setAdName] = React.useState("");
  const [useFileName, setUseFileName] = React.useState(false);
  const [adSuffix, setAdSuffix] = React.useState("");
  const [keepExistingSuffix, setKeepExistingSuffix] = React.useState(true);
  const [siteUrl, setSiteUrl] = React.useState("");
  const [headline, setHeadline] = React.useState("");
  const [bodyText, setBodyText] = React.useState("");
  const [igLinks, setIgLinks] = React.useState("");
  const [statusActive, setStatusActive] = React.useState(false);
  const [creatives, setCreatives] = React.useState<CreativeFile[]>([]);

  // Queue state
  const [jobs, setJobs] = React.useState<QueueJob[]>([]);
  const [publishing, setPublishing] = React.useState(false);
  const publishingRef = React.useRef(false);

  const filteredAccts = metaAccounts
    .filter((a) => a.name.toLowerCase().includes(accountQuery.toLowerCase()))
    .map((a) => ({ id: a.account_id, name: a.name, status: a.status }));

  const visibleCamps = React.useMemo(() => {
    if (!primaryAccountId) return [];
    return realCampaigns
      .filter((c) => !campsActiveOnly || c.status === "ACTIVE")
      .map((c) => ({ id: c.id, name: c.name, status: c.status === "ACTIVE" ? "active" : "paused" }));
  }, [primaryAccountId, realCampaigns, campsActiveOnly]);

  const visibleAdsets = React.useMemo(() => {
    if (selectedCamps.size === 0) return [];
    return realAdsets
      .filter((a) => selectedCamps.has(a.campaignId))
      .filter((a) => !adsetsActiveOnly || a.status === "ACTIVE")
      .map((a) => ({ id: a.id, name: a.name, status: a.status === "ACTIVE" ? "active" : "paused" }));
  }, [selectedCamps, realAdsets, adsetsActiveOnly]);

  const toggleSet = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const addToQueue = () => {
    if (creatives.length === 0) {
      push({ tone: "warning", title: "Adicione criativos primeiro" });
      return;
    }
    const newJobs: QueueJob[] = creatives.map((c, i) => {
      const baseName = useFileName
        ? c.name.replace(/\.[^.]+$/, "")
        : `AD${String(jobs.length + i + 1).padStart(2, "0")}`;
      const suffix = adSuffix && (keepExistingSuffix || !useFileName) ? ` - ${adSuffix}` : "";
      return {
        id: Math.random().toString(36).slice(2),
        name: `${baseName}${suffix}`,
        status: "queued",
        progress: 0,
      };
    });
    addToQueueWithFiles(newJobs, creatives);
    setJobs((curr) => [...curr, ...newJobs]);
    setCreatives([]);
    push({
      tone: "success",
      title: `${newJobs.length} ${newJobs.length === 1 ? "anúncio adicionado" : "anúncios adicionados"} à fila`,
    });
  };

  // Mantém File reais por job (não vai pra setJobs pra evitar serialização)
  const filesByJob = React.useRef<Map<string, File>>(new Map());

  const addToQueueWithFiles = (newJobs: QueueJob[], files: CreativeFile[]) => {
    files.forEach((cf, i) => {
      filesByJob.current.set(newJobs[i].id, cf.file);
    });
  };

  const publishAll = async () => {
    if (jobs.length === 0) return;
    if (!primaryAccountId) {
      push({ tone: "warning", title: "Selecione uma conta primeiro" });
      return;
    }
    if (selectedAdsets.size === 0) {
      push({ tone: "warning", title: "Selecione pelo menos um conjunto" });
      return;
    }
    setPublishing(true);
    publishingRef.current = true;

    // 1. Upload de cada criativo na ordem da fila
    type Uploaded = { jobId: string; ad_name: string; image_hash?: string; video_id?: string };
    const uploaded: Uploaded[] = [];

    const queuedJobs = jobs.filter((j) => j.status === "queued");

    for (const j of queuedJobs) {
      if (!publishingRef.current) break;
      const file = filesByJob.current.get(j.id);
      if (!file) {
        setJobs((curr) => curr.map((x) => x.id === j.id ? { ...x, status: "failed" as const, progress: 0 } : x));
        continue;
      }
      setJobs((curr) => curr.map((x) => x.id === j.id ? { ...x, status: "running" as const, progress: 10 } : x));

      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("account_id", primaryAccountId);

        const res = await fetch("/api/meta/editor/upload-creative", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || json.error) {
          setJobs((curr) => curr.map((x) => x.id === j.id ? { ...x, status: "failed" as const, progress: 0 } : x));
          continue;
        }
        setJobs((curr) => curr.map((x) => x.id === j.id ? { ...x, progress: 60 } : x));
        uploaded.push({
          jobId: j.id,
          ad_name: j.name,
          image_hash: json.image_hash,
          video_id: json.video_id,
        });
      } catch {
        setJobs((curr) => curr.map((x) => x.id === j.id ? { ...x, status: "failed" as const, progress: 0 } : x));
      }
    }

    // 2. Bulk-create-ads pra todos os criativos uploadados nos adsets selecionados
    if (uploaded.length > 0 && publishingRef.current) {
      try {
        const res = await fetch("/api/meta/editor/bulk-create-ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: primaryAccountId,
            adset_ids: Array.from(selectedAdsets),
            creatives: uploaded.map((u) => ({
              image_hash: u.image_hash,
              video_id: u.video_id,
              ad_name: u.ad_name,
            })),
            creative_template: {
              link_url: siteUrl || "https://example.com",
              headline,
              body: bodyText,
              call_to_action: "LEARN_MORE",
            },
            active: statusActive,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          // Marca todos os uploaded como done (proporcional ao success)
          uploaded.forEach((u) => {
            setJobs((curr) => curr.map((x) => x.id === u.jobId ? { ...x, status: "done" as const, progress: 100 } : x));
          });
          push({
            tone: json.failed === 0 ? "success" : "warning",
            title: `${json.success} ads criados`,
            description: json.failed > 0 ? `${json.failed} falhas — ver detalhes na fila.` : `Em ${selectedAdsets.size} conjunto(s).`,
          });
        } else {
          uploaded.forEach((u) => {
            setJobs((curr) => curr.map((x) => x.id === u.jobId ? { ...x, status: "failed" as const, progress: 0 } : x));
          });
          push({ tone: "danger", title: "Erro criando ads", description: json.detail ?? json.error });
        }
      } catch (e: any) {
        push({ tone: "danger", title: "Erro de rede", description: e.message });
      }
    }

    setPublishing(false);
    publishingRef.current = false;
  };

  const abort = () => {
    publishingRef.current = false;
    setPublishing(false);
    setJobs((curr) => curr.map((j) => j.status === "running" ? { ...j, status: "cancelled" } : j));
    push({ tone: "warning", title: "Fila interrompida" });
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
      <ModuleHeader
        eyebrow="Operação · Flagship"
        title="Publicar Anúncios em Massa"
        description="Suba até 100+ anúncios em poucos minutos. A fila roda em background — você pode fechar a aba e a publicação continua. Suporta vídeos > 100MB sem timeout."
        tutorial
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="create">
            <Plus className="size-3.5 mr-1" />
            Criar Anúncio
          </TabsTrigger>
          <TabsTrigger value="instagram">Publicação Existente (link IG)</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-5">
          <TooltipProvider delayDuration={250}>
            <div className="rounded-lg border border-line bg-bg-surface p-6 space-y-6">
              {/* Buscar conta + ações */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Buscar Conta</Label>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="sm"><Eye /> Privacidade</Button>
                      </TooltipTrigger>
                      <TooltipContent>Oculta nomes</TooltipContent>
                    </Tooltip>
                    <Button variant="secondary" size="sm"><RefreshCw /> Atualizar</Button>
                  </div>
                </div>
                <Input
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  placeholder="Digite para filtrar…"
                />
              </div>

              {/* Multi-select Contas */}
              <MultiSelect
                label={`Selecione uma ou mais Contas de Anúncio (Ctrl/Cmd + Clique)`}
                items={filteredAccts.map((a) => ({ id: a.id, label: a.name, sub: a.id }))}
                selected={selectedAccts}
                onToggle={(id) => toggleSet(selectedAccts, id, setSelectedAccts)}
                emptyText="Nenhuma conta encontrada para esse filtro."
              />

              {/* Multi-select Campanhas */}
              <MultiSelect
                label={`Selecione uma ou mais Campanhas (Ctrl/Cmd + Clique)`}
                rightToggle={{
                  label: "Ativas apenas",
                  checked: campsActiveOnly,
                  onChange: setCampsActiveOnly,
                }}
                items={visibleCamps.map((c) => ({ id: c.id, label: c.name, badge: c.status }))}
                selected={selectedCamps}
                onToggle={(id) => toggleSet(selectedCamps, id, setSelectedCamps)}
                emptyText={selectedAccts.size === 0 ? "Selecione uma conta acima primeiro." : "Nenhuma campanha encontrada."}
              />

              {/* Multi-select Conjuntos */}
              <MultiSelect
                label={`Selecione um ou mais Conjuntos de Anúncios`}
                rightToggle={{
                  label: "Ativos apenas",
                  checked: adsetsActiveOnly,
                  onChange: setAdsetsActiveOnly,
                }}
                items={visibleAdsets.map((a) => ({ id: a.id, label: a.name, badge: a.status }))}
                selected={selectedAdsets}
                onToggle={(id) => toggleSet(selectedAdsets, id, setSelectedAdsets)}
                emptyText={selectedCamps.size === 0 ? "Selecione campanhas acima primeiro." : "Nenhum conjunto encontrado."}
              />

              {/* Nome / Complemento + toggles */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ad-name">Nome do Anúncio (opcional)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3 text-ink-dim cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Vazio = AD01, AD02, AD03 automaticamente.</TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="ad-name"
                    value={adName}
                    onChange={(e) => setAdName(e.target.value)}
                    placeholder="Deixe em branco para nomear automaticamente"
                  />
                  <label className="flex items-center gap-2 text-2xs text-ink-muted cursor-pointer">
                    <Switch checked={useFileName} onCheckedChange={setUseFileName}  />
                    Usar Nome do Arquivo (sem extensão)
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ad-suffix">Complemento do Anúncio (opcional)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3 text-ink-dim cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Sufixo após o ADXX. Ex: "Black Friday" → AD01 - Black Friday</TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="ad-suffix"
                    value={adSuffix}
                    onChange={(e) => setAdSuffix(e.target.value)}
                    placeholder="Ex: Promoção Black Friday"
                  />
                  <label className="flex items-center gap-2 text-2xs text-ink-muted cursor-pointer">
                    <Switch checked={keepExistingSuffix} onCheckedChange={setKeepExistingSuffix}  />
                    Manter sufixo atual (além do ADXX)
                  </label>
                </div>
              </div>

              {/* URL / Título / Texto */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-url">URL do Site (opcional)</Label>
                  <Input
                    id="ad-url"
                    type="url"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://seusite.com"
                    mono
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-headline">Título (opcional)</Label>
                  <Input
                    id="ad-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Título do seu anúncio"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-body">Texto Principal (opcional)</Label>
                  <Textarea
                    id="ad-body"
                    rows={3}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Descrição do seu anúncio"
                  />
                </div>
              </div>

              {/* Upload zone */}
              <div className="space-y-2">
                <Label>Criativos (Imagens ou Vídeos)</Label>
                <UploadZone
                  files={creatives}
                  onAdd={(fs) => setCreatives((curr) => [...curr, ...fs])}
                  onRemove={(id) => setCreatives((curr) => curr.filter((f) => f.id !== id))}
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between rounded-md bg-bg-inset border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Status do Anúncio</p>
                  <p className="text-2xs text-ink-dim mt-0.5">
                    {statusActive ? "Anúncios sobem ATIVOS imediatamente após criação." : "Anúncios sobem PAUSADOS — você ativa depois."}
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={cn("text-xs font-medium", statusActive ? "text-positive" : "text-ink-muted")}>
                    {statusActive ? "Ativo" : "Pausado"}
                  </span>
                  <Switch checked={statusActive} onCheckedChange={setStatusActive} />
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="lg" onClick={addToQueue}>
                  <Plus /> Adicionar à fila ({creatives.length})
                </Button>
              </div>
            </div>
          </TooltipProvider>
        </TabsContent>

        <TabsContent value="instagram">
          <div className="rounded-lg border border-line bg-bg-surface p-6 space-y-3">
            <Label>Links de Publicações do Instagram (um por linha)</Label>
            <Textarea
              value={igLinks}
              onChange={(e) => setIgLinks(e.target.value)}
              rows={6}
              placeholder="https://www.instagram.com/p/CXXXX...&#10;https://www.instagram.com/p/CXXYY..."
              mono
            />
            <p className="text-2xs text-ink-dim leading-relaxed">
              Reaproveita publicações já feitas, preservando engajamento social (curtidas, comentários, compartilhamentos).
              Útil para escalar criativos vencedores sem perder prova social.
            </p>
            <div className="flex justify-end">
              <Button variant="primary" disabled={!igLinks.trim()}>
                <Plus /> Adicionar à fila
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Painel da fila — sempre visível */}
      <div>
        <p className="eyebrow mb-2.5">Fila de publicação</p>
        <QueuePanel
          jobs={jobs}
          online={true}
          publishing={publishing}
          onPublishAll={publishAll}
          onAbort={abort}
          onRemove={(id) => setJobs((curr) => curr.filter((j) => j.id !== id))}
        />
      </div>
    </div>
  );
}

// =============================================================
// Multi-select reutilizável
// =============================================================
interface MultiSelectItem {
  id: string;
  label: string;
  sub?: string;
  badge?: string;
}

function MultiSelect({
  label,
  items,
  selected,
  onToggle,
  emptyText,
  rightToggle,
}: {
  label: string;
  items: MultiSelectItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyText: string;
  rightToggle?: { label: string; checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <Badge tone="accent" size="xs">{selected.size} selecionada{selected.size > 1 ? "s" : ""}</Badge>
          )}
          {rightToggle && (
            <label className="flex items-center gap-1.5 text-2xs text-ink-muted cursor-pointer">
              <Switch checked={rightToggle.checked} onCheckedChange={rightToggle.onChange}  />
              {rightToggle.label}
            </label>
          )}
        </div>
      </div>
      <div className="rounded-md border border-line bg-bg-inset max-h-44 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-ink-dim">{emptyText}</div>
        ) : (
          items.map((item) => {
            const isSel = selected.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-1.5 text-xs text-left border-b border-line/40 last:border-b-0 transition-colors cursor-pointer",
                  isSel ? "bg-accent-subtle/40 text-ink" : "text-ink-muted hover:bg-bg-elevated hover:text-ink"
                )}
              >
                <span className={cn(
                  "size-3.5 rounded border grid place-items-center shrink-0 transition-colors",
                  isSel ? "bg-accent border-accent" : "border-line-strong"
                )}>
                  {isSel && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="hsl(var(--ink-inverse))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <Badge tone={item.badge === "active" ? "positive" : "neutral"} size="xs">
                    {item.badge === "active" ? "Ativa" : "Pausada"}
                  </Badge>
                )}
                {item.sub && <span className="font-mono text-2xs text-ink-dim">{item.sub}</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
