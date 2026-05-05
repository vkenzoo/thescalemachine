"use client";

import * as React from "react";
import { Pin, Calendar, Loader2, Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Meta account_id (act_xxx) — usado pra GET/PUT. Quando null/vazio, drawer não tenta carregar. */
  accountId?: string | null;
  /** Nome amigável só pra display */
  accountName?: string;
}

type SaveState = "idle" | "saving" | "saved";

export function AccountNotesDrawer({ open, onOpenChange, accountId, accountName }: Props) {
  const { push } = useToast();
  const swrKey = open && accountId ? `/api/account-notes/${accountId}` : null;
  const { data, mutate } = useSWR<{ note: string; updated_at: string | null }>(
    swrKey,
    fetcher,
    SWR_CONFIG
  );

  const [text, setText] = React.useState("");
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const initialLoadedRef = React.useRef(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega o texto quando o GET resolve (só uma vez por abertura)
  React.useEffect(() => {
    if (data && !initialLoadedRef.current) {
      setText(data.note ?? "");
      initialLoadedRef.current = true;
    }
  }, [data]);

  // Reset ao fechar
  React.useEffect(() => {
    if (!open) {
      initialLoadedRef.current = false;
      setSaveState("idle");
      if (debounceRef.current) clearTimeout(debounceRef.current);
    }
  }, [open]);

  // Auto-save com debounce 600ms quando o texto muda (após o load inicial)
  React.useEffect(() => {
    if (!open || !accountId || !initialLoadedRef.current) return;
    if (text === (data?.note ?? "")) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/account-notes/${accountId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ note: text }),
        });
        if (!res.ok) throw new Error("falha");
        await mutate();
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch (e: any) {
        setSaveState("idle");
        push({ tone: "danger", title: "Erro ao salvar nota", description: e.message });
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, open, accountId, data, mutate, push]);

  const lastEdit = data?.updated_at
    ? formatRelative(data.updated_at)
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader eyebrow="Notas da conta">{accountName ?? "Conta"}</DrawerHeader>
        <DrawerBody className="space-y-4">
          <div className="flex items-center justify-between gap-2 text-2xs">
            <span className="text-ink-dim flex items-center gap-1.5">
              <Calendar className="size-3" />
              {lastEdit ? `Última edição ${lastEdit}` : "Sem notas anteriores"}
            </span>
            <SaveStatus state={saveState} />
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="font-mono text-xs leading-relaxed"
            placeholder="Anote contexto, decisões, alertas — fica vinculado a essa conta e salva sozinho enquanto você digita."
          />

          <div className="rounded-md bg-bg-elevated border border-line p-3 text-xs text-ink-muted">
            <div className="flex items-start gap-2">
              <Pin className="size-3.5 shrink-0 mt-0.5 text-accent" />
              <div>
                As notas ficam vinculadas a essa conta e aparecem no header do <span className="text-ink font-medium">Gerenciador</span> quando ela está selecionada.
              </div>
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-2xs font-medium transition-colors",
      state === "saving" && "text-ink-muted",
      state === "saved" && "text-positive",
      state === "idle" && "text-ink-dim opacity-50"
    )}>
      {state === "saving" && <><Loader2 className="size-3 animate-spin" /> Salvando…</>}
      {state === "saved" && <><Check className="size-3" /> Salvo</>}
      {state === "idle" && <span>Salvamento automático</span>}
    </span>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const days = Math.floor(hr / 24);
  return `${days}d atrás`;
}
