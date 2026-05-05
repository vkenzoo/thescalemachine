"use client";

import * as React from "react";
import { Lock, Trash2, ShieldAlert, Wand2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";

export function MyAccountModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { push } = useToast();
  const [pwd, setPwd] = React.useState("");

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    const len = 16;
    let out = "";
    for (let i = 0; i < len; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    setPwd(out);
    push({ tone: "info", title: "Senha gerada", description: "Cole em um gerenciador antes de salvar." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Minha Conta</DialogTitle>
          <DialogDescription>Atualize seus dados pessoais e senha.</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nome completo</Label>
            <Input id="acc-name" defaultValue="Vinny Kenzo" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">E-mail</Label>
              <Input id="acc-email" type="email" defaultValue="vinnykenzo@gmail.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-phone">Telefone</Label>
              <Input id="acc-phone" type="tel" defaultValue="+55 31 9 9999-9999" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><Lock className="size-3" /> Trocar senha</Label>
              <button
                type="button"
                onClick={generatePassword}
                className="inline-flex items-center gap-1 text-2xs text-accent hover:underline cursor-pointer font-medium"
              >
                <Wand2 className="size-3" /> Gerar segura
              </button>
            </div>
            <Input
              type="text"
              placeholder="Nova senha"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              mono
            />
            <p className="text-2xs text-ink-dim">Deixe em branco se não quiser trocar.</p>
          </div>

          <Separator />

          {/* Zona de Perigo */}
          <div className="rounded-md border border-negative/30 bg-negative-subtle/20 p-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="size-4 text-negative shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-negative">Zona de Perigo</p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Excluir sua conta apaga permanentemente todas as campanhas locais, regras, relatórios e tokens conectados. Não reversível.
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-negative hover:underline cursor-pointer"
                >
                  <Trash2 className="size-3.5" /> Excluir minha conta permanentemente
                </button>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              push({ tone: "success", title: "Conta atualizada" });
              onOpenChange(false);
            }}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
