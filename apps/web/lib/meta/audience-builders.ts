/**
 * Builders de payloads de Custom Audience pra Marketing API.
 * Cada tipo (IG, FB, Video, Website, Lookalike) tem schema diferente.
 *
 * Doc Meta: https://developers.facebook.com/docs/marketing-api/audiences/reference/custom-audience
 */

const RETENTION_DAYS: Record<string, number> = {
  "1d": 1, "3d": 3, "5d": 5, "7d": 7, "14d": 14, "30d": 30,
  "60d": 60, "90d": 90, "120d": 120, "180d": 180, "365d": 365, "730d": 730,
};

const IG_EVENT: Record<string, string> = {
  ig_visit:    "ig_business_profile_visited",
  ig_engage:   "ig_business_profile_engaged",
  ig_save:     "ig_business_post_saved",
  ig_message:  "ig_business_message_sent",
  ig_story:    "ig_business_story_engaged",
};

const FB_EVENT: Record<string, string> = {
  fb_visit:    "page_visited",
  fb_engage:   "page_engaged",
  fb_message:  "page_messaged",
  fb_save:     "page_post_saved",
  fb_event:    "page_event_responded",
};

const VIDEO_EVENT: Record<string, string> = {
  v_3s:    "video_view",
  v_10s:   "video_view_10sec",
  v_25:    "video_view_25_percent",
  v_50:    "video_view_50_percent",
  v_75:    "video_view_75_percent",
};

const VIDEO_LABEL: Record<string, string> = {
  v_3s:  "3s",
  v_10s: "10s ThruPlay",
  v_25:  "25%",
  v_50:  "50%",
  v_75:  "75%",
};

const LOOKALIKE_RATIO: Record<string, number> = {
  lal_1:  0.01,
  lal_3:  0.03,
  lal_5:  0.05,
  lal_10: 0.10,
};

export function retentionDaysFromKey(key: string): number {
  return RETENTION_DAYS[key] ?? 30;
}

// =============================================================
// IG Engagement
// =============================================================
export function buildIgAudience(opts: {
  igAccountId: string;
  igUsername?: string | null;
  eventKey: string;       // 'ig_visit' | 'ig_engage' | ...
  retentionKey: string;   // '7d' | '30d' | ...
}) {
  const event = IG_EVENT[opts.eventKey];
  if (!event) throw new Error(`Evento IG inválido: ${opts.eventKey}`);
  const days = retentionDaysFromKey(opts.retentionKey);
  const eventLabel = labelOfEvent(IG_EVENT_LABELS, opts.eventKey);
  const igTag = opts.igUsername ? `@${opts.igUsername}` : "IG";
  return {
    name: `IG ${igTag} – ${eventLabel} – ${opts.retentionKey.toUpperCase()}`,
    subtype: "ENGAGEMENT",
    retention_days: days,
    rule: JSON.stringify({
      inclusions: {
        operator: "or",
        rules: [{
          event_sources: [{ type: "ig_business", id: opts.igAccountId }],
          retention_seconds: days * 86400,
          filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: event }] },
        }],
      },
    }),
  };
}

const IG_EVENT_LABELS: Record<string, string> = {
  ig_visit: "Visitas perfil",
  ig_engage: "Engajados",
  ig_save: "Salvaram posts",
  ig_message: "Enviaram mensagem",
  ig_story: "Engajados story",
};

// =============================================================
// FB Engagement
// =============================================================
export function buildFbAudience(opts: {
  pageId: string;
  pageName?: string | null;
  eventKey: string;
  retentionKey: string;
}) {
  const event = FB_EVENT[opts.eventKey];
  if (!event) throw new Error(`Evento FB inválido: ${opts.eventKey}`);
  const days = retentionDaysFromKey(opts.retentionKey);
  const eventLabel = labelOfEvent(FB_EVENT_LABELS, opts.eventKey);
  const pageTag = opts.pageName ?? "Page";
  return {
    name: `FB ${pageTag} – ${eventLabel} – ${opts.retentionKey.toUpperCase()}`,
    subtype: "ENGAGEMENT",
    retention_days: days,
    rule: JSON.stringify({
      inclusions: {
        operator: "or",
        rules: [{
          event_sources: [{ type: "page", id: opts.pageId }],
          retention_seconds: days * 86400,
          filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: event }] },
        }],
      },
    }),
  };
}

