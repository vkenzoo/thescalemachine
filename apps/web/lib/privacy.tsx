"use client";

import * as React from "react";

interface PrivacyState {
  enabled: boolean;
  toggle: () => void;
  /**
   * Mascara um nome quando o modo privado está ativo.
   * Ex: "ROI Brasil — Black Friday" → "Conta ████ ████ ███████"
   */
  mask: (text: string) => string;
}

const Ctx = React.createContext<PrivacyState | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("privacy");
    if (stored === "1") setEnabled(true);
  }, []);

  const toggle = React.useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      localStorage.setItem("privacy", next ? "1" : "0");
      return next;
    });
  }, []);

  const mask = React.useCallback(
    (text: string) => {
      if (!enabled || !text) return text;
      // Substitui letras/números por bloco preservando espaços e pontuação.
      return text.replace(/[\w\dÀ-ÿ]/g, "█");
    },
    [enabled]
  );

  return <Ctx.Provider value={{ enabled, toggle, mask }}>{children}</Ctx.Provider>;
}

export function usePrivacy(): PrivacyState {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("usePrivacy must be used within <PrivacyProvider>");
  return ctx;
}

/**
 * Componente helper: renderiza texto mascarado conforme o modo de privacidade.
 */
export function Private({ children }: { children: string }) {
  const { mask } = usePrivacy();
  return <>{mask(children)}</>;
}
