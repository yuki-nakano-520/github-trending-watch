import * as cheerio from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Period, Repo, Snapshot } from '../shared/types.ts';
import { classifyRepo, readIndex, summarize, writeIndex, type UnclassifiedRepo } from './analysis.ts';
import {
  CONCURRENCY,
  LANGUAGES,
  MAX_ATTEMPTS,
  MAX_FAILURE_RATIO,
  PERIODS,
  RETRY_BASE_DELAY_MS,
  SCORE_MULTIPLIERS,
  SCORE_PRIORITY,
  SNAPSHOT_DIR,
  TIME_ZONE,
  TOP_N,
  TRENDING_BASE_URL,
  USER_AGENT,
} from './config.ts';

interface PageJob {
  period: Period;
  language: string;
  url: string;
}

interface Row {
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  gain: number;
}

const toNumber = (text: string): number => {
  const match = text.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const fetchHtml = async (url: string): Promise<string> => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
    if (res.ok) return res.text();
    if (attempt >= MAX_ATTEMPTS) throw new Error(`${res.status} ${res.statusText}`);
    await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  }
};

const parseRows = (html: string): Row[] => {
  const $ = cheerio.load(html);
  return $('article.Box-row')
    .toArray()
    .flatMap((el) => {
      const row = $(el);
      const href = row.find('h2 a').attr('href');
      if (!href) return [];
      return [
        {
          name: href.replace(/^\//, ''),
          description: row.find('p').first().text().trim().replace(/\s+/g, ' '),
          language: row.find('[itemprop="programmingLanguage"]').text().trim() || null,
          stars: toNumber(row.find('a[href$="/stargazers"]').text()),
          forks: toNumber(row.find('a[href$="/forks"]').text()),
          gain: toNumber(row.find('span.float-sm-right').text()),
        },
      ];
    });
};

const runPool = async <T, R>(items: readonly T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) results[index] = await worker(item);
    }
  });
  await Promise.all(lanes);
  return results;
};

const scoreOf = (gains: Record<Period, number>): number => {
  const period = SCORE_PRIORITY.find((p) => gains[p] > 0);
  return period ? gains[period] * SCORE_MULTIPLIERS[period] : 0;
};

const todayIn = (timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const main = async (): Promise<void> => {
  const jobs: PageJob[] = PERIODS.flatMap((period) =>
    LANGUAGES.map((language) => ({
      period,
      language,
      url: `${TRENDING_BASE_URL}${language ? `/${language}` : ''}?since=${period}`,
    })),
  );

  const failed: string[] = [];
  const pages = await runPool(jobs, CONCURRENCY, async (job) => {
    try {
      return { job, rows: parseRows(await fetchHtml(job.url)) };
    } catch (error) {
      failed.push(job.url);
      console.warn(`failed: ${job.url} (${error instanceof Error ? error.message : String(error)})`);
      return { job, rows: [] };
    }
  });

  if (failed.length / jobs.length > MAX_FAILURE_RATIO) {
    throw new Error(`${failed.length}/${jobs.length} pages failed; not writing data`);
  }

  const byName = new Map<string, Omit<UnclassifiedRepo, 'score'>>();
  for (const { job, rows } of pages) {
    for (const row of rows) {
      const repo = byName.get(row.name) ?? {
        name: row.name,
        description: row.description,
        language: row.language,
        stars: row.stars,
        forks: row.forks,
        gains: { daily: 0, weekly: 0, monthly: 0 },
        inOverall: false,
      };
      repo.gains[job.period] = Math.max(repo.gains[job.period], row.gain);
      repo.stars = Math.max(repo.stars, row.stars);
      repo.forks = Math.max(repo.forks, row.forks);
      if (job.language === '') repo.inOverall = true;
      byName.set(row.name, repo);
    }
  }

  const repos: Repo[] = [...byName.values()]
    .map((r) => classifyRepo({ ...r, score: scoreOf(r.gains) }))
    .sort((a, b) => b.score - a.score);

  const date = todayIn(TIME_ZONE);
  const snapshot: Snapshot = {
    date,
    collectedAt: new Date().toISOString(),
    pages: { total: jobs.length, failed },
    repos,
  };

  await mkdir(SNAPSHOT_DIR, { recursive: true });
  await writeFile(new URL(`${date}.json`, SNAPSHOT_DIR), `${JSON.stringify(snapshot)}\n`);
  await writeIndex(await readIndex(), [summarize(date, repos, TOP_N)], snapshot.collectedAt, TOP_N);

  console.log(`${date}: ${repos.length} repos from ${jobs.length - failed.length}/${jobs.length} pages`);
};

await main();
