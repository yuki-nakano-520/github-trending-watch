import { Chart, registerables } from 'chart.js';
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../shared/categories.ts';
import { GENRE_IDS, GENRE_LABELS, OTHER_GENRE, type GenreId } from '../shared/genres.ts';
import type { DaySummary, IndexFile, Repo, Snapshot } from '../shared/types.ts';

Chart.register(...registerables);

type Scope = 'top' | 'all';

const DEFAULT_VISIBLE_SERIES: readonly CategoryId[] = ['ai', 'codingAgent', 'local', 'alternative', 'security'];
const MIN_REPOS_PER_LANGUAGE = 8;
const SERIES_COLOR_COUNT = 8;
/** Neutral color reserved for "AI 以外" / "全件" / "その他". */
const NEUTRAL_SERIES = '--series-8';
/** Distinct colors for genres; the neutral one is left for "その他". */
const GENRE_SERIES = ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11'].map((n) => `--series-${n}`);
const ALL = '';

const el = <T extends HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
};

const cssVar = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const seriesColor = (i: number): string => cssVar(`--series-${(i % SERIES_COLOR_COUNT) + 1}`);
const neutralColor = (): string => cssVar(NEUTRAL_SERIES);
const genreColor = (id: GenreId): string =>
  id === OTHER_GENRE.id ? neutralColor() : cssVar(GENRE_SERIES[GENRE_IDS.indexOf(id) % GENRE_SERIES.length] ?? NEUTRAL_SERIES);
const number = new Intl.NumberFormat('ja-JP');
const percent = (v: number): string => `${(v * 100).toFixed(1)}%`;
const categoryLabel = (id: CategoryId): string => CATEGORIES.find((c) => c.id === id)?.label ?? id;

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const applyChartTheme = (): void => {
  Chart.defaults.color = cssVar('--muted');
  Chart.defaults.borderColor = cssVar('--border');
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
};

const charts = new Map<string, Chart>();
/** Destroys the previous chart before creating the next one; Chart.js rejects two charts on one canvas. */
const replaceChart = (key: string, create: () => Chart): void => {
  charts.get(key)?.destroy();
  charts.set(key, create());
};

/** Consecutive days, ending at `dayIndex`, on which `name` was in the top list. */
const streakOf = (days: readonly DaySummary[], dayIndex: number, name: string): number => {
  let streak = 0;
  for (let i = dayIndex; i >= 0 && days[i]?.top.includes(name); i--) streak++;
  return streak;
};

const pointRadius = (index: IndexFile): number => (index.days.length > 60 ? 0 : 3);

const renderTrend = (index: IndexFile, scope: Scope): void => {
  replaceChart(
    'trend',
    () =>
      new Chart(el<HTMLCanvasElement>('#trend-chart'), {
        type: 'line',
        data: {
          labels: index.days.map((d) => d.date),
          datasets: CATEGORY_IDS.map((id, i) => ({
            label: categoryLabel(id),
            data: index.days.map((d) => d.categoryRatio[scope][id] * 100),
            borderColor: seriesColor(i),
            backgroundColor: seriesColor(i),
            pointRadius: pointRadius(index),
            tension: 0.25,
            hidden: !DEFAULT_VISIBLE_SERIES.includes(id),
          })),
        },
        options: {
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: { y: { min: 0, grace: '10%', ticks: { callback: (v) => `${v}%` } } },
          plugins: {
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)}%` } },
          },
        },
      }),
  );
};

const renderGenreTrend = (index: IndexFile, scope: Scope): void => {
  replaceChart(
    'genre-trend',
    () =>
      new Chart(el<HTMLCanvasElement>('#genre-trend-chart'), {
        type: 'line',
        data: {
          labels: index.days.map((d) => d.date),
          datasets: GENRE_IDS.map((id, i) => ({
            label: GENRE_LABELS[id],
            data: index.days.map((d) => d.genreRatio[scope][id] * 100),
            borderColor: genreColor(id),
            backgroundColor: genreColor(id),
            pointRadius: pointRadius(index),
            tension: 0.25,
            // Stack each band on top of the previous one.
            fill: i === 0 ? 'origin' : '-1',
          })),
        },
        options: {
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: { y: { stacked: true, min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
          plugins: {
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(1)}%` } },
          },
        },
      }),
  );
};

