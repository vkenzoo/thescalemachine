import { TutorialButton } from "@/components/shared/tutorial-button";
import { cn } from "@/lib/cn";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  tutorial?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header padrão de módulo:
 * - eyebrow caps-locked à la editorial
 * - título grande
 * - subtítulo descritivo
 * - botão "Tutorial em vídeo" embedado (padrão do produto)
 * - slot de ações à direita
 */
export function ModuleHeader({ eyebrow, title, description, tutorial, actions, className }: Props) {
  return (
    <div className={cn("flex items-start justify-between gap-6 flex-wrap", className)}>
      <div className="space-y-2 min-w-0">
        {eyebrow && <p className="eyebrow text-accent">{eyebrow}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-3xl text-ink tracking-tight leading-none">{title}</h1>
          {tutorial && <TutorialButton />}
        </div>
        {description && (
          <p className="text-sm text-ink-muted max-w-2xl leading-relaxed pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
