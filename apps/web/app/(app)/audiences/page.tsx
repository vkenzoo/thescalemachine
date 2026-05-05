"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Eye,
  X,
  Globe,
  Layers,
  Play,
  Instagram,
  Facebook,
  Trash2,
  Plus,
  Users,
  AlertCircle,
  Plug,
  CheckCircle2,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { BulkProgressModal, type BulkProgressState } from "@/components/shared/bulk-progress-modal";
import {
  AUDIENCE_IG_ENGAGEMENT,
  AUDIENCE_FB_ENGAGEMENT,
  AUDIENCE_VIDEO_VIEWS,
  AUDIENCE_PIXEL_EVENTS,
  AUDIENCE_LOOKALIKE_SIZES,
  AUDIENCE_RETENTION_PERIODS,
} from "@/lib/mock-data";
import { num } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useMetaAccounts } from "@/lib/hooks/use-meta";
import {
  useMetaAudiences,
  useMetaPixels,
  useMetaVideos,
  useMetaPages,
  useMetaInstagramAccounts,
  createAudiencesBatch,
  type BatchCreateBody,
} from "@/lib/hooks/use-audiences";

type CategoryId = "ig" | "fb" | "video" | "site" | "lookalike";

export default function AudiencesPage() {
  const { push } = useToast();
  const { accounts: metaAccounts, isLoading: accLoading } = useMetaAccounts();
  const [account, setAccount] = React.useState<string>("");

  // Define primeira conta como default
  React.useEffect(() => {
    if (!account && metaAccounts.length > 0) setAccount(metaAccounts[0].account_id);
  }, [metaAccounts, account]);

  // Dados reais da Graph
  const { audiences } = useMetaAudiences(account || null);
  const { pixels } = useMetaPixels(account || null);
  const { videos } = useMetaVideos(account || null);
  const { pages } = useMetaPages();
  const { accounts: igAccounts } = useMetaInstagramAccounts();

  // Habilitação por categoria
  const [enabled, setEnabled] = React.useState<Record<CategoryId, boolean>>({
    ig: false, fb: false, video: false, site: false, lookalike: false,
  });

  // Sub-opções
  const [igSel,    setIgSel]    = React.useState<Set<string>>(new Set());
  const [fbSel,    setFbSel]    = React.useState<Set<string>>(new Set());
  const [videoSel, setVideoSel] = React.useState<Set<string>>(new Set());
  const [pixelSel, setPixelSel] = React.useState<Set<string>>(new Set(["PageView", "Lead", "Purchase"]));
  const [lalSel,   setLalSel]   = React.useState<Set<string>>(new Set());

  // Source IDs específicos
  const [selectedIgId, setSelectedIgId] = React.useState<string>("");
  const [selectedPageId, setSelectedPageId] = React.useState<string>("");
  const [selectedPixelId, setSelectedPixelId] = React.useState<string>("");
  const [selectedSourceAudienceId, setSelectedSourceAudienceId] = React.useState<string>("");
  const [lookalikeCountry, setLookalikeCountry] = React.useState<string>("BR");

  // Vídeos selecionados
  const [selectedVideos, setSelectedVideos] = React.useState<Set<string>>(new Set());
  const [videoPrefix, setVideoPrefix] = React.useState("Video Anúncios");

  // Site URL
  const [siteUrl, setSiteUrl] = React.useState("");
  const [siteUrlEnabled, setSiteUrlEnabled] = React.useState(false);

  // Períodos de retenção
  const [retention, setRetention] = React.useState<Set<string>>(new Set(["7d", "30d", "90d"]));

  // Auto-select primeiro IG/Page/Pixel quando carregam
  React.useEffect(() => {
    if (!selectedIgId && igAccounts.length > 0) setSelectedIgId(igAccounts[0].id);
  }, [igAccounts, selectedIgId]);
  React.useEffect(() => {
    if (!selectedPageId && pages.length > 0) setSelectedPageId(pages[0].id);
  }, [pages, selectedPageId]);
  React.useEffect(() => {
    if (!selectedPixelId && pixels.length > 0) setSelectedPixelId(pixels[0].id);
  }, [pixels, selectedPixelId]);

  // Auto-select primeiro audience como source pra LAL quando audiences carregam
  React.useEffect(() => {
    if (!selectedSourceAudienceId && audiences.length > 0) {
      // Prefere CUSTOM ou ENGAGEMENT (não LOOKALIKE) como source
      const valid = audiences.find((a) => a.subtype !== "LOOKALIKE");
      if (valid) setSelectedSourceAudienceId(valid.id);
    }
  }, [audiences, selectedSourceAudienceId]);

  // Cálculo total de públicos a criar
  const totalAudiences = React.useMemo(() => {
    if (retention.size === 0) return 0;
    let total = 0;
    if (enabled.ig && selectedIgId) total += igSel.size * retention.size;
    if (enabled.fb && selectedPageId) total += fbSel.size * retention.size;
    if (enabled.video && selectedVideos.size > 0) {
      total += videoSel.size * selectedVideos.size * retention.size;
    }
    if (enabled.site && selectedPixelId) {
      total += pixelSel.size * retention.size;
      if (siteUrlEnabled && siteUrl) total += retention.size;
    }
    if (enabled.lookalike && selectedSourceAudienceId) {
      total += lalSel.size; // LAL não tem retention
    }
    return total;
  }, [enabled, igSel, fbSel, videoSel, selectedVideos, pixelSel, siteUrl, siteUrlEnabled, lalSel, retention, selectedIgId, selectedPageId, selectedPixelId, selectedSourceAudienceId]);

  const reset = () => {
    setEnabled({ ig: false, fb: false, video: false, site: false, lookalike: false });
    setIgSel(new Set()); setFbSel(new Set()); setVideoSel(new Set());
    setPixelSel(new Set()); setLalSel(new Set());
    setSelectedVideos(new Set());
  };

  // Progress modal
  const [progressOpen, setProgressOpen] = React.useState(false);
  const [progress, setProgress] = React.useState<BulkProgressState>({
    total: 0, done: 0, success: 0, failed: 0, errors: [], status: "complete",
  });

  const handleCreate = async () => {
    if (totalAudiences === 0 || !account) return;

    setProgress({ total: totalAudiences, done: 0, success: 0, failed: 0, errors: [], status: "running" });
    setProgressOpen(true);

    const body: BatchCreateBody = {
      account_id: account,
      retention_keys: Array.from(retention),
    };

    if (enabled.ig && selectedIgId && igSel.size > 0) {
      const ig = igAccounts.find((a) => a.id === selectedIgId);
      body.ig = {
        account_id: selectedIgId,
        username: ig?.username ?? undefined,
        event_keys: Array.from(igSel),
      };
    }
    if (enabled.fb && selectedPageId && fbSel.size > 0) {
      const page = pages.find((p) => p.id === selectedPageId);
      body.fb = {
        page_id: selectedPageId,
        page_name: page?.name ?? undefined,
        event_keys: Array.from(fbSel),
      };
    }
    if (enabled.video && videoSel.size > 0 && selectedVideos.size > 0) {
      body.video = {
        video_ids: Array.from(selectedVideos).map((id) => {
          const v = videos.find((x) => x.id === id);
          return { id, title: v?.title };
        }),
        event_keys: Array.from(videoSel),
        prefix: videoPrefix,
      };
    }
    if (enabled.site && selectedPixelId && pixelSel.size > 0) {
      body.pixel = {
        pixel_id: selectedPixelId,
        event_names: Array.from(pixelSel),
        site_url: siteUrl || undefined,
        site_url_enabled: siteUrlEnabled,
      };
    }
    if (enabled.lookalike && selectedSourceAudienceId && lalSel.size > 0) {
      const src = audiences.find((a) => a.id === selectedSourceAudienceId);
      body.lookalike = {
        source_audience_id: selectedSourceAudienceId,
        source_name: src?.name ?? undefined,
        ratio_keys: Array.from(lalSel),
        country: lookalikeCountry,
      };
    }

    try {
      const result = await createAudiencesBatch(body);
      setProgress({
        total: result.total,
        done: result.total,
        success: result.created_count,
        failed: result.failed_count,
        errors: result.failed.map((f) => ({ id: f.name, message: `[${f.kind}] ${f.message}` })),
        status: "complete",
      });
      if (result.created_count > 0) reset();
    } catch (e: any) {
      setProgress({
        total: totalAudiences,
        done: 0,
        success: 0,
        failed: totalAudiences,
        errors: [{ id: "global", message: e.message }],
        status: "complete",
      });
    }
  };

  // ============================================================
  // EMPTY STATES
  // ============================================================
  if (accLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-4">
        <div className="h-12 w-64 bg-bg-elevated rounded-md animate-pulse" />
        <div className="h-[400px] bg-bg-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (metaAccounts.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <EmptyState
          icon={Plug}
          title="Conecte sua primeira conta Meta"
          description="Pra criar públicos personalizados precisa ter uma conta Meta conectada."
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

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6 pb-32">
      <ModuleHeader
        eyebrow="Operação"
        title="Criar Públicos"
        description="Crie múltiplos públicos personalizados em um único clique. Combine categorias e períodos — o sistema calcula e dispara todos via Marketing API."
        tutorial
        actions={<Button variant="ghost" size="sm"><Eye /> Privacidade</Button>}
      />

      {/* Conta */}
      <div className="rounded-xl border border-line bg-bg-surface p-4 space-y-3">
        <Label className="flex items-center gap-1.5 text-sm">
          <span className="size-3.5 rounded grid place-items-center bg-accent-subtle">
            <span className="size-1.5 rounded-sm bg-accent" />
          </span>
          Conta de Anúncios
        </Label>
        <Select value={account} onValueChange={setAccount}>
          <SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {metaAccounts.map((a) => (
              <SelectItem key={a.account_id} value={a.account_id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {pixels.length > 0 ? (
            <Badge tone="positive" size="xs" dot>{pixels.length} pixel{pixels.length === 1 ? "" : "s"}</Badge>
          ) : (
            <Badge tone="neutral" size="xs">Sem pixel</Badge>
          )}
          {igAccounts.length > 0 && <Badge tone="info" size="xs" dot>{igAccounts.length} IG</Badge>}
          {pages.length > 0 && <Badge tone="info" size="xs" dot>{pages.length} Page{pages.length === 1 ? "" : "s"}</Badge>}
          {videos.length > 0 && <Badge tone="info" size="xs" dot>{videos.length} vídeo{videos.length === 1 ? "" : "s"}</Badge>}
        </div>
      </div>

      {/* IG Engagement */}
      <CategoryCard
        title="Instagram – Envolvimento"
        icon={<InstagramIcon />}
        toggleLabel="Habilitar IG"
        enabled={enabled.ig}
        onToggle={(v) => setEnabled((e) => ({ ...e, ig: v }))}
        selectedCount={igSel.size}
        onSelectAll={() => setIgSel(new Set(AUDIENCE_IG_ENGAGEMENT.map((o) => o.id)))}
        onClearAll={() => setIgSel(new Set())}
        warning={igAccounts.length === 0 ? "Nenhuma conta IG Business encontrada. Vincule uma Page do FB a um IG no Business Manager." : null}
      >
        {igAccounts.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-2xs">Conta IG</Label>
            <Select value={selectedIgId} onValueChange={setSelectedIgId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {igAccounts.map((ig) => (
                  <SelectItem key={ig.id} value={ig.id}>
                    @{ig.username ?? ig.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CheckList items={AUDIENCE_IG_ENGAGEMENT as any} selected={igSel} onToggle={(id) => toggleSet(igSel, id, setIgSel)} />
      </CategoryCard>

      {/* FB Engagement */}
      <CategoryCard
        title="Facebook – Envolvimento"
        icon={<FacebookIcon />}
        toggleLabel="Habilitar FB"
        enabled={enabled.fb}
        onToggle={(v) => setEnabled((e) => ({ ...e, fb: v }))}
        selectedCount={fbSel.size}
        onSelectAll={() => setFbSel(new Set(AUDIENCE_FB_ENGAGEMENT.map((o) => o.id)))}
        onClearAll={() => setFbSel(new Set())}
        warning={pages.length === 0 ? "Nenhuma Page Facebook encontrada atribuída ao seu Usuário do Sistema." : null}
      >
        {pages.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-2xs">Page</Label>
            <Select value={selectedPageId} onValueChange={setSelectedPageId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CheckList items={AUDIENCE_FB_ENGAGEMENT as any} selected={fbSel} onToggle={(id) => toggleSet(fbSel, id, setFbSel)} />
      </CategoryCard>

      {/* Video View */}
      <CategoryCard
        title="Vídeos – Engajamento"
        icon={<VideoIcon />}
        toggleLabel="Habilitar Vídeos"
        enabled={enabled.video}
        onToggle={(v) => setEnabled((e) => ({ ...e, video: v }))}
        selectedCount={videoSel.size}
        onSelectAll={() => setVideoSel(new Set(AUDIENCE_VIDEO_VIEWS.map((o) => o.id)))}
        onClearAll={() => setVideoSel(new Set())}
        warning={videos.length === 0 ? "Nenhum vídeo encontrado nesta conta de anúncios." : null}
      >
        <CheckList items={AUDIENCE_VIDEO_VIEWS as any} selected={videoSel} onToggle={(id) => toggleSet(videoSel, id, setVideoSel)} />

        <div className="space-y-1.5 pt-2">
          <Label htmlFor="video-prefix">Prefixo do nome</Label>
          <Input id="video-prefix" value={videoPrefix} onChange={(e) => setVideoPrefix(e.target.value)} />
        </div>

        {videos.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Play className="size-3 text-accent" />
                Selecionar vídeos
                <Badge tone="info" size="xs">{selectedVideos.size}/{videos.length}</Badge>
              </Label>
              <div className="flex gap-2 text-2xs">
                <button onClick={() => setSelectedVideos(new Set(videos.map(v => v.id)))} className="text-accent hover:underline cursor-pointer font-medium">Todos</button>
                <button onClick={() => setSelectedVideos(new Set())} className="text-negative hover:underline cursor-pointer font-medium">Limpar</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {videos.slice(0, 30).map((v) => {
                const isSel = selectedVideos.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleSet(selectedVideos, v.id, setSelectedVideos)}
                    className={cn(
                      "p-1.5 rounded-md border text-left transition-colors cursor-pointer",
                      isSel ? "border-accent/40 bg-accent-subtle/30" : "border-line bg-bg-inset hover:bg-bg-elevated"
                    )}
                  >
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnailUrl} alt="" className="w-full aspect-video rounded object-cover mb-1" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full aspect-video rounded bg-bg-elevated grid place-items-center mb-1">
                        <Play className="size-4 text-ink-dim" />
                      </div>
                    )}
                    <p className={cn("text-2xs truncate", isSel ? "text-ink font-medium" : "text-ink-muted")}>
                      {v.title}
                    </p>
                  </button>
                );
              })}
            </div>
            {videos.length > 30 && (
              <p className="text-2xs text-ink-dim text-center">Mostrando 30 de {videos.length} vídeos</p>
            )}
          </div>
        )}
      </CategoryCard>

      {/* Site - Pixel */}
      <CategoryCard
        title="Site – Eventos do Pixel"
        icon={<Globe className="size-5 text-info" />}
        toggleLabel="Habilitar Pixel"
        enabled={enabled.site}
        onToggle={(v) => setEnabled((e) => ({ ...e, site: v }))}
        selectedCount={pixelSel.size + (siteUrlEnabled && siteUrl ? 1 : 0)}
        onSelectAll={() => setPixelSel(new Set(AUDIENCE_PIXEL_EVENTS.map((e) => e.id)))}
        onClearAll={() => { setPixelSel(new Set()); setSiteUrl(""); setSiteUrlEnabled(false); }}
        warning={pixels.length === 0 ? "Nenhum pixel encontrado. Configure um pixel no Events Manager primeiro." : null}
      >
        {pixels.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-2xs">Pixel</Label>
            <Select value={selectedPixelId} onValueChange={setSelectedPixelId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pixels.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.lastFiredTime ? "" : " (sem dados)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-ink-dim mb-2">Eventos</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {AUDIENCE_PIXEL_EVENTS.map((event) => {
              const isSel = pixelSel.has(event.id);
              return (
                <label
                  key={event.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors",
                    isSel ? "text-ink" : "text-ink-muted hover:text-ink"
                  )}
                >
                  <Checkbox checked={isSel} onCheckedChange={() => toggleSet(pixelSel, event.id, setPixelSel)} />
                  <span>{event.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={siteUrlEnabled} onCheckedChange={(v) => setSiteUrlEnabled(!!v)} />
            <span className={siteUrlEnabled ? "text-ink" : "text-ink-muted"}>
              Adicionar audience por URL específica
            </span>
          </label>
          {siteUrlEnabled && (
            <div className="ml-6">
              <Input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="Ex: seusite.com.br/obrigado"
                mono
                className="h-9 text-xs"
              />
              <p className="text-2xs text-ink-dim mt-1">
                Cria audience PageView filtrada pra essa URL.
              </p>
            </div>
          )}
        </div>
      </CategoryCard>

      {/* Lookalike */}
      <CategoryCard
        title="Lookalike"
        icon={<Layers className="size-5 text-accent" />}
        toggleLabel="Habilitar LAL"
        enabled={enabled.lookalike}
        onToggle={(v) => setEnabled((e) => ({ ...e, lookalike: v }))}
        selectedCount={lalSel.size}
        onSelectAll={() => setLalSel(new Set(AUDIENCE_LOOKALIKE_SIZES.map((o) => o.id)))}
        onClearAll={() => setLalSel(new Set())}
        warning={audiences.filter(a => a.subtype !== "LOOKALIKE").length === 0 ? "Crie pelo menos um público (Custom ou Engagement) antes de gerar Lookalikes." : null}
      >
        {audiences.length > 0 && (
          <>
            <div className="space-y-1.5">
              <Label className="text-2xs">Público de origem</Label>
              <Select value={selectedSourceAudienceId} onValueChange={setSelectedSourceAudienceId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione um público" /></SelectTrigger>
                <SelectContent>
                  {audiences.filter(a => a.subtype !== "LOOKALIKE").map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.approximateCount ? ` · ~${num(a.approximateCount)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-2xs">País</Label>
              <Select value={lookalikeCountry} onValueChange={setLookalikeCountry}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="US">Estados Unidos</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="MX">México</SelectItem>
                  <SelectItem value="AR">Argentina</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <CheckList items={AUDIENCE_LOOKALIKE_SIZES as any} selected={lalSel} onToggle={(id) => toggleSet(lalSel, id, setLalSel)} />
        <p className="text-2xs text-ink-dim italic">Lookalikes não usam períodos de retenção.</p>
      </CategoryCard>

      {/* Períodos de retenção */}
      <div className="rounded-xl border border-line bg-bg-surface p-5 space-y-3">
        <div>
          <Label className="flex items-center gap-1.5 text-sm">
            <Calendar className="size-3.5 text-accent" />
            Períodos de Retenção
          </Label>
          <p className="text-xs text-ink-dim mt-1">Aplicam a IG/FB/Vídeo/Pixel (não Lookalike)</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCE_RETENTION_PERIODS.map((p) => {
            const isSel = retention.has(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggleSet(retention, p, setRetention)}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer border",
                  isSel
                    ? "bg-accent text-ink-inverse border-accent shadow-elev-1"
                    : "bg-bg-inset text-ink-muted border-line hover:border-line-strong hover:text-ink"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de audiences existentes */}
      {audiences.length > 0 && (
        <div className="rounded-xl border border-line bg-bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-sm">
              <Users className="size-3.5 text-accent" />
              Públicos existentes
            </Label>
            <Badge tone="neutral" size="xs">{audiences.length}</Badge>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {audiences.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs py-1">
                <Badge tone={a.subtype === "LOOKALIKE" ? "accent" : "neutral"} size="xs">{a.subtype.slice(0, 3)}</Badge>
                <span className="text-ink truncate flex-1">{a.name}</span>
                {a.approximateCount != null && (
                  <span className="text-2xs text-ink-dim font-mono">~{num(a.approximateCount)}</span>
                )}
              </div>
            ))}
            {audiences.length > 20 && (
              <p className="text-2xs text-ink-dim text-center pt-1">+{audiences.length - 20} mais</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom action bar — fixo */}
      <div className="fixed bottom-0 left-[240px] right-0 z-10 vibrancy-strong border-t border-line">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">
              <span className={cn(
                "font-semibold tabular-nums text-2xl mr-2",
                totalAudiences > 0 ? "text-accent" : "text-ink-dim"
              )}>
                {totalAudiences}
              </span>
              {totalAudiences === 1 ? "público será criado" : "públicos serão criados"}
            </span>
            {totalAudiences > 100 && <Badge tone="warning" size="sm">⚠ Alto volume — pode demorar</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={reset} disabled={totalAudiences === 0}>
              <Trash2 /> Limpar
            </Button>
            <Button variant="primary" size="lg" disabled={totalAudiences === 0} onClick={handleCreate}>
              <Plus /> Criar Públicos
            </Button>
          </div>
        </div>
      </div>

      <BulkProgressModal
        open={progressOpen}
        onOpenChange={setProgressOpen}
        title="Criando públicos…"
        state={progress}
      />
    </div>
  );
}

// =============================================================
// Helpers
// =============================================================
function toggleSet<T>(set: Set<T>, key: T, setter: (s: Set<T>) => void) {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  setter(next);
}

interface CategoryCardProps {
  title: string;
  icon: React.ReactNode;
  toggleLabel: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  warning?: string | null;
  children: React.ReactNode;
}

function CategoryCard({
  title, icon, toggleLabel, enabled, onToggle, selectedCount,
  onSelectAll, onClearAll, warning, children,
}: CategoryCardProps) {
  return (
    <section className={cn("rounded-xl border bg-bg-surface transition-all", enabled ? "border-line shadow-elev-1" : "border-line")}>
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line/60">
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {enabled && selectedCount > 0 && <Badge tone="accent" size="xs">{selectedCount}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {enabled && (
            <button
              onClick={selectedCount > 0 ? onClearAll : onSelectAll}
              className="text-2xs text-accent hover:underline cursor-pointer font-medium"
            >
              {selectedCount > 0 ? "Desmarcar tudo" : "Marcar tudo"}
            </button>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-ink-muted">{toggleLabel}</span>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </label>
        </div>
      </header>
      {enabled && (
        <div className="p-5 space-y-3 animate-fade-in">
          {warning && (
            <div className="rounded-md border border-warning/30 bg-warning-subtle/30 px-3 py-2 flex items-start gap-2 text-xs">
              <AlertCircle className="size-3.5 text-warning shrink-0 mt-0.5" />
              <span className="text-ink-muted">{warning}</span>
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}

interface CheckItem { id: string; label: string }

function CheckList({ items, selected, onToggle }: {
  items: readonly CheckItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isSel = selected.has(item.id);
        return (
          <label key={item.id} className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors",
            isSel ? "text-ink" : "text-ink-muted hover:text-ink"
          )}>
            <Checkbox checked={isSel} onCheckedChange={() => onToggle(item.id)} />
            <span>{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function InstagramIcon() {
  return (
    <div className="size-5 rounded grid place-items-center" style={{ background: "linear-gradient(45deg, #F58529, #DD2A7B 50%, #8134AF)" }}>
      <Instagram className="size-3 text-white" />
    </div>
  );
}

function FacebookIcon() {
  return (
    <div className="size-5 rounded grid place-items-center bg-[#1877F2]">
      <Facebook className="size-3 text-white fill-white" />
    </div>
  );
}

function VideoIcon() {
  return (
    <div className="size-5 rounded grid place-items-center bg-negative">
      <Play className="size-2.5 text-white fill-white ml-0.5" />
    </div>
  );
}
