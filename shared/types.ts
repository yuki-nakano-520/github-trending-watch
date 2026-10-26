import type { CategoryId } from './categories.ts';
import type { GenreId } from './genres.ts';

export type Period = 'daily' | 'weekly' | 'monthly';

export type Gains = Record<Period, number>;

export interface Repo {
  /** "owner/name" */
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  /** Stars gained in each period; 0 when the repo did not appear in that period. */
  gains: Gains;
  /** Appeared on the all-language trending page (not only on a language page). */
  inOverall: boolean;
  categories: CategoryId[];
  /** Exactly one genre per repo, unlike categories. */
  genre: GenreId;
  /** Products the description says this repo replaces, e.g. ["Semrush", "Ahrefs"]. */
  alternativeTo: string[];
  /** Monthly-equivalent star gain used for ranking. */
  score: number;
}

export interface Snapshot {
  date: string;
  collectedAt: string;
  pages: { total: number; failed: string[] };
  /** Sorted by score, highest first. */
  repos: Repo[];
}

export interface DaySummary {
  date: string;
  repoCount: number;
  /** Share of repos in each category (0-1), over all repos and over the top N. */
  categoryRatio: { all: Record<CategoryId, number>; top: Record<CategoryId, number> };
  /** Share of repos in each genre (0-1); sums to 1 within each scope. */
  genreRatio: { all: Record<GenreId, number>; top: Record<GenreId, number> };
  /** Names of the top N repos by score. */
  top: string[];
}

export interface IndexFile {
  updatedAt: string;
  topN: number;
  days: DaySummary[];
}