const renderKpis = (snapshot: Snapshot, day: DaySummary, previous: DaySummary | undefined): void => {
  const newcomers = previous ? day.top.filter((n) => !previous.top.includes(n)).length : null;
  const items: [string, string][] = [
    ['収集リポジトリ数', number.format(snapshot.repos.length)],
    [`AI 比率（上位 ${day.top.length}）`, percent(day.categoryRatio.top.ai)],
    ['AI 比率（全件）', percent(day.categoryRatio.all.ai)],
    ['上位の新顔', newcomers === null ? '—' : `${newcomers} 件`],
    ['取得ページ', `${snapshot.pages.total - snapshot.pages.failed.length} / ${snapshot.pages.total}`],
  ];
  el('#kpis').innerHTML = items
    .map(([label, value]) => `<div class="kpi"><div class="value">${value}</div><div class="label">${label}</div></div>`)
    .join('');
};

const renderCategoryChart = (day: DaySummary): void => {
  replaceChart(
    'category',
    () =>
      new Chart(el<HTMLCanvasElement>('#category-chart'), {
        type: 'bar',
        data: {
          labels: CATEGORY_IDS.map(categoryLabel),
          datasets: [
            {
              label: `上位 ${day.top.length} 件`,
              data: CATEGORY_IDS.map((id) => day.categoryRatio.top[id] * 100),
              backgroundColor: seriesColor(0),
            },
            {
              label: '全件',
              data: CATEGORY_IDS.map((id) => day.categoryRatio.all[id] * 100),
              backgroundColor: neutralColor(),
            },
          ],
        },
        options: {
          indexAxis: 'y',
          maintainAspectRatio: false,
          scales: { x: { min: 0, ticks: { callback: (v) => `${v}%` } } },
          plugins: {
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.x).toFixed(1)}%` } },
          },
        },
      }),
  );
};

interface DonutSlice {
  label: string;
  ratio: number;
  color: string;
}

const renderDonut = (key: string, slices: readonly DonutSlice[], total: number): void => {
  replaceChart(
    key,
    () =>
      new Chart(el<HTMLCanvasElement>(`#${key}-chart`), {
        type: 'doughnut',
        data: {
          labels: slices.map((s) => s.label),
          datasets: [
            {
              data: slices.map((s) => s.ratio * 100),
              backgroundColor: slices.map((s) => s.color),
              borderColor: cssVar('--surface'),
              borderWidth: 2,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12 } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const ratio = Number(ctx.parsed) / 100;
                  return `${ctx.label}: ${number.format(Math.round(ratio * total))} 件（${percent(ratio)}）`;
                },
              },
            },
          },
        },
      }),
  );
};

const scopesOf = (day: DaySummary) =>
  [
    { scope: 'top', label: `上位 ${day.top.length} 件`, total: day.top.length },
    { scope: 'all', label: '全件', total: day.repoCount },
  ] as const;

const renderAiDonuts = (day: DaySummary): void => {
  for (const { scope, label, total } of scopesOf(day)) {
    const key = `ai-${scope}`;
    const ratio = day.categoryRatio[scope].ai;
    renderDonut(
      key,
      [
        { label: 'AI', ratio, color: seriesColor(0) },
        { label: '非AI', ratio: 1 - ratio, color: neutralColor() },
      ],
      total,
    );
    el(`#${key}-caption`).textContent =
      `${label}: AI ${number.format(Math.round(ratio * total))} / ${number.format(total)} 件（${percent(ratio)}）`;
  }
};

