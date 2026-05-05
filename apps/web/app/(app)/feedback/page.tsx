"use client";

import * as React from "react";
import { Send, ArrowUp, MessageCircle, Bug, HelpCircle, Sparkles, Search } from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioOption } from "@/components/ui/radio";
import { FEEDBACK_IDEAS, type FeedbackIdea } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<FeedbackIdea["status"], "accent" | "info" | "warning" | "positive"> = {
  shipped: "positive",
  planned: "accent",
  considering: "info",
  open: "warning",
};

const STATUS_LABEL: Record<FeedbackIdea["status"], string> = {
  shipped: "Lançado",
  planned: "Planejado",
  considering: "Em análise",
  open: "Em discussão",
};

export default function FeedbackPage() {
  const { push } = useToast();
  const [type, setType] = React.useState<FeedbackIdea["type"]>("feature");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [ideas, setIdeas] = React.useState(FEEDBACK_IDEAS);

  const filtered = ideas.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));

  const submit = () => {
    if (!title) {
      push({ tone: "warning", title: "Adicione um título" });
      return;
    }
    setIdeas((curr) => [
      {
        id: Math.random().toString(36).slice(2),
        title,
        type,
        votes: 1,
        voted: true,
        status: "open",
        author: "Você",
        ago: "agora",
      },
      ...curr,
    ]);
    setTitle("");
    setBody("");
    push({ tone: "success", title: "Sugestão enviada", description: "Obrigado pela contribuição." });
  };

  const upvote = (id: string) => {
    setIdeas((curr) =>
      curr.map((i) =>
        i.id === id
          ? { ...i, voted: !i.voted, votes: i.voted ? i.votes - 1 : i.votes + 1 }
          : i
      )
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Suporte"
        title="Feedback"
        description="Reporte bugs, sugira features e vote nas ideias da comunidade. Tudo que entra aqui vira backlog ou conversa direta com o time."
      />

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        {/* Form */}
        <section className="space-y-3">
          <p className="eyebrow">Sua sugestão</p>
          <div className="rounded-lg border border-line bg-bg-surface p-5 space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <RadioGroup value={type} onChange={(v) => setType(v as any)} layout="inline">
                <RadioOption value="feature"  label="Feature"  icon={Sparkles} />
                <RadioOption value="fix"      label="Bug"      icon={Bug} />
                <RadioOption value="question" label="Pergunta" icon={HelpCircle} />
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fb-title">Título</Label>
              <Input
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resuma sua ideia em 1 linha…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fb-body">Detalhes (opcional)</Label>
              <Textarea
                id="fb-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Explique o problema, a oportunidade, ou o cenário."
              />
            </div>

            <Button variant="primary" className="w-full" onClick={submit}>
              <Send /> Enviar
            </Button>
          </div>
        </section>

        {/* Ideas list */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Ideias da comunidade</p>
            <Badge tone="neutral" size="xs">{ideas.length} sugestões</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ideia…"
              className="pl-8 h-8 text-xs"
            />
          </div>
          <ul className="space-y-2">
            {filtered.map((i) => (
              <li
                key={i.id}
                className="rounded-lg border border-line bg-bg-surface p-3.5 hover:border-line-strong transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => upvote(i.id)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer shrink-0",
                      i.voted
                        ? "border-accent/40 bg-accent-subtle text-accent"
                        : "border-line bg-bg-inset text-ink-muted hover:border-line-strong hover:text-ink"
                    )}
                  >
                    <ArrowUp className="size-3" strokeWidth={2.5} />
                    <span className="text-2xs font-mono font-semibold">{i.votes}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-ink">{i.title}</h3>
                      <Badge tone={STATUS_TONE[i.status]} size="xs">{STATUS_LABEL[i.status]}</Badge>
                    </div>
                    <p className="text-2xs text-ink-dim mt-1 font-mono">
                      por {i.author} · {i.ago} ·{" "}
                      <span className="capitalize">{i.type === "fix" ? "bug" : i.type === "feature" ? "feature" : "pergunta"}</span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
