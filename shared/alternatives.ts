/**
 * Extracts the products a repo claims to replace from its description,
 * e.g. "Open source alternative to Semrush and Ahrefs" -> ["Semrush", "Ahrefs"].
 */

/**
 * "alternative to X", "replacement for X", "clone of X".
 * "alternative for" is left out: in "Pacman alternative for ArchLinux" the product precedes it.
 */
const INTRO = /\b(?:alternatives? (?:to|of)|replacements? (?:to|for|of)|clones? of)\s+/gi;
/** "X alternative", "X replacement" (X capitalized, not itself introducing a list). */
const SUFFIX =
  /((?:[A-Z0-9][\w.+-]*\s+){0,4}[A-Z0-9][\w.+-]*)\s+(?:alternative(?!\s+(?:to|of)\b)|replacement(?!\s+(?:to|for|of)\b))/g;
/** Characters that end a product list. */
const STOP_CHARS = /[.!?;:()[\]|—–\p{Extended_Pictographic}]/u;
/** Separators inside a product list: "A, B & C", "A + B", "A and B", "A or B", "A/B". */
const LIST_SEPARATOR = /,|&|\+|\/|\band\b|\bor\b/;
/** A clause that follows the product name, e.g. "Netlify that lets you deploy". */
const TRAILING_CLAUSE =
  /\s+(?:that|which|with|for|in|on|but|built|written|made|designed|where|so|using|via|etc)\b.*$/i;
const ARTICLE = /^(?:a|an)$/i;
const LEADING_GENERIC = new Set([
  'the',
  'open',
  'open-source',
  'opensource',
  'source',
  'free',
  'truly',
  'fully-local',
  'local-first',
  'cross-platform',
  'self-hosted',
  'self-hostable',
  'lightweight',
  'fast',
  'simple',
  'modern',
  'native',
  'real',
  'privacy-first',
]);
const MAX_WORDS = 4;
const MAX_LENGTH = 30;

const toProductName = (raw: string): string | null => {
  const words = raw.replace(TRAILING_CLAUSE, '').trim().split(/\s+/).filter(Boolean);
  // "an Easier-to-Use alternative" describes a quality, not a product.
  if (words[0] && ARTICLE.test(words[0])) return null;
  while (words[0] && LEADING_GENERIC.has(words[0].toLowerCase())) words.shift();
  const name = words.join(' ');
  if (!name || words.length > MAX_WORDS || name.length > MAX_LENGTH) return null;
  if (!/^[A-Z0-9]/.test(name) || /alternative|replacement/i.test(name)) return null;
  return name;
};

export const alternativeTargetsOf = (description: string): string[] => {
  const names = new Set<string>();

  const intros = [...description.matchAll(INTRO)];
  intros.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = intros[i + 1]?.index ?? description.length;
    // Cut the clause before splitting, or "... that deploys to 360+ services" leaks a "360".
    const list = (description.slice(start, end).split(STOP_CHARS)[0] ?? '').replace(TRAILING_CLAUSE, '');
    for (const part of list.split(LIST_SEPARATOR)) {
      const name = toProductName(part);
      if (name) names.add(name);
    }
  });

  for (const match of description.matchAll(SUFFIX)) {
    const name = toProductName(match[1] ?? '');
    if (name) names.add(name);
  }

  return [...names];
};