const renderGenreDonuts = (day: DaySummary): void => {
  for (const { scope, label, total } of scopesOf(day)) {
    const key = `genre-${scope}`;
    const ratios = day.genreRatio[scope];
    // Largest first, with "その他" always last.
    const ids = GENRE_IDS.filter((id) => id !== OTHER_GENRE.id && ratios[id] > 0).sort((a, b) => ratios[b] - ratios[a]);
    renderDonut(
      key,
      [...ids, OTHER_GENRE.id].map((id) => ({ label: GENRE_LABELS[id], ratio: ratios[id], color: genreColor(id) })),
      total,
    );
    const leader = ids[0];
    el(`#${key}-caption`).textContent = leader
      ? `${label}: 最多は「${GENRE_LABELS[leader]}」${percent(ratios[leader])}`
      : label;
  }
};

const renderLanguageChart = (repos: readonly Repo[]): void => {
  const stats = new Map<string, { ai: number; total: number }>();
  for (const repo of repos) {
    const key = repo.language ?? '（なし）';
    const s = stats.get(key) ?? { ai: 0, total: 0 };
    s.total++;
    if (repo.categories.includes('ai')) s.ai++;
    stats.set(key, s);
  }
  const rows = [...stats.entries()]
    .filter(([, s]) => s.total >= MIN_REPOS_PER_LANGUAGE)
    .map(([lang, s]) => ({ lang, ratio: s.ai / s.total, ...s }))
    .sort((a, b) => b.ratio - a.ratio);

  replaceChart(
    'language',
    () =>
      new Chart(el<HTMLCanvasElement>('#language-chart'), {
        type: 'bar',
        data: {
          labels: rows.map((r) => r.lang),
          datasets: [{ label: 'AI 比率', data: rows.map((r) => r.ratio * 100), backgroundColor: seriesColor(0) }],
        },
        options: {
          indexAxis: 'y',
          maintainAspectRatio: false,
          scales: { x: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const r = rows[ctx.dataIndex];
                  return r ? `${percent(r.ratio)}（${r.ai} / ${r.total} 件）` : '';
                },
              },
            },
          },
        },
      }),
  );
};

interface TableState {
  query: string;
  genre: GenreId | typeof ALL;
  category: CategoryId | typeof ALL;
  newOnly: boolean;
}

const renderRanking = (snapshot: Snapshot, index: IndexFile, dayIndex: number, state: TableState): void => {
  const previous = index.days[dayIndex - 1];
  const query = state.query.trim().toLowerCase();
  const rows = snapshot.repos
    .slice(0, index.topN)
    .map((repo, i) => ({ repo, rank: i + 1, isNew: previous ? !previous.top.includes(repo.name) : false }))
    .filter(({ repo, isNew }) => {
      if (state.newOnly && !isNew) return false;
      if (state.genre && repo.genre !== state.genre) return false;
      if (state.category && !repo.categories.includes(state.category)) return false;
      return !query || `${repo.name} ${repo.description}`.toLowerCase().includes(query);
    });

  const gain = (v: number): string => (v > 0 ? number.format(v) : '—');
  el('#ranking').innerHTML = rows
    .map(({ repo, rank, isNew }) => {
      const chips = [
        `<span class="chip genre">${escapeHtml(GENRE_LABELS[repo.genre])}</span>`,
        ...repo.categories.map((id) => `<span class="chip">${escapeHtml(categoryLabel(id))}</span>`),
      ].join('');
      return `<tr>
        <td class="num">${rank}</td>
        <td class="repo">
          <a href="https://github.com/${escapeHtml(repo.name)}" target="_blank" rel="noopener">${escapeHtml(repo.name)}</a>${
            isNew ? '<span class="badge-new">NEW</span>' : ''
          }
          <div class="desc">${escapeHtml(repo.description)}</div>
          <div class="chips">${chips}</div>
        </td>
        <td>${escapeHtml(repo.language ?? '—')}</td>
        <td class="num">${number.format(repo.stars)}</td>
        <td class="num">${gain(repo.gains.daily)}</td>
        <td class="num">${gain(repo.gains.weekly)}</td>
        <td class="num">${gain(repo.gains.monthly)}</td>
        <td class="num">${streakOf(index.days, dayIndex, repo.name)} 日</td>
      </tr>`;
    })
    .join('');
  el('#ranking-count').textContent = `${rows.length} 件を表示`;
};

