/**
 * Parser de filtro com sintaxe especial do Ads Editor:
 *   "+"  = OR  (ex: "black + branco" → match se contiver "black" OU "branco")
 *   ";"  = AND (ex: "black ; video" → match se contiver "black" E "video")
 *
 * Espaços ao redor dos operadores são opcionais. Case-insensitive.
 *
 * Precedência: AND vincula mais forte que OR (como em SQL).
 *   "a + b ; c" = "a OR (b AND c)"
 */

type Predicate = (haystack: string) => boolean;

export function parseFilter(query: string): Predicate {
  const q = query.trim().toLowerCase();
  if (!q) return () => true;

  // Split top-level por '+' (OR), depois cada termo por ';' (AND).
  const orGroups = q
    .split("+")
    .map((g) => g.trim())
    .filter(Boolean);

  const groups = orGroups.map((group) => {
    const andTerms = group
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
    return andTerms;
  });

  return (haystack: string) => {
    const h = haystack.toLowerCase();
    return groups.some((andTerms) => andTerms.every((term) => h.includes(term)));
  };
}

export function highlightMatches(text: string, query: string): string {
  // Helper visual para exibir texto com termos destacados (uso futuro).
  if (!query.trim()) return text;
  const terms = query
    .split(/[+;]/)
    .map((t) => t.trim())
    .filter(Boolean);
  let out = text;
  for (const t of terms) {
    const re = new RegExp(`(${escapeRegex(t)})`, "gi");
    out = out.replace(re, "‹$1›");
  }
  return out;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
