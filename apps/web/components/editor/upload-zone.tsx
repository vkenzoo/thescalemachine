"use client";

import * as React from "react";
import { Upload, X, FileVideo, FileImage, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export interface CreativeFile {
  id: string;
  name: string;
  size: number;
  kind: "image" | "video" | "other";
  file: File; // arquivo real pra upload
}

export function UploadZone({
  files,
  onAdd,
  onRemove,
}: {
  files: CreativeFile[];
  onAdd: (files: CreativeFile[]) => void;
  onRemove: (id: string) => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const next: CreativeFile[] = Array.from(list).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      kind: f.type.startsWith("video")
        ? "video"
        : f.type.startsWith("image")
        ? "image"
        : "other",
      file: f,
    }));
    onAdd(next);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer",
          "p-8 text-center",
          dragOver
            ? "border-accent bg-accent-subtle/40"
            : "border-line bg-bg-inset hover:border-line-strong hover:bg-bg-elevated"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="grid place-items-center size-12 mx-auto rounded-md bg-bg-surface border border-line mb-3">
          <Upload className={cn("size-5", dragOver ? "text-accent" : "text-ink-muted")} />
        </div>
        <p className="text-sm font-medium text-ink">
          {dragOver ? "Solte os arquivos aqui" : "Arraste seus criativos ou clique para escolher"}
        </p>
        <p className="text-2xs text-ink-dim mt-1.5 leading-relaxed">
          Suporta vídeos &gt; 100MB, imagens em qualquer formato.
          <br />
          A fila processa em background — você pode fechar a aba.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Criativos selecionados ({files.length})</p>
            <button
              onClick={() => files.forEach((f) => onRemove(f.id))}
              className="text-2xs text-ink-dim hover:text-negative transition-colors cursor-pointer"
            >
              Remover todos
            </button>
          </div>
          <div className="rounded-md border border-line bg-bg-surface divide-y divide-line max-h-48 overflow-y-auto">
            {files.map((f) => {
              const FIcon = f.kind === "video" ? FileVideo : f.kind === "image" ? FileImage : FileText;
              return (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-bg-elevated transition-colors">
                  <FIcon className={cn("size-3.5 shrink-0", f.kind === "video" ? "text-warning" : f.kind === "image" ? "text-info" : "text-ink-dim")} />
                  <span className="text-ink truncate font-mono">{f.name}</span>
                  <span className="ml-auto text-ink-dim font-mono shrink-0">{formatSize(f.size)}</span>
                  <button
                    onClick={() => onRemove(f.id)}
                    className="size-5 grid place-items-center rounded text-ink-dim hover:text-negative hover:bg-bg-elevated transition-colors cursor-pointer"
                    aria-label={`Remover ${f.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}
