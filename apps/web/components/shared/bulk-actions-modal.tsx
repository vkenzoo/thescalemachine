"use client";

import * as React from "react";
import {
  Pause,
  Play,
  DollarSign,
  Copy,
  Type,
  Link as LinkIcon,
  MessageCircle,
  Cake,
  UserCircle,
  Trash2,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioOption } from "@/components/ui/radio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNTS_FULL } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const ACTIONS = [
  { id: "pause",      label: "Pausar",            icon: Pause,        tone: "neutral" as const },
  { id: "activate",   label: "Ativar",            icon: Play,         tone: "positive" as const },
  { id: "budget",     label: "Alterar orçamento", icon: DollarSign,   tone: "accent" as const },
  { id: "duplicate",  label: "Duplicar",          icon: Copy,         tone: "neutral" as const },
  { id: "name",       label: "Editar nome",       icon: Pencil,       tone: "neutral" as const },
  { id: "text",       label: "Editar texto",      icon: Type,         tone: "neutral" as const },
  { id: "url",        label: "Editar URL",        icon: LinkIcon,     tone: "neutral" as const },
  { id: "whatsapp",   label: "WhatsApp",          icon: MessageCircle, tone: "neutral" as const },
  { id: "age",        label: "Idade",             icon: Cake,         tone: "neutral" as const },
  { id: "gender",     label: "Gênero",            icon: UserCircle,   tone: "neutral" as const },
  { id: "delete",     label: "Excluir",           icon: Trash2,       tone: "negative" as const },
] as const;

type ActionId = typeof ACTIONS[number]["id"];

const BUDGET_PRESETS = [10, 15, 25, 35];

