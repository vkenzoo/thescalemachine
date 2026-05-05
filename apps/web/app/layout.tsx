import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { PrivacyProvider } from "@/lib/privacy";

export const metadata: Metadata = {
  title: {
    default: "Ad Manager — Gestão de tráfego",
    template: "%s · Ad Manager",
  },
  description:
    "Gerencie Meta Ads em uma interface mais ágil que o gerenciador nativo. Edição em massa, regras automatizadas, monitoramento de saldo, atribuição UTM cruzada.",
  applicationName: "Ad Manager",
  authors: [{ name: "Ad Manager" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

/**
 * Script que roda ANTES da hidratação React, no `<head>`.
 * Lê a preferência salva e aplica .dark imediatamente — sem FOUC (flash of unstyled content).
 * Padrão usado por next-themes, vercel.com, linear, etc.
 */
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = t === 'dark' || (!t && systemDark);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Sem flash de tema na primeira renderização */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {/*
        Tipografia: usamos a stack do sistema operacional.
        No macOS/iOS = SF Pro automaticamente, sem download.
        No Windows = Segoe UI; Android = Roboto. Mapeado em tailwind.config.ts.
        Sem next/font porque queremos exatamente o look-and-feel do SO.
      */}
      <body className="antialiased font-sans">
        <PrivacyProvider>
          <ToastProvider>{children}</ToastProvider>
        </PrivacyProvider>
      </body>
    </html>
  );
}
