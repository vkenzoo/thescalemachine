"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Hook + componente para colunas redimensionáveis.
 *
 * Padrão de uso:
 *   const { widths, setWidth } = useResizableColumns("minha-tabela", [
 *     { id: "nome", width: 250, minWidth: 120 },
 *     ...
 *   ]);
 *
 *   <table className="table-fixed">
 *     <colgroup>
 *       <col style={{ width: widths.nome }} />
 *       ...
 *     </colgroup>
 *     <thead>
 *       <tr>
 *         <th className="relative">
 *           Nome
 *           <ColumnResizer initialWidth={widths.nome} onResize={(w) => setWidth("nome", w)} />
 *         </th>
 *       </tr>
 *     </thead>
 *   </table>
 */

export interface ColumnConfig {
  id: string;
  /** Largura padrão em pixels. */
  width: number;
  /** Largura mínima permitida ao arrastar. Default 60. */
  minWidth?: number;
}

export function useResizableColumns(storageKey: string, defaults: ColumnConfig[]) {
  const [widths, setWidths] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(defaults.map((c) => [c.id, c.width]))
  );

  // Hidrata do localStorage no mount (evita hydration mismatch)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWidths((curr) => ({ ...curr, ...parsed }));
      }
    } catch {
      // ignore corrupted localStorage
    }
  }, [storageKey]);

  const setWidth = React.useCallback(
    (id: string, width: number) => {
      setWidths((curr) => {
        const minWidth = defaults.find((c) => c.id === id)?.minWidth ?? 60;
        const next = { ...curr, [id]: Math.max(minWidth, width) };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // localStorage cheio / disabled — ignorar
        }
        return next;
      });
    },
    [defaults, storageKey]
  );

  const reset = React.useCallback(() => {
    const initial = Object.fromEntries(defaults.map((c) => [c.id, c.width]));
    setWidths(initial);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [defaults, storageKey]);

  return { widths, setWidth, reset };
}

interface ResizerProps {
  initialWidth: number;
  onResize: (newWidth: number) => void;
  onDoubleClick?: () => void;
}

/**
 * Drag handle absoluto na borda direita de uma `<th>`.
 * O `<th>` precisa ter `position: relative` (className "relative").
 */
export function ColumnResizer({ initialWidth, onResize, onDoubleClick }: ResizerProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = initialWidth;

    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      onResize(startWidth + delta);
    };
    const handleUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionar coluna"
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        // Faixa fina sobre a borda direita da célula. Hover/drag mostram acento.
        "absolute right-0 top-0 bottom-0 w-1.5 -mr-px cursor-col-resize select-none z-20",
        "transition-colors duration-100",
        isDragging
          ? "bg-accent"
          : "hover:bg-accent/40"
      )}
    />
  );
}
