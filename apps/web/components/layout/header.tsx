"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Sun,
  Moon,
  Languages,
  ChevronDown,
  Settings,
  HelpCircle,
  CreditCard,
  LogOut,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { usePrivacy } from "@/lib/privacy";
import { useNotifications, markAllNotificationsRead, type Notification } from "@/lib/hooks/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

// Mapeia rota → (categoria, título). Centralizado pra um lugar.
const ROUTE_META: Record<string, { breadcrumb: string; title: string }> = {
  "/":                   { breadcrumb: "Tráfego",    title: "Gerenciador Meta Ads" },
  "/central":            { breadcrumb: "Tráfego",    title: "Central de Contas" },
  "/saldo":              { breadcrumb: "Operação",   title: "Monitor de Saldo" },
  "/editor":             { breadcrumb: "Operação",   title: "Meta Ads Editor — Publicação em Massa" },
  "/audiences":          { breadcrumb: "Operação",   title: "Criar Públicos" },
  "/integracoes":        { breadcrumb: "Operação",   title: "Integrações UTMs" },
  "/reports":            { breadcrumb: "Análise",    title: "Relatórios" },
  "/regras":             { breadcrumb: "Automação",  title: "Regras Automatizadas" },
  "/alerts":             { breadcrumb: "Automação",  title: "Alertas de Métricas" },
  "/connect":            { breadcrumb: "Integrações", title: "Conectar Meta" },
  "/equipe":             { breadcrumb: "Conta",      title: "Equipe" },
  "/tutoriais":          { breadcrumb: "Suporte",    title: "Tutoriais" },
  "/feedback":           { breadcrumb: "Suporte",    title: "Feedback" },
  "/novidades":          { breadcrumb: "Suporte",    title: "Novidades" },
  "/billing":            { breadcrumb: "Conta",      title: "Minha Assinatura" },
  "/afiliado":           { breadcrumb: "Conta",      title: "Indique e Ganhe" },
};

export function Header() {
  const pathname = usePathname();
  const meta = ROUTE_META[pathname] ?? { breadcrumb: "Ad Manager", title: pathname };

  return (
    <header className="sticky top-0 z-20 h-14 flex items-center gap-4 border-b border-line vibrancy px-6">
      {/* Breadcrumb / título — Apple usa sentence case sem caps tracked-out */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-ink-dim">
          {meta.breadcrumb}
        </span>
        <span className="text-ink-dim/60">/</span>
        <h1 className="text-sm font-semibold text-ink truncate">
          {meta.title}
        </h1>
      </div>

      {/* Search global — placeholder, ⌘K */}
      <div className="ml-auto">
        <button
          type="button"
          className={cn(
            "h-8 w-72 rounded-md border border-line bg-bg-inset text-xs text-ink-dim",
            "px-2.5 flex items-center gap-2 hover:border-line-strong transition-colors cursor-pointer"
          )}
          aria-label="Busca global"
        >
          <Search className="size-3.5" />
          <span>Buscar campanhas, contas, regras…</span>
          <kbd className="ml-auto font-mono text-2xs border border-line rounded px-1 py-0.5 text-ink-dim bg-bg-base">
            ⌘K
          </kbd>
        </button>
      </div>

      <TooltipProvider delayDuration={250}>
        {/* Privacy toggle global */}
        <PrivacyButton />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Language */}
        <LanguageMenu />

        {/* Notifications */}
        <NotificationsMenu />

        {/* Profile */}
        <UserMenu />
      </TooltipProvider>
    </header>
  );
}

