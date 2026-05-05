/**
 * Formatadores BR — usados em toda tabela de métricas.
 * Tabular nums + locale pt-BR + espacamento garantido pra alinhamento.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRLCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const NUM = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const NUM2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function brl(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return BRL.format(value);
}

export function brlCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return BRLCompact.format(value);
}

export function num(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return NUM.format(value);
}

export function num2(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return NUM2.format(value);
}

export function pct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return PCT.format(value);
}

/**
 * Telefone BR no formato +55 31 9 9999-9999.
 */
export function phoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 13) return raw;
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
}

/**
 * Mascarar token longo deixando só os 4 últimos visíveis.
 */
export function maskToken(token: string, visible = 4): string {
  if (!token) return "";
  if (token.length <= visible) return "•".repeat(token.length);
  return "•".repeat(Math.min(28, token.length - visible)) + token.slice(-visible);
}
