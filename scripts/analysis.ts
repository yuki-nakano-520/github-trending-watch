import { readFile, writeFile } from 'node:fs/promises';
import { alternativeTargetsOf } from '../shared/alternatives.ts';
import { CATEGORY_IDS, classify } from '../shared/categories.ts';
import { GENRE_IDS, genreOf } from '../shared/genres.ts';
import type { DaySummary, IndexFile, Repo } from '../shared/types.ts';
import { INDEX_FILE } from './config.ts';

export type UnclassifiedRepo = Omit<Repo, 'categories' | 'genre' | 'alternativeTo'>;

export const classifyRepo = (repo: UnclassifiedRepo): Repo => {
  const text = `${repo.name} ${repo.description}`;
  return {
    ...repo,
    categories: classify(text),
    genre: genreOf(text, repo.language),
    alternativeTo: alternativeTargetsOf(repo.description),
  };
};

const ratioBy = <K extends string>(
  repos: readonly Repo[],
  ids: readonly K[],
  matches: (repo: Repo, id: K) => boolean,
): Record<K, number> =>
  Object.fromEntries(
    ids.map((id) => [id, repos.length === 0 ? 0 : repos.filter((r) => matches(r, id)).length / repos.length]),
  ) as Record<K, number>;

/** `repos` must be sorted by score, highest first. */
export const summarize = (date: string, repos: readonly Repo[], topN: number): DaySummary => {
  const top = repos.slice(0, topN);
  const byCategory = (list: readonly Repo[]) => ratioBy(list, CATEGORY_IDS, (r, id) => r.categories.includes(id));
  const byGenre = (list: readonly Repo[]) => ratioBy(list, GENRE_IDS, (r, id) => r.genre === id);
  return {
    date,
    repoCount: repos.length,
    categoryRatio: { all: byCategory(repos), top: byCategory(top) },
    genreRatio: { all: byGenre(repos), top: byGenre(top) },
    top: top.map((r) => r.name),
  };
};

export const readIndex = async (): Promise<IndexFile | null> => {
  try {
    return JSON.parse(await readFile(INDEX_FILE, 'utf8')) as IndexFile;
  } catch {
    return null;
  }
};

/** Replaces days that share a date with `summaries` and keeps the rest. */
export const writeIndex = async (
  previous: IndexFile | null,
  summaries: readonly DaySummary[],
  updatedAt: string,
  topN: number,
): Promise<void> => {
  const replaced = new Set(summaries.map((s) => s.date));
  const index: IndexFile = {
    updatedAt,
    topN,
    days: [...(previous?.days ?? []).filter((d) => !replaced.has(d.date)), ...summaries].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
  await writeFile(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
};
