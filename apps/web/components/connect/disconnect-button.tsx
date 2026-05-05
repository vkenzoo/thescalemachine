"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DisconnectButton({ connectionId }: { connectionId: string }) {
  const { push } = useToast();
  const [loading, setLoading] = React.useState(false);

  const onClick = async () => {
    if (!confirm("Desconectar essa conta? As ad accounts vão sumir do app, mas o token continua valido no Meta.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/meta/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        push({ tone: "error", title: "Erro ao desconectar", description: data.error });
        return;
      }
      push({ tone: "info", title: "Conexão revogada" });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" aria-label="Desconectar" onClick={onClick} loading={loading}>
      <Trash2 />
    </Button>
  );
}
