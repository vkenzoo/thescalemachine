"use client";

import * as React from "react";
import { Plus, Mail, MoreHorizontal, Crown, Lock, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { MOCK_TEAM } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

// Mude para "starter" para ver a versão paywall
const CURRENT_PLAN: "starter" | "pro" | "business" = "pro";

export default function EquipePage() {
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);

  if (CURRENT_PLAN === ("starter" as any)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-5">
        <div className="size-20 rounded-2xl bg-accent-subtle text-accent grid place-items-center mx-auto">
          <Lock className="size-9" />
        </div>
        <p className="eyebrow text-accent">Recurso Pro+</p>
        <h1 className="font-display text-4xl text-ink tracking-tight balance">
          Convide sua equipe para gerenciar contas com você.
        </h1>
        <p className="text-md text-ink-muted max-w-md mx-auto leading-relaxed pretty">
          Disponível a partir do plano <strong className="text-ink">Pro</strong> (3 usuários) e ilimitado nos planos Business e Enterprise.
        </p>
        <Link href="/billing?upgrade=equipe" className="inline-block">
          <Button variant="primary" size="lg">
            <Sparkles /> Fazer upgrade para Pro
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Conta"
        title="Equipe"
        description="Convide membros para acessar e gerenciar contas com você. Cada membro tem um role com permissões diferentes."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus /> Convidar membro
          </Button>
        }
      />

      <div className="flex items-center gap-2 text-2xs text-ink-dim">
        <Users2 className="size-3.5" />
        <span>{MOCK_TEAM.length} de <strong className="text-ink">3 vagas</strong> usadas no plano Pro</span>
      </div>

      <div className="rounded-lg border border-line bg-bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-inset/50">
              <th className="px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-wider text-ink-dim">Membro</th>
              <th className="px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-wider text-ink-dim">Role</th>
              <th className="px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-wider text-ink-dim">Status</th>
              <th className="px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-wider text-ink-dim">Adicionado</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {MOCK_TEAM.map((m) => (
              <tr key={m.id} className="border-b border-line/60 last:border-b-0 hover:bg-bg-inset/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-accent-subtle text-accent grid place-items-center font-mono font-semibold text-2xs">
                      {m.initials}
                    </div>
                    <div>
                      <div className="text-ink font-medium">{m.name}</div>
                      <div className="text-2xs text-ink-dim font-mono">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {m.role === "admin" ? (
                    <Badge tone="accent" size="xs"><Crown className="size-2.5" /> Admin</Badge>
                  ) : m.role === "editor" ? (
                    <Badge tone="info" size="xs">Editor</Badge>
                  ) : (
                    <Badge tone="neutral" size="xs">Viewer</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={m.status === "active" ? "positive" : "warning"} size="xs" dot>
                    {m.status === "active" ? "Ativo" : "Convite pendente"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-2xs text-ink-dim font-mono">
                  {m.invitedAt ?? "membro inicial"}
                </td>
                <td className="px-4 py-3">
                  <button className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer">
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
            <DialogDescription>Enviamos um link por e-mail para entrar na sua equipe.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input id="invite-email" type="email" placeholder="colega@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Permissão</Label>
              <Select defaultValue="editor">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — acesso total</SelectItem>
                  <SelectItem value="editor">Editor — edita campanhas e regras</SelectItem>
                  <SelectItem value="viewer">Viewer — só leitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => {
              push({ tone: "success", title: "Convite enviado", description: "O destinatário recebe um e-mail em segundos." });
              setOpen(false);
            }}>
              <Mail /> Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
