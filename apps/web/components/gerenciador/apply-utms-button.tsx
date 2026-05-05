"use client";

import * as React from "react";
import { Tag, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_TEMPLATE =
  "utm_source=fb&utm_campaign={{campaign.name}}|{{campaign.id}}" +
  "&utm_medium={{adset.name}}|{{adset.id}}&utm_content={{ad.name}}|{{ad.id}}" +
  "&utm_term={{ad.id}}";

export function ApplyUtmsButton({
  selectedCount,
  campaignMetaIds,
  onComplete,
}: {
  selectedCount: number;
  campaignMetaIds: string[];
  onComplete?: () => void | Promise<void>;
}) {
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [template, setTemplate] = React.useState(DEFAULT_TEMPLATE);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  if (selectedCount === 0) return null;

  const apply = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/meta/bulk-apply-utms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_ids: campaignMetaIds, template }),
      });
      const json = await res.json();
      setResult(json);
      if (res.ok && json.ok) {
        push({
          tone: "success",
          title: `UTMs aplicadas em ${json.success} anúncios`,
          description: `${campaignMetaIds.length} campanhas processadas.`,
        });
        await onComplete?.();
      } else if (res.ok && json.failed > 0) {
        push({
          tone: "warning",
          title: `${json.success} ok, ${json.failed} falharam`,
          description: "Veja detalhes no modal.",
        });
      } else {
        push({ tone: "warning", title: "Falhou", description: json.detail ?? json.error ?? "Erro" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => { setResult(null); setOpen(true); }}
      >
        <Tag className="size-3.5" />
        Aplicar UTMs
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Aplicar template UTM</DialogTitle>
            <DialogDescription>
              Vai escrever o campo <code className="text-2xs">url_tags</code> em <strong>todos os anúncios</strong> de{" "}
              <strong className="text-accent">{selectedCount} {selectedCount === 1 ? "campanha" : "campanhas"}</strong>.
              Os placeholders <code className="text-2xs">{"{{campaign.id}}"}</code> são substituídos pelo Meta na hora do clique.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="template">Template UTM</Label>
              <textarea
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-line bg-bg-inset px-3 py-2 text-2xs font-mono text-ink leading-relaxed"
                disabled={busy}
              />
              <p className="text-2xs text-ink-muted">
                O template é gravado direto no anúncio Meta. Placeholders válidos:{" "}
                <code>{"{{campaign.id}}"}</code>, <code>{"{{campaign.name}}"}</code>,{" "}
                <code>{"{{adset.id}}"}</code>, <code>{"{{adset.name}}"}</code>,{" "}
                <code>{"{{ad.id}}"}</code>, <code>{"{{ad.name}}"}</code>,{" "}
                <code>{"{{placement}}"}</code>.
              </p>
            </div>

            {result && (
              <div className={`rounded-md border p-3 text-2xs ${result.failed === 0 ? "border-positive/30 bg-positive-subtle/15" : "border-warning/30 bg-warning-subtle/15"}`}>
                <p className="font-medium text-ink flex items-center gap-1.5">
                  {result.failed === 0
                    ? <><CheckCircle2 className="size-3.5 text-positive" />UTMs aplicadas</>
                    : <><AlertTriangle className="size-3.5 text-warning" />Concluído com erros</>}
                </p>
                <p className="text-ink-muted mt-1">
                  Total de anúncios: {result.total_ads} · Sucesso: {result.success} · Falhas: {result.failed}
                </p>
                {result.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-ink-muted cursor-pointer">Ver erros</summary>
                    <ul className="mt-1.5 space-y-0.5 font-mono text-2xs">
                      {result.errors.map((e: any, i: number) => (
                        <li key={i}>· {e.id}: {e.message}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              {result ? "Fechar" : "Cancelar"}
            </Button>
            {!result && (
              <Button variant="primary" onClick={apply} disabled={busy || !template.trim()}>
                {busy ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Tag className="size-4 mr-1" />}
                Aplicar agora
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