export function BulkActionsModal({
  open,
  onOpenChange,
  selectedCount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
}) {
  const { push } = useToast();
  const [action, setAction] = React.useState<ActionId>("pause");
  const [budgetMode, setBudgetMode] = React.useState<"increase" | "decrease" | "set">("increase");
  const [budgetUnit, setBudgetUnit] = React.useState<"pct" | "abs">("pct");
  const [budgetValue, setBudgetValue] = React.useState<string>("25");
  const [duplicateTarget, setDuplicateTarget] = React.useState<"same" | "other">("same");
  const [duplicateAsActive, setDuplicateAsActive] = React.useState(false);
  const [findText, setFindText] = React.useState("");
  const [replaceText, setReplaceText] = React.useState("");

  const Icon = ACTIONS.find((a) => a.id === action)!.icon;

  const apply = () => {
    push({
      tone: "success",
      title: `Ação aplicada em ${selectedCount} ${selectedCount > 1 ? "itens" : "item"}`,
      description: `${ACTIONS.find((a) => a.id === action)!.label} executada com sucesso.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edições em Massa</DialogTitle>
          <DialogDescription>
            Aplicar ação em <strong className="text-accent num">{selectedCount}</strong>{" "}
            {selectedCount > 1 ? "itens selecionados" : "item selecionado"}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Action picker — grid of icon-cards */}
          <div className="space-y-2">
            <Label>Escolher ação</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIONS.map((a) => {
                const ItemIcon = a.icon;
                const isActive = action === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAction(a.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-md border transition-colors cursor-pointer",
                      isActive
                        ? a.tone === "negative"
                          ? "border-negative/40 bg-negative-subtle/30 text-negative"
                          : a.tone === "positive"
                          ? "border-positive/40 bg-positive-subtle/30 text-positive"
                          : "border-accent/40 bg-accent-subtle/30 text-accent"
                        : "border-line bg-bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
                    )}
                  >
                    <ItemIcon className="size-4" />
                    <span className="text-2xs font-medium">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action-specific config */}
          <div className="rounded-md border border-line bg-bg-inset p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3.5">
              <Icon className="size-3.5 text-accent" />
              <p className="text-xs font-semibold text-ink uppercase tracking-wider">Configuração</p>
            </div>

            {action === "pause" && (
              <p className="text-sm text-ink-muted leading-relaxed">
                Os itens selecionados serão pausados imediatamente. Você pode reativar depois pela mesma ação em massa.
              </p>
            )}

            {action === "activate" && (
              <p className="text-sm text-ink-muted leading-relaxed">
                Os itens selecionados serão ativados. Verifique se cada um tem orçamento configurado para começar a veicular.
              </p>
            )}

            {action === "delete" && (
              <div className="text-sm text-negative leading-relaxed">
                <p className="font-medium">Atenção: ação irreversível.</p>
                <p className="text-ink-muted mt-1">
                  Os itens serão removidos permanentemente do Meta. Esse comportamento não pode ser desfeito.
                </p>
              </div>
            )}

            {action === "budget" && (
              <div className="space-y-3">
                <RadioGroup value={budgetMode} onChange={(v) => setBudgetMode(v as any)} layout="inline">
                  <RadioOption value="increase" label="Aumentar" />
                  <RadioOption value="decrease" label="Diminuir" />
                  <RadioOption value="set" label="Definir fixo" />
                </RadioGroup>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    type="number"
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(e.target.value)}
                    placeholder="Valor"
                    mono
                  />
                  <div className="inline-flex rounded-md border border-line bg-bg-surface overflow-hidden">
                    {(["pct", "abs"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setBudgetUnit(u)}
                        className={cn(
                          "px-3 text-xs font-medium transition-colors cursor-pointer",
                          budgetUnit === u ? "bg-accent text-ink-inverse" : "text-ink-muted hover:text-ink hover:bg-bg-elevated"
                        )}
                      >
                        {u === "pct" ? "%" : "R$"}
                      </button>
                    ))}
                  </div>
                </div>
                {budgetUnit === "pct" && budgetMode !== "set" && (
                  <div className="flex gap-1.5">
                    {BUDGET_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBudgetValue(String(p))}
                        className="h-7 px-2.5 rounded-md text-xs font-mono border border-line bg-bg-surface text-ink-muted hover:bg-bg-elevated hover:text-ink transition-colors cursor-pointer"
                      >
                        {budgetMode === "increase" ? "+" : "−"}{p}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {action === "duplicate" && (
              <div className="space-y-3">
                <RadioGroup value={duplicateTarget} onChange={(v) => setDuplicateTarget(v as any)}>
                  <RadioOption value="same" label="Mesma conta" description="Mantém estrutura idêntica, adiciona sufixo (1), (2) etc nos nomes." />
                  <RadioOption value="other" label="Outra conta" description="Copia campanha + conjuntos + anúncios para outra ad account selecionada abaixo." />
                </RadioGroup>
                {duplicateTarget === "other" && (
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar conta destino…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS_FULL.filter((a) => a.platform === "meta").map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                  <Checkbox checked={duplicateAsActive} onCheckedChange={(v) => setDuplicateAsActive(!!v)} />
                  Duplicar como <strong className="text-ink font-medium">ativo</strong> (default: pausado)
                </label>
              </div>
            )}

            {action === "name" && (
              <div className="space-y-3">
                <p className="text-xs text-ink-muted">
                  <Sparkles className="size-3 inline -mt-0.5 text-accent" /> Localizar e Substituir nos nomes selecionados.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Encontrar</Label>
                    <Input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Ex: AD01" mono />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Substituir por</Label>
                    <Input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Ex: AD-Black" mono />
                  </div>
                </div>
                {findText && (
                  <div className="rounded-md bg-bg-surface border border-line p-2.5 text-2xs text-ink-muted font-mono">
                    Pré-visualização: "AD01 - Black Friday" → "{replaceText || "_"} - Black Friday"
                  </div>
                )}
              </div>
            )}

            {action === "text" && (
              <div className="space-y-1.5">
                <Label>Novo texto principal (substitui em todos)</Label>
                <Textarea rows={4} placeholder="Cole aqui o novo texto…" />
              </div>
            )}

            {action === "url" && (
              <div className="space-y-1.5">
                <Label>Nova URL</Label>
                <Input type="url" placeholder="https://seusite.com/lp-nova" mono />
                <p className="text-2xs text-ink-dim">Aplica em todos os anúncios selecionados. UTMs do anúncio são preservados.</p>
              </div>
            )}

            {action === "whatsapp" && (
              <div className="space-y-1.5">
                <Label>Novo número de WhatsApp</Label>
                <Input type="tel" placeholder="+55 31 9 9999-9999" mono />
                <p className="text-2xs text-ink-dim">Para anúncios de Click-to-WhatsApp.</p>
              </div>
            )}

            {action === "age" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Idade mínima</Label>
                  <Select defaultValue="18">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[18, 21, 25, 30, 35, 40, 45].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} anos</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Idade máxima</Label>
                  <Select defaultValue="65">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[35, 45, 55, 65, 99].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n === 99 ? "65+" : `${n} anos`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {action === "gender" && (
              <RadioGroup value="all" onChange={() => {}} layout="inline">
                <RadioOption value="all" label="Todos" />
                <RadioOption value="m" label="Masculino" />
                <RadioOption value="f" label="Feminino" />
              </RadioGroup>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant={action === "delete" ? "destructive" : "primary"}
            onClick={apply}
          >
            Aplicar em {selectedCount} {selectedCount > 1 ? "itens" : "item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
