/**
 * Re-applies the current category and genre rules to every saved snapshot and rebuilds
 * index.json. Run after editing shared/categories.ts or shared/genres.ts.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import type { DaySummary, Snapshot } from '../shared/types.ts';
import { classifyRepo, readIndex, summarize, writeIndex } from './analysis.ts';
import { SNAPSHOT_DIR, TOP_N } from './config.ts';

const main = async (): Promise<void> => {
  const files = (await readdir(SNAPSHOT_DIR)).filter((f) => f.endsWith('.json')).sort();

  const summaries: DaySummary[] = [];
  for (const file of files) {
    const url = new URL(file, SNAPSHOT_DIR);
    const snapshot = JSON.parse(await readFile(url, 'utf8')) as Snapshot;
    const repos = snapshot.repos.map(({ categories: _c, genre: _g, alternativeTo: _a, ...rest }) => classifyRepo(rest));
    await writeFile(url, `${JSON.stringify({ ...snapshot, repos })}\n`);
    summaries.push(summarize(snapshot.date, repos, TOP_N));
  }

  const previous = await readIndex();
  await writeIndex(previous, summaries, previous?.updatedAt ?? new Date().toISOString(), TOP_N);
  console.log(`reclassified ${files.length} snapshot(s)`);
};

await main();