function IconButton({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "size-8 inline-flex items-center justify-center rounded-md text-ink-muted",
            "hover:bg-bg-elevated hover:text-ink transition-colors cursor-pointer",
            className
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function PrivacyButton() {
  const { enabled, toggle } = usePrivacy();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={enabled ? "Desativar modo privado" : "Ativar modo privado"}
          aria-pressed={enabled}
          className={cn(
            "size-8 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer",
            enabled
              ? "text-accent bg-accent-subtle hover:bg-accent-subtle/80"
              : "text-ink-muted hover:bg-bg-elevated hover:text-ink"
          )}
        >
          {enabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {enabled ? "Privacidade ativa — nomes ocultos" : "Modo privado (oculta nomes)"}
      </TooltipContent>
    </Tooltip>
  );
}

function ThemeToggle() {
  // Sincroniza com o estado real do <html> que o script de init em layout.tsx já aplicou.
  // Evita flicker e dessincronia entre estado React e classe CSS.
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };

  return (
    <IconButton label={dark ? "Modo claro" : "Modo escuro"} onClick={toggle}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </IconButton>
  );
}

function LanguageMenu() {
  const [lang, setLang] = React.useState<"pt" | "en" | "es">("pt");
  const flags = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" } as const;
  const labels = { pt: "Português", en: "English", es: "Español" } as const;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="size-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:bg-bg-elevated hover:text-ink transition-colors cursor-pointer"
              aria-label="Idioma"
            >
              <Languages className="size-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Idioma · {labels[lang]}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Idioma</DropdownMenuLabel>
        {(["pt", "en", "es"] as const).map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLang(code)}
            className={lang === code ? "text-ink bg-bg-surface" : ""}
          >
            <span className="text-base leading-none">{flags[code]}</span>
            <span>{labels[code]}</span>
            {lang === code && (
              <span className="ml-auto text-2xs text-accent font-medium">ativo</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationsMenu() {
  const { notifications, unreadCount, refresh } = useNotifications();

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch {
      // silencioso
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative size-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:bg-bg-elevated hover:text-ink transition-colors cursor-pointer"
          aria-label={`Notificações (${unreadCount} não lidas)`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-ink-inverse text-[10px] font-bold grid place-items-center ring-2 ring-bg-base">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
          <span className="text-xs font-semibold text-ink">Notificações</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-2xs text-accent hover:underline cursor-pointer font-medium"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-ink-dim">
            Sem notificações ainda.
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => <NotificationRow key={n.id} n={n} />)
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({ n }: { n: Notification }) {
  const dot = {
    info: "bg-info",
    warning: "bg-warning",
    success: "bg-positive",
    danger: "bg-negative",
  }[n.tone];

  const time = relativeTime(n.created_at);
  const isRead = !!n.read_at;
  const content = (
    <DropdownMenuItem className="items-start gap-3 py-2.5 px-2.5">
      <span className={cn("size-1.5 rounded-full mt-1.5 shrink-0", dot, isRead && "opacity-30")} />
      <div className="flex-1 min-w-0">
        <div className={cn("text-xs font-medium leading-tight", isRead ? "text-ink-muted" : "text-ink")}>
          {n.title}
        </div>
        {n.description && (
          <div className="text-2xs text-ink-dim mt-0.5 leading-snug line-clamp-2">{n.description}</div>
        )}
        <div className="text-2xs text-ink-dim mt-1 font-mono">{time}</div>
      </div>
    </DropdownMenuItem>
  );

  if (n.link) {
    return <Link href={n.link} className="block">{content}</Link>;
  }
  return content;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const days = Math.floor(hr / 24);
  return `há ${days}d`;
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-8 px-1.5 pr-2 rounded-md hover:bg-bg-elevated transition-colors cursor-pointer"
        >
          <div className="size-6 rounded-full bg-accent-subtle text-accent text-2xs font-bold grid place-items-center font-mono">
            VK
          </div>
          <ChevronDown className="size-3 text-ink-dim" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2.5 pt-2 pb-3">
          <div className="text-sm font-medium text-ink">Vinny Kenzo</div>
          <div className="text-2xs text-ink-dim mt-0.5">vinnykenzo@gmail.com</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem><Settings />Minha Conta</DropdownMenuItem>
        <DropdownMenuItem><CreditCard />Assinatura<DropdownMenuShortcut>PRO</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuItem><HelpCircle />Ajuda e suporte</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-negative focus:text-negative focus:bg-negative-subtle">
          <LogOut />Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
