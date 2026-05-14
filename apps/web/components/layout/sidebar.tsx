"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Megaphone,
  Rocket,
  Users2,
  Link2,
  FileBarChart,
  BarChart3,
  Cog,
  Bell,
  Plug,
  UserCog,
  PlayCircle,
  MessageCircle,
  Sparkles,
  CreditCard,
  Gift,
  Phone,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

// Três grupos conforme spec § 3
const PRIMARY: Item[] = [
  { href: "/central",            label: "Central de Contas",   icon: LayoutDashboard },
  { href: "/saldo",              label: "Monitorar Saldo",     icon: Wallet },
  { href: "/",                   label: "Meta Ads",            icon: Megaphone },
  { href: "/editor",             label: "Meta Ads Editor",     icon: Rocket, badge: "Flagship" },
  { href: "/audiences",          label: "Criar Públicos",      icon: Users2 },
  { href: "/criativos",          label: "Análise de Criativos", icon: BarChart3 },
  { href: "/integracoes",        label: "Integrações UTMs",    icon: Link2 },
  { href: "/reports",            label: "Relatórios",          icon: FileBarChart },
  { href: "/regras",             label: "Regras Automatizadas", icon: Cog },
  { href: "/alerts",             label: "Alertas",             icon: Bell },
  { href: "/connect",            label: "Conectar Meta",       icon: Plug },
  { href: "/equipe",             label: "Equipe",              icon: UserCog },
];

const SECONDARY: Item[] = [
  { href: "/tutoriais", label: "Tutoriais",          icon: PlayCircle },
  { href: "/billing",   label: "Minha Assinatura",   icon: CreditCard },
];

const FOOTER: Item[] = [
  { href: "/comunidade", label: "Comunidade WhatsApp", icon: Phone },
  { href: "/logout",     label: "Sair",                icon: LogOut },
];

export function Sidebar({ onMobileClose }: { onMobileClose?: () => void } = {}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  // Em mobile drawer, sempre expandida e fecha ao clicar num item
  const isMobile = !!onMobileClose;

  // Persist collapse preference
  React.useEffect(() => {
    const stored = localStorage.getItem("sidebar:collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar:collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={250}>
      <aside
        className={cn(
          "relative z-30 flex h-screen flex-col shrink-0 border-r border-line vibrancy-strong",
          "transition-[width] duration-300 ease-spring bg-bg-base",
          isMobile ? "w-[260px]" : (collapsed ? "w-[64px]" : "w-[240px]")
        )}
      >
        {/* Brand — macOS-style mais leve */}
        <div className="flex h-14 items-center gap-2.5 px-4">
          <div className="grid place-items-center size-7 rounded-lg bg-accent text-ink-inverse shrink-0 shadow-elev-1">
            <Logo className="size-3.5" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <div className="text-sm font-semibold tracking-tight leading-none text-ink">
                Ad Manager
              </div>
              <div className="text-2xs text-ink-dim mt-1 font-normal">
                Plano Pro
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <Group items={PRIMARY} pathname={pathname} collapsed={isMobile ? false : collapsed} />
          <div className="my-2 mx-3 h-px bg-line" />
          <Group items={SECONDARY} pathname={pathname} collapsed={isMobile ? false : collapsed} />
        </div>

        {/* Footer */}
        <div className="py-2 border-t border-line">
          <Group items={FOOTER} pathname={pathname} collapsed={isMobile ? false : collapsed} muted />
        </div>

        {/* Collapse toggle — só desktop */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="absolute -right-3 top-[52px] size-6 rounded-full border border-line bg-bg-surface text-ink-muted hover:text-ink hover:bg-bg-elevated shadow-elev-1 transition-all duration-200 grid place-items-center cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen className="size-3" /> : <PanelLeftClose className="size-3" />}
          </button>
        )}
      </aside>
    </TooltipProvider>
  );
}

function Group({
  items,
  pathname,
  collapsed,
  muted = false,
}: {
  items: Item[];
  pathname: string;
  collapsed: boolean;
  muted?: boolean;
}) {
  return (
    <nav className="px-2 flex flex-col gap-px" role="navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
        const link = (
          <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 h-8 rounded-md px-2.5 text-sm font-medium",
              "transition-colors duration-150",
              collapsed && "justify-center px-0",
              // Apple-style: item ativo tem fundo accent suave; hover é fundo neutro
              active
                ? "bg-accent text-ink-inverse shadow-elev-1"
                : "text-ink-muted hover:bg-bg-elevated hover:text-ink",
              muted && !active && "text-ink-dim hover:text-ink-muted"
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-ink-inverse" : "text-ink-dim group-hover:text-ink-muted"
              )}
            />
            {!collapsed && (
              <>
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && !active && (
                  <span className="text-2xs px-1.5 h-4 rounded-md bg-accent-subtle text-accent border border-accent/30 leading-none flex items-center font-medium">
                    {item.badge}
                  </span>
                )}
                {item.badge && active && (
                  <span className="text-2xs px-1.5 h-4 rounded-md bg-white/25 text-ink-inverse leading-none flex items-center font-medium">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
            </Tooltip>
          );
        }
        return <React.Fragment key={item.href}>{link}</React.Fragment>;
      })}
    </nav>
  );
}

function Logo({ className }: { className?: string }) {
  // Marca proprietária: dois traços que sugerem "play" + "barra" (ad + escala).
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M3 4.2 L3 11.8" />
      <path d="M7 6.5 L7 9.5" />
      <path d="M11 3 L13 8 L11 13" fill="currentColor" stroke="none" />
    </svg>
  );
}