const FB_EVENT_LABELS: Record<string, string> = {
  fb_visit: "Visitas página",
  fb_engage: "Engajados",
  fb_message: "Enviaram mensagem",
  fb_save: "Salvaram posts",
  fb_event: "Responderam evento",
};

// =============================================================
// Video Views
// =============================================================
export function buildVideoAudience(opts: {
  videoId: string;
  videoTitle?: string | null;
  eventKey: string;       // 'v_3s' | 'v_25' | ...
  retentionKey: string;
  prefix?: string;         // ex: "Video Anúncios"
}) {
  const event = VIDEO_EVENT[opts.eventKey];
  if (!event) throw new Error(`Evento Vídeo inválido: ${opts.eventKey}`);
  const days = retentionDaysFromKey(opts.retentionKey);
  const watchedLabel = VIDEO_LABEL[opts.eventKey];
  const titleTag = opts.videoTitle ? opts.videoTitle.slice(0, 30) : "Video";
  const prefix = opts.prefix ?? "Video";
  return {
    name: `${prefix} – ${titleTag} – [${watchedLabel}] – ${opts.retentionKey.toUpperCase()}`,
    subtype: "ENGAGEMENT",
    retention_days: days,
    rule: JSON.stringify({
      inclusions: {
        operator: "or",
        rules: [{
          event_sources: [{ type: "video", id: opts.videoId }],
          retention_seconds: days * 86400,
          filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: event }] },
        }],
      },
    }),
  };
}

// =============================================================
// Website / Pixel
// =============================================================
export function buildPixelAudience(opts: {
  pixelId: string;
  eventName: string;       // "PageView", "Lead", "Purchase", ...
  retentionKey: string;
  url?: string | null;     // opcional — filtra por URL
}) {
  const days = retentionDaysFromKey(opts.retentionKey);
  const filters: any[] = [{ field: "event", operator: "eq", value: opts.eventName }];
  if (opts.url) {
    filters.push({ field: "url", operator: "i_contains", value: opts.url });
  }
  return {
    name: `Pixel ${opts.eventName} – ${opts.retentionKey.toUpperCase()}${opts.url ? ` – ${opts.url}` : ""}`,
    subtype: "WEBSITE",
    retention_days: days,
    pixel_id: opts.pixelId,
    rule: JSON.stringify({
      inclusions: {
        operator: "or",
        rules: [{
          event_sources: [{ type: "web_pixel", id: opts.pixelId }],
          retention_seconds: days * 86400,
          filter: { operator: "and", filters },
        }],
      },
    }),
  };
}

// =============================================================
// Lookalike
// =============================================================
export function buildLookalikeAudience(opts: {
  sourceAudienceId: string;
  sourceName?: string | null;
  ratioKey: string;        // 'lal_1' | 'lal_3' | ...
  country?: string;        // default "BR"
}) {
  const ratio = LOOKALIKE_RATIO[opts.ratioKey];
  if (ratio == null) throw new Error(`Ratio LAL inválido: ${opts.ratioKey}`);
  const country = opts.country ?? "BR";
  const pct = Math.round(ratio * 100);
  const sourceTag = opts.sourceName ?? "Source";
  return {
    name: `LAL ${pct}% – ${sourceTag} – ${country}`,
    subtype: "LOOKALIKE",
    origin_audience_id: opts.sourceAudienceId,
    lookalike_spec: JSON.stringify({
      type: pct <= 1 ? "similarity" : "custom_ratio",
      ratio,
      country,
    }),
  };
}

function labelOfEvent(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
