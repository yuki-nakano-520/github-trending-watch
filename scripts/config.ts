import type { Period } from '../shared/types.ts';

export const TRENDING_BASE_URL = 'https://github.com/trending';

/** Language slugs as used in https://github.com/trending/<slug>. '' is the all-language page. */
export const LANGUAGES = [
  '',
  'python',
  'typescript',
  'javascript',
  'rust',
  'go',
  'java',
  'c++',
  'c',
  'swift',
  'kotlin',
  'html',
  'shell',
  'jupyter-notebook',
  'c%23',
  'ruby',
  'php',
  'zig',
  'dart',
  'lua',
] as const;

export const PERIODS: readonly Period[] = ['daily', 'weekly', 'monthly'];

/** Multipliers that turn a period's gain into a monthly-equivalent score. */
export const SCORE_MULTIPLIERS: Record<Period, number> = { monthly: 1, weekly: 4, daily: 20 };

/** The first period with a non-zero gain decides the score. */
export const SCORE_PRIORITY: readonly Period[] = ['monthly', 'weekly', 'daily'];

export const TOP_N = 100;

export const CONCURRENCY = 4;
export const MAX_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 2_000;
/** Abort without writing data when more than this share of pages fail. */
export const MAX_FAILURE_RATIO = 0.2;

export const TIME_ZONE = 'Asia/Tokyo';
export const USER_AGENT = 'github-trending-watch (+https://github.com/)';

export const DATA_DIR = new URL('../data/', import.meta.url);
export const SNAPSHOT_DIR = new URL('snapshots/', DATA_DIR);
export const INDEX_FILE = new URL('index.json', DATA_DIR);
