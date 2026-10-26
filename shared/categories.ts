/** Shared by the "AI 全般" category and the "AI / エージェント" genre so both agree. */
export const AI_PATTERN =
  /\bai\b|llm|agent|gpt|claude|codex|cursor|\bmcp\b|neural|machine learning|deep learning|diffusion|\brag\b|prompt|copilot|inference|\bml\b|language model|大模型|nemotron|training recipe|motion recovery/i;

export const CATEGORIES = [
  { id: 'ai', label: 'AI 全般', pattern: AI_PATTERN },
  {
    id: 'codingAgent',
    label: 'コーディングエージェント周辺',
    pattern:
      /claude|codex|cursor|opencode|copilot|gemini cli|antigravity|\bkiro\b|skills?\b|harness|coding agent|agentic coding|vibe cod/i,
  },
  { id: 'mcp', label: 'MCP', pattern: /\bmcp\b/i },
  {
    id: 'local',
    label: 'ローカル / セルフホスト',
    pattern: /local-first|fully-local|self-host|offline|on-device|privacy|private/i,
  },
  { id: 'alternative', label: '代替 OSS / 無料化', pattern: /alternative|replacement|\bfree\b/i },
  {
    id: 'security',
    label: 'セキュリティ',
    pattern: /secur|pentest|penetration|sandbox|vulnerab|malware|reverse engineer|exploit|\bctf\b|osint/i,
  },
  {
    id: 'media',
    label: '動画 / 音声',
    pattern: /video|audio|voice|music|stream|iptv|anime|番剧|影视|player|dubb/i,
  },
  {
    id: 'learning',
    label: '学習 / まとめ',
    pattern: /learn|tutorial|guide|course|roadmap|\bbook\b|awesome|教程|interview/i,
  },
  { id: 'finance', label: '金融', pattern: /trading|financ|stock|crypto|quant|market data/i },
  {
    id: 'proxy',
    label: 'プロキシ / VPN',
    pattern: /proxy|\bvpn\b|clash|v2ray|xray|sing-box|翻墙|科学上网|shadowsocks/i,
  },
  { id: 'game', label: 'ゲーム / エミュレータ', pattern: /\bgames?\b|emulat|minecraft|\bps[345]\b|nintendo|steam|\bmod\b/i },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);

export const classify = (text: string): CategoryId[] =>
  CATEGORIES.filter((c) => c.pattern.test(text)).map((c) => c.id);
