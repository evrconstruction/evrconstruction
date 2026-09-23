/**
 * Matching between the keywords an admin tracks and the query strings Google
 * actually reports in Search Console.
 *
 * GSC only ever reports the literal text someone typed, so comparing the two
 * with `===` misses real matches: "evrconstructions" is tracked while Google
 * reports "evr construction", and "gazebo knoxville" is tracked while Google
 * reports "gazebo contractor knoxville tn". Both are the same intent.
 *
 * Matching is deliberately conservative. An empty row is honest; attributing
 * one phrase's traffic to a different phrase would put wrong numbers in front
 * of someone making a decision, which is worse.
 */

/** Words that carry no search intent and would otherwise block a real match. */
const IGNORED_WORDS = new Set(["and", "the"]);

/** Lowercase, replace punctuation with spaces, collapse whitespace. */
export function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Reduce a single word to a comparable form so singular and plural are treated
 * as the same term (decks/deck, builders/builder, gazebos/gazebo).
 *
 * Deliberately crude rather than a real stemmer: one would mean a new
 * dependency, and this vocabulary is a fixed set of English service and place
 * words. The "ss" guard leaves words such as "glass" and "business" intact.
 */
function foldWord(word: string): string {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

/** Significant words of a phrase, singularised with filler words removed. */
export function phraseWords(value: string): string[] {
  return normalizePhrase(value)
    .split(" ")
    .filter((word) => word.length > 0 && !IGNORED_WORDS.has(word))
    .map(foldWord);
}

/**
 * The whole phrase with spaces removed and plural folded, so a phrase Google
 * splits or joins is still recognised: both "evrconstructions" and
 * "evr construction" become "evrconstruction".
 */
export function compactPhrase(value: string): string {
  return foldWord(normalizePhrase(value).replace(/ /g, ""));
}

export type KeywordMatchKind = "exact" | "variant";

/**
 * How closely a tracked keyword matches a reported query, or null when they are
 * not the same phrase.
 *
 * - `exact`   — identical once case, punctuation and spacing are normalised.
 * - `variant` — the same words in another form: joined or split
 *               ("evrconstructions" / "evr construction"), or one phrase
 *               contained in the other ("gazebo knoxville" within
 *               "gazebo contractor knoxville tn").
 */
export function matchKeyword(tracked: string, query: string): KeywordMatchKind | null {
  if (normalizePhrase(tracked) === normalizePhrase(query)) {
    return "exact";
  }

  if (compactPhrase(tracked) === compactPhrase(query)) {
    return "variant";
  }

  const trackedWords = phraseWords(tracked);
  const queryWords = phraseWords(query);

  // Every word of the shorter phrase must appear in the longer one.
  const [shorter, longer] =
    trackedWords.length <= queryWords.length
      ? [trackedWords, queryWords]
      : [queryWords, trackedWords];

  // A single shared word is not enough evidence. Without this guard a tracked
  // "evr" would claim "evers construction lawrenceburg tn" — a different
  // company in a different city.
  if (shorter.length < 2) {
    return null;
  }

  const longerWords = new Set(longer);
  return shorter.every((word) => longerWords.has(word)) ? "variant" : null;
}

/**
 * Number of significant words two phrases share, used to pick the closest of
 * several reported queries that resemble the same tracked keyword.
 */
export function sharedWordCount(first: string, second: string): number {
  const secondWords = new Set(phraseWords(second));
  return phraseWords(first).filter((word) => secondWords.has(word)).length;
}

export interface QueryAssignment {
  query: string;
  kind: KeywordMatchKind;
}

/**
 * Pair each tracked keyword with at most one reported query.
 *
 * A query may back only one keyword, otherwise its clicks and impressions would
 * be counted twice in the totals. Exact matches claim first so a looser variant
 * can never take a query an exact match would have used; among variants the one
 * sharing the most words wins.
 *
 * @returns tracked keyword id -> the query it should display, absent when
 *          nothing was reported for it.
 */
export function assignQueries(
  tracked: Array<{ id: string; keyword: string }>,
  reported: string[]
): Map<string, QueryAssignment> {
  const claimed = new Set<string>();
  const assignments = new Map<string, QueryAssignment>();

  const available = () => reported.filter((query) => !claimed.has(query));

  const claim = (id: string, query: string, kind: KeywordMatchKind) => {
    claimed.add(query);
    assignments.set(id, { query, kind });
  };

  for (const item of tracked) {
    const exact = available().find(
      (query) => matchKeyword(item.keyword, query) === "exact"
    );
    if (exact) claim(item.id, exact, "exact");
  }

  for (const item of tracked) {
    if (assignments.has(item.id)) continue;
    const closest = available()
      .filter((query) => matchKeyword(item.keyword, query) === "variant")
      .sort(
        (a, b) =>
          sharedWordCount(item.keyword, b) - sharedWordCount(item.keyword, a) ||
          a.localeCompare(b)
      )[0];
    if (closest) claim(item.id, closest, "variant");
  }

  return assignments;
}
