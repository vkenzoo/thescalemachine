"use client";

import * as React from "react";
import {
  Save,
  Trash2,
  Search,
  GripVertical,
  Plus,
  Download,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { METRICS, METRIC_CATEGORY_LABELS, type MetricDef } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

// Presets nomeados — replicando o padrão "Geral 2", "Teste aula" do produto
interface Preset {
  id: string;
  name: string;
  cols: string[];
}

const DEFAULT_PRESETS: Preset[] = [
  { id: "geral",       name: "Geral",       cols: ["spend", "budget", "purchases", "cpa", "roas", "ctr", "cpc", "cpm"] },
  { id: "geral2",      name: "Geral 2",     cols: ["spend", "purchases", "revenue", "roas", "ctr", "cpc", "cpm", "frequency"] },
  { id: "teste-aula",  name: "Teste aula",  cols: ["ig_visits", "cp_ig_visit", "messages", "cp_message", "ctr"] },
  { id: "performance", name: "Performance", cols: ["spend", "purchases", "cpa", "roas", "ctr", "cpc"] },
  { id: "ecom",        name: "E-commerce",  cols: ["spend", "purchases", "revenue", "roas", "cart_adds", "cp_cart", "checkouts"] },
  { id: "leads",       name: "Leads",       cols: ["spend", "leads", "cpl", "ctr", "cpm"] },
];

const DEFAULT_COLS = ["spend", "budget", "purchases", "cpa", "roas", "revenue", "cpc", "cpm", "ctr", "clicks", "impressions"];

export function ColumnPicker({
  open,
  onOpenChange,
  defaultColumns,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultColumns?: string[];
  onSave?: (cols: string[]) => void;
}) {
  const { push } = useToast();
  const [query, setQuery] = React.useState("");
  // Lista ORDENADA de colunas selecionadas — array, não Set, para permitir reorder
  const [selected, setSelected] = React.useState<string[]>(defaultColumns ?? DEFAULT_COLS);
  const [activePresetId, setActivePresetId] = React.useState<string>("teste-aula");
  const [presets, setPresets] = React.useState<Preset[]>(DEFAULT_PRESETS);
  const [savePresetMode, setSavePresetMode] = React.useState(false);
  const [newPresetName, setNewPresetName] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSelected(defaultColumns ?? DEFAULT_COLS);
      setQuery("");
      setSavePresetMode(false);
    }
  }, [open, defaultColumns]);

  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const available = React.useMemo(
    () =>
      METRICS.filter(
        (m) => !selectedSet.has(m.id) && m.label.toLowerCase().includes(query.toLowerCase())
      ),
    [selectedSet, query]
  );

  // Métricas disponíveis agrupadas
  const availableGrouped = React.useMemo(() => {
    const map = new Map<MetricDef["category"], MetricDef[]>();
    for (const m of available) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return map;
  }, [available]);

  const addColumn = (id: string) => {
    setSelected((curr) => (curr.includes(id) ? curr : [...curr, id]));
  };
  const removeColumn = (id: string) => {
    setSelected((curr) => curr.filter((x) => x !== id));
  };

  const loadPreset = (preset: Preset) => {
    setSelected(preset.cols);
    setActivePresetId(preset.id);
    push({ tone: "info", title: `"${preset.name}" carregado` });
  };

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const id = newPresetName.toLowerCase().replace(/\s+/g, "-");
    setPresets((curr) => [...curr, { id, name: newPresetName.trim(), cols: selected }]);
    setActivePresetId(id);
    setNewPresetName("");
    setSavePresetMode(false);
    push({ tone: "success", title: `Predefinição "${newPresetName.trim()}" criada` });
  };

  // Drag and drop dos itens selecionados
  const dragIndexRef = React.useRef<number | null>(null);
  const onDragStart = (i: number) => () => {
    dragIndexRef.current = i;
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (i: number) => () => {
    const from = dragIndexRef.current;
    if (from == null || from === i) return;
    setSelected((curr) => {
      const next = [...curr];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalize as colunas</DialogTitle>
          <DialogDescription>
            Escolha quais colunas aparecem na tabela, reorganize-as arrastando, e salve como predefinição.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* PREDEFINIÇÕES */}
          <section className="space-y-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-dim">
              Predefinições
            </p>
            <div className="rounded-lg border border-line bg-bg-inset divide-y divide-line/60">
              {presets.map((p) => {
                const isActive = activePresetId === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-bg-elevated transition-colors"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="radio"
                        name="preset"
                        checked={isActive}
                        onChange={() => loadPreset(p)}
                        className="size-3.5 accent-accent cursor-pointer"
                      />
                      <span className={cn("text-sm", isActive ? "text-ink font-medium" : "text-ink-muted")}>
                        {p.name}
                      </span>
                      <span className="text-2xs text-ink-dim font-mono">{p.cols.length} cols</span>
                    </label>
                    <button
                      onClick={() => loadPreset(p)}
                      className="text-2xs text-accent hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
                    >
                      <Download className="size-3" />
                      Carregar
                    </button>
                    <button
                      onClick={() => {
                        setPresets((curr) =>
                          curr.map((x) => (x.id === p.id ? { ...x, cols: selected } : x))
                        );
                        push({ tone: "success", title: `"${p.name}" sobrescrito` });
                      }}
                      className="text-2xs text-ink-dim hover:text-ink hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
                    >
                      <Save className="size-3" />
                      Salvar
                    </button>
                  </div>
                );
              })}
            </div>

            {savePresetMode ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <Input
                  autoFocus
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Nome da nova predefinição"
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && saveCurrentAsPreset()}
                />
                <Button size="sm" variant="primary" onClick={saveCurrentAsPreset} disabled={!newPresetName.trim()}>
                  <Check />
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSavePresetMode(false)}>
                  <X />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setSavePresetMode(true)}
                className="text-2xs text-accent hover:underline cursor-pointer font-medium inline-flex items-center gap-1"
              >
                <Plus className="size-3" />
                Salvar predefinição atual…
              </button>
            )}
          </section>

          <Separator />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por coluna…"
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* COLUNAS SELECIONADAS — reorderable */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-dim">
                Colunas Selecionadas
              </p>
              <Badge tone="accent" size="xs">{selected.length}</Badge>
            </div>
            <div className="rounded-lg border border-line bg-bg-inset max-h-56 overflow-y-auto">
              {selected.map((id, i) => {
                const meta = METRICS.find((m) => m.id === id);
                if (!meta) return null;
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={onDragStart(i)}
                    onDragOver={onDragOver}
                    onDrop={onDrop(i)}
                    className="flex items-center gap-2 px-2.5 py-1.5 border-b border-line/40 last:border-b-0 hover:bg-bg-elevated transition-colors group cursor-move"
                  >
                    <GripVertical className="size-3.5 text-ink-dim shrink-0 group-hover:text-ink-muted" />
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => removeColumn(id)}
                    />
                    <span className="text-xs text-ink flex-1">{meta.label}</span>
                    <span className="text-2xs font-mono text-ink-dim uppercase">{meta.format}</span>
                    <button
                      onClick={() => removeColumn(id)}
                      className="size-4 grid place-items-center rounded text-ink-dim hover:text-negative opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Remover"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
              {selected.length === 0 && (
                <p className="text-center text-xs text-ink-dim py-8">
                  Nenhuma coluna selecionada — escolha abaixo
                </p>
              )}
            </div>
          </section>

          {/* MÉTRICAS DISPONÍVEIS */}
          <section className="space-y-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-ink-dim">
              Métricas Disponíveis
            </p>
            <div className="rounded-lg border border-line bg-bg-inset/40 max-h-64 overflow-y-auto p-3 space-y-4">
              {Array.from(availableGrouped.entries()).map(([cat, metrics]) => (
                <div key={cat}>
                  <p className="text-2xs font-semibold text-ink-dim mb-1.5">
                    {METRIC_CATEGORY_LABELS[cat]}
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {metrics.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-ink-muted hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
                      >
                        <Checkbox checked={false} onCheckedChange={() => addColumn(m.id)} />
                        <span>{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {available.length === 0 && (
                <p className="text-center text-xs text-ink-dim py-4">
                  Todas as métricas disponíveis já estão selecionadas.
                </p>
              )}
            </div>
          </section>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setSelected([])}>
            <Trash2 /> Limpar
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave?.(selected);
              push({ tone: "success", title: "Colunas salvas" });
              onOpenChange(false);
            }}
          >
            <Save /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
