"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Botão "Tutorial em vídeo" presente no header de cada módulo
 * — replica o padrão visual vermelho do produto original.
 */
export function TutorialButton({
  className,
  label = "Tutorial em vídeo",
  onClick,
}: {
  className?: string;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-2xs font-medium tracking-tight cursor-pointer",
        "bg-red-600/15 text-red-400 border border-red-600/30 hover:bg-red-600/25 hover:text-red-300 transition-colors",
        className
      )}
    >
      <Play className="size-3 fill-current" />
      {label}
    </button>
  );
}
