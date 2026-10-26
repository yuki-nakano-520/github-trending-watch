# GitHub Trending Watch

GitHub Trending（今日・今週・今月 × 全体＋主要 19 言語 = 60 ページ）を毎日収集し、
カテゴリ比率の推移やランキングを GitHub Pages で表示します。

## 仕組み

- `scripts/collect.ts` … Trending ページを取得・重複排除・分類し、`data/` に JSON を保存
  - `data/snapshots/YYYY-MM-DD.json` … その日の全リポジトリ
  - `data/index.json` … 日ごとのカテゴリ比率と上位リスト（推移グラフ用）
- `shared/categories.ts` … カテゴリ定義（正規表現）。ここを編集すれば分類を調整できます
- `scripts/config.ts` … 対象言語・並列数・リトライ・スコア計算などの設定
- `site/` … Vite + Chart.js のダッシュボード。`data/` をそのまま静的ファイルとして配信
- `.github/workflows/trending.yml` … 毎日 09:00 JST に収集 → `data/` を commit → Pages にデプロイ

## ローカル実行

Node.js 24 以上（TypeScript をそのまま実行します）。

```bash
npm install
npm run collect   # data/ を更新
npm run dev       # http://localhost:5173
```

## GitHub への設置

1. このフォルダを GitHub リポジトリとして push（無料プランで Pages を使うなら public）
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
3. **Actions** タブで `Collect trending & deploy` を **Run workflow** で手動実行（初回）

以降は毎日自動で更新されます。

## 注意

- Trending には公式 API が無く HTML を解析しているため、GitHub の画面変更で壊れることがあります。
  60 ページ中 20% 超が失敗した場合はデータを書き込まずにジョブを失敗させます。
- スナップショットは 1 日あたり約 200 KB 増えます。
- 分類はキーワード一致による簡易判定です。
- スケジュール実行は、リポジトリが 60 日間アクティビティ無しだと GitHub により停止されます。