const fillSelect = (select: HTMLSelectElement, allLabel: string, options: readonly [string, string][]): void => {
  select.innerHTML = [
    `<option value="${ALL}">${allLabel}</option>`,
    ...options.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`),
  ].join('');
};

const main = async (): Promise<void> => {
  applyChartTheme();
  const index = await fetchJson<IndexFile>('./index.json');
  if (index.days.length === 0) throw new Error('No data collected yet.');

  const dateSelect = el<HTMLSelectElement>('#date-select');
  dateSelect.innerHTML = [...index.days]
    .reverse()
    .map((d) => `<option value="${d.date}">${d.date}</option>`)
    .join('');

  const genreFilter = el<HTMLSelectElement>('#genre-filter');
  const categoryFilter = el<HTMLSelectElement>('#category-filter');
  fillSelect(
    genreFilter,
    'すべてのジャンル',
    GENRE_IDS.map((id) => [id, GENRE_LABELS[id]]),
  );
  fillSelect(
    categoryFilter,
    'すべてのカテゴリ',
    CATEGORIES.map((c) => [c.id, c.label]),
  );
  document.querySelectorAll('.top-n').forEach((n) => (n.textContent = String(index.topN)));
  el('#footer').textContent = `最終更新: ${new Date(index.updatedAt).toLocaleString('ja-JP')}`;

  const table: TableState = { query: '', genre: ALL, category: ALL, newOnly: false };
  const snapshots = new Map<string, Snapshot>();
  let current: { snapshot: Snapshot; dayIndex: number } | null = null;

  const showDate = async (date: string): Promise<void> => {
    const dayIndex = index.days.findIndex((d) => d.date === date);
    const day = index.days[dayIndex];
    if (!day) return;
    const snapshot = snapshots.get(date) ?? (await fetchJson<Snapshot>(`./snapshots/${date}.json`));
    snapshots.set(date, snapshot);
    current = { snapshot, dayIndex };
    renderKpis(snapshot, day, index.days[dayIndex - 1]);
    renderAiDonuts(day);
    renderGenreDonuts(day);
    renderCategoryChart(day);
    renderLanguageChart(snapshot.repos);
    renderRanking(snapshot, index, dayIndex, table);
  };

  const rerenderTable = (): void => {
    if (current) renderRanking(current.snapshot, index, current.dayIndex, table);
  };

  dateSelect.addEventListener('change', () => void showDate(dateSelect.value));
  el<HTMLInputElement>('#search').addEventListener('input', (e) => {
    table.query = (e.currentTarget as HTMLInputElement).value;
    rerenderTable();
  });
  genreFilter.addEventListener('change', () => {
    table.genre = GENRE_IDS.find((id) => id === genreFilter.value) ?? ALL;
    rerenderTable();
  });
  categoryFilter.addEventListener('change', () => {
    table.category = CATEGORY_IDS.find((id) => id === categoryFilter.value) ?? ALL;
    rerenderTable();
  });
  el<HTMLInputElement>('#new-only').addEventListener('change', (e) => {
    table.newOnly = (e.currentTarget as HTMLInputElement).checked;
    rerenderTable();
  });

  const trendRenderers: Record<string, (index: IndexFile, scope: Scope) => void> = {
    trend: renderTrend,
    'genre-trend': renderGenreTrend,
  };
  document.querySelectorAll<HTMLElement>('.segmented').forEach((group) => {
    const render = trendRenderers[group.dataset.chart ?? ''];
    if (!render) return;
    const buttons = group.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.toggle('active', b === button));
        render(index, button.dataset.scope === 'all' ? 'all' : 'top');
      });
    });
  });

  renderTrend(index, 'top');
  renderGenreTrend(index, 'top');
  await showDate(dateSelect.value);
};

main().catch((error: Error) => {
  el('#kpis').innerHTML = `<div class="kpi"><div class="value">読み込み失敗</div><div class="label">${escapeHtml(
    error.message,
  )}</div></div>`;
});
