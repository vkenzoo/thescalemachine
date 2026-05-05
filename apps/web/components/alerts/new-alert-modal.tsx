"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createAlert } from "@/lib/hooks/use-automation";
import { useMetaAccounts } from "@/lib/hooks/use-meta";

const METRICS = [
  { id: "cpa",   label: "CPA (custo por compra)" },
  { id: "cpc",   label: "CPC" },
  { id: "cpm",   label: "CPM" },
  { id: "ctr",   label: "CTR" },
  { id: "spend", label: "Gasto diário" },
  { id: "roas",  label: "ROAS" },
];

const OPS = [
  { id: "gt",  label: "Maior que (>)",       natural: "passar de" },
  { id: "lt",  label: "Menor que (<)",       natural: "ficar abaixo de" },
  { id: "gte", label: "Maior ou igual (≥)",  natural: "atingir" },
  { id: "lte", label: "Menor ou igual (≤)",  natural: "cair até" },
  { id: "eq",  label: "Igual a (=)",         natural: "for igual a" },
];

export function NewAlertModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void | Promise<void>;
}) {
  const { push } = useToast();
  const { accounts } = useMetaAccounts();
  const [metric, setMetric] = React.useState("cpa");
  const [op, setOp] = React.useState("gt");
  const [value, setValue] = React.useState("");
  const [account, setAccount] = React.useState("all");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMetric("cpa");
      setOp("gt");
      setValue("");
      setAccount("all");
      setSaving(false);
    }
  }, [open]);

  const selectedMetric = METRICS.find((m) => m.id === metric);
  const selectedOp = OPS.find((o) => o.id === op);
  const accountLabel = account === "all"
    ? "qualquer conta"
    : accounts.find((a) => a.account_id === account)?.name ?? account;

  const canSubmit = !!value && !isNaN(parseFloat(value)) && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createAlert({
        metric,
        op,
        value: parseFloat(value),
        account_filter: account,
      });
      push({ tone: "success", title: "Alerta criado", description: "Vai disparar na próxima checagem." });
      await onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao salvar", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo alerta</DialogTitle>
          <DialogDescription>
            Receba notificação por sino e e-mail quando alguma métrica passar do limite.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alert-metric">Qual métrica monitorar</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger id="alert-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_1.2fr] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="alert-op">Quando ela</Label>
              <Select value={op} onValueChange={setOp}>
                <SelectTrigger id="alert-op">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-value">Valor limite</Label>
              <Input
                id="alert-value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex: 50.00"
                step="0.01"
                mono
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="alert-account">Em qual conta</Label>
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger id="alert-account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.account_id} value={a.account_id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-2xs text-ink-dim">
              "Todas as contas" monitora tudo de uma vez. Só dispara um alerta por conta que ultrapassar.
            </p>
          </div>

          {/* Preview em linguagem natural */}
          <div className="rounded-lg border border-warning/30 bg-warning-subtle/20 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-warning" />
              <p className="text-2xs font-semibold uppercase tracking-wider text-warning">
                Como vai funcionar
              </p>
            </div>
            <p className="text-sm text-ink leading-relaxed">
              Avisa quando{" "}
              <span className="font-medium">{selectedMetric?.label.toLowerCase()}</span>{" "}
              <span className="font-medium">{selectedOp?.natural}</span>{" "}
              <span className="font-medium num">{value || "—"}</span>{" "}
              em <span className="font-medium">{accountLabel}</span>.
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            loading={saving}
            onClick={handleSubmit}
          >
            Salvar alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
