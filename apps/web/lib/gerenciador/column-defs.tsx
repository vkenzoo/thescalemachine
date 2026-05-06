"use client";

import * as React from "react";
import { brl, num, pct } from "@/lib/format";
import type { MetaCampaignRow, MetaAdsetRow, MetaAdRow } from "@/lib/hooks/use-meta";

/**
 * Definições centralizadas das colunas disponíveis no Gerenciador.
 *
 * Cada column id (METRIC id) tem:
 *  - header: rótulo curto pra THEAD
 *  - sortKey: campo da row pra ordenação (opcional — sem isso, header não é clicável)
 *  - width: largura default em px
 *  - format: como formatar o valor de uma row
 *
 * As 3 tabelas (campaign/adset/ad) compartilham esse registry. Diferenças
 * entre os tipos vão no campo `format` que recebe a row inteira.
 */

export type AnyRow = MetaCampaignRow | MetaAdsetRow | MetaAdRow;

export interface ColumnDef {
  id: string;
  header: string;
  width: number;
  align?: "left" | "right";
  /** Campo da row pra usar como sortKey (caso suportado pela tabela) */
  sortKey?: string;
  /** Renderiza o valor pra uma row */
  format: (row: AnyRow) => React.ReactNode;
}

const m = (v: any) => <span className="num">{v}</span>;

export const COLUMN_DEFS: Record<string, ColumnDef> = {
  // Core
  spend: {
    id: "spend", header: "Investido", width: 120, sortKey: "spend",
    format: (r) => m(brl((r as any).spend ?? 0)),
  },
  budget: {
    id: "budget", header: "Orçamento", width: 110,
    format: (r) => {
      const c = r as any;
      if (c.budgetType === "ABO") return <span className="text-ink-muted">ABO</span>;
      return m(brl(c.dailyBudget ?? 0));
    },
  },
  impressions: {
    id: "impressions", header: "Impressões", width: 110, sortKey: "impressions",
    format: (r) => m(num((r as any).impressions ?? 0)),
  },
  reach: {
    id: "reach", header: "Alcance", width: 110, sortKey: "reach",
    format: (r) => m(num((r as any).reach ?? 0)),
  },
  frequency: {
    id: "frequency", header: "Frequência", width: 90,
    format: (r) => m(((r as any).frequency ?? 0).toFixed(2)),
  },
  clicks: {
    id: "clicks", header: "Cliques", width: 90, sortKey: "clicks",
    format: (r) => m(num((r as any).clicks ?? 0)),
  },
  ctr: {
    id: "ctr", header: "CTR", width: 80, sortKey: "ctr",
    format: (r) => m(pct((r as any).ctr ?? 0)),
  },
  cpc: {
    id: "cpc", header: "CPC", width: 90, sortKey: "cpc",
    format: (r) => m(brl((r as any).cpc ?? 0)),
  },
  cpm: {
    id: "cpm", header: "CPM", width: 90, sortKey: "cpm",
    format: (r) => m(brl((r as any).cpm ?? 0)),
  },

  // Conversão
  purchases: {
    id: "purchases", header: "Compras", width: 90, sortKey: "purchases",
    format: (r) => m(num((r as any).purchases ?? 0)),
  },
  cpa: {
    id: "cpa", header: "Custo/Compra", width: 130, sortKey: "cpa",
    format: (r) => {
      const v = (r as any).cpa ?? 0;
      return m(v > 0 ? brl(v) : "—");
    },
  },
  revenue: {
    id: "revenue", header: "Receita Pixel", width: 140, sortKey: "revenue",
    format: (r) => m(brl((r as any).revenue ?? 0)),
  },
  roas: {
    id: "roas", header: "ROAS Pixel", width: 100, sortKey: "roas",
    format: (r) => m(((r as any).roas ?? 0).toFixed(2) + "×"),
  },
  leads: {
    id: "leads", header: "Leads", width: 80,
    format: (r) => m(num((r as any).leads ?? 0)),
  },
  cpl: {
    id: "cpl", header: "Custo/Lead", width: 130,
    format: (r) => {
      const v = (r as any).cpl ?? 0;
      return m(v > 0 ? brl(v) : "—");
    },
  },
  cart_adds: {
    id: "cart_adds", header: "Carrinhos", width: 100,
    format: (r) => m(num((r as any).cartAdds ?? 0)),
  },
  cp_cart: {
    id: "cp_cart", header: "Custo/Carrinho", width: 140,
    format: (r) => {
      const v = (r as any).cpCart ?? 0;
      return m(v > 0 ? brl(v) : "—");
    },
  },
  checkouts: {
    id: "checkouts", header: "Finalizações", width: 110,
    format: (r) => m(num((r as any).checkouts ?? 0)),
  },
  cp_checkout: {
    id: "cp_checkout", header: "Custo/Finalização", width: 150,
    format: (r) => {
      const v = (r as any).cpCheckout ?? 0;
      return m(v > 0 ? brl(v) : "—");
    },
  },

  // Messaging
  messages: {
    id: "messages", header: "Mensagens", width: 110,
    format: (r) => m(num((r as any).messages ?? 0)),
  },
  cp_message: {
    id: "cp_message", header: "Custo/Mensagem", width: 150,
    format: (r) => {
      const v = (r as any).cpMessage ?? 0;
      return m(v > 0 ? brl(v) : "—");
    },
  },

  // Instagram
  ig_visits: {
    id: "ig_visits", header: "Visitas IG", width: 110,
    format: (r) => m(num((r as any).igVisits ?? 0)),
  },
  cp_ig_visit: {
    id: "cp_ig_visit", header: "Custo/Visita IG", width: 140,
    format: (r) => {
      const v = (r as any).cpIg ?? 0;
      return m(v > 0 ? brl(v) : "—");
    },
  },
};

/** Default quando user nunca personalizou */
export const DEFAULT_COLUMNS = [
  "spend", "budget", "purchases", "cpa", "roas", "revenue", "ctr", "cpc", "cpm",
];

/**
 * Resolve uma lista de column ids em ColumnDefs válidos. Ignora ids desconhecidos.
 */
export function resolveColumns(ids: string[]): ColumnDef[] {
  return ids.map((id) => COLUMN_DEFS[id]).filter(Boolean);
}
