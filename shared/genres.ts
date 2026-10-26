import { AI_PATTERN } from './categories.ts';

/**
 * Mutually exclusive genres. Each repo gets the first genre whose pattern matches,
 * so the order here is the matching priority.
 */
export const GENRES = [
  { id: 'ai', label: 'AI / エージェント', pattern: AI_PATTERN },
  {
    id: 'security',
    label: 'セキュリティ',
    pattern:
      /secur|pentest|penetration|vulnerab|malware|reverse engineer|exploit|\bctf\b|osint|hacker|password|firewall|\bwaf\b|threat|fuzz|scanner|owasp|isolation|containment|identity|metasploit/i,
  },
  {
    id: 'finance',
    label: '金融',
    pattern: /trading|financ|stock|crypto|bitcoin|quant|accounting|invoice|payment|budget|market data|量化|会计|记账/i,
  },
  {
    id: 'game',
    label: 'ゲーム / エミュレータ',
    pattern:
      /\bgames?\b|(?<!terminal |aws local )emulat|minecraft|\bps[1-5]\b|playstation|nintendo|steam|\bmods?\b|modding|recomp|retro|chess|tibia|warcraft|fivem|godot|arknights|genshin|原神|明日方舟|galgame|visual novel|geometry dash|simulator|voxel|mmo|zelda|\bgta\b|wow classic|portmaster|theme hospital|bettergi|decompilation of|reimplementation of|il2cpp|\bunity\b/i,
  },
  {
    id: 'learning',
    label: '学習 / まとめ',
    pattern:
      /learn|tutorial|guide|course|roadmap|\bbook\b|awesome|教程|interview|algorithm|bootcamp|\d+[- ]days|self-taught|education|学习|指南|cheat ?sheet|curated|collection of|teach|documentation/i,
  },
  {
    id: 'media',
    label: '動画 / 音声 / メディア',
    pattern:
      /video|audio|voice|music|stream|iptv|anime|manga|comic|ebook|podcast|player|dubb|subtitle|youtube|spotify|jellyfin|kodi|movie|番剧|影视|漫画|直播|torrent|\bepg\b|photo|sprite|pixel art|screen ?record|speech|\btv\b|novel|小说|koreader|读书/i,
  },
  {
    id: 'network',
    label: 'ネットワーク / プロキシ',
    pattern:
      /proxy|\bvpn\b|clash|v2ray|xray|sing-box|shadowsocks|翻墙|科学上网|tunnel|\bdns\b|\bads?\b|mesh|bluetooth|network|remote desktop|airdrop|file transfer|网盘|download|wifi|cdn/i,
  },
  {
    id: 'infra',
    label: 'インフラ / セルフホスト / DB',
    pattern:
      /self-host|database|\bsql|postgres|sqlite|redis|kubernetes|docker|cloud|server|deploy|paas|serverless|storage|backup|monitoring|observability|search engine|home automation|proxmox|mail|replication|time-series|distributed|\berp\b|\bcrm\b|analytics|scheduling|e-?commerce|helpdesk|support desk|health records|asset management|it management|management platform|homelab|systemd|hardware monitor|bootable|\busb\b|panel|blog|建站|community|smart charging|subdomain|weather/i,
  },
  {
    id: 'devtool',
    label: '開発ツール',
    // End-user apps that mention "CLI", "engine", "toolkit" etc. fall through to later genres.
    exclude: /cleaner|\bpc clean|menu bar|grammar|translat|\bocr\b|\bcad\b|freecad|parametric modeler|operating system|streak/i,
    pattern:
      /\bcli\b|command[- ]line|terminal|editor|\bide\b|compiler|framework|library|\bsdk\b|\bapi\b|debug|\bbuild|lint|\btest|runtime|programming language|bundler|package manager|neovim|\bvim\b|\bgit\b|static site|typescript|javascript|python|\brust\b|\bgo\b|parser|components|design system|\bcss\b|react|plugin|shell|interpreter|theorem|language server|toolkit|code\b|developer|\bhash|engine|dependency|version manager|dependabot|\bnvim\b|\blsp|treesitter|functional language|dynamic language|spring|rails|jruby|composer|\bzig\b|svg|theme|readme/i,
  },
  {
    id: 'app',
    label: 'モバイル / デスクトップアプリ',
    pattern:
      /android|\bios\b|ipad|macos|\bmac\b|windows|linux|desktop|mobile|menu bar|\bapp\b|tracker|\bnotes?\b|messenger|\bchat\b|calendar|launcher|keyboard|firmware|browser|client|reader|file manager|cleaner|front-?end for|scan|screenshot|viewer|拼音|input method|map generator|digital sign|grammar|translat|\bocr\b|\bcad\b|freecad|parametric modeler/i,
  },
] as const;

export const OTHER_GENRE = { id: 'other', label: 'その他' } as const;

export type GenreId = (typeof GENRES)[number]['id'] | typeof OTHER_GENRE.id;

export const GENRE_IDS: GenreId[] = [...GENRES.map((g) => g.id), OTHER_GENRE.id];

export const GENRE_LABELS = Object.fromEntries([
  ...GENRES.map((g) => [g.id, g.label]),
  [OTHER_GENRE.id, OTHER_GENRE.label],
]) as Record<GenreId, string>;

/** Used only when no pattern matches: these languages are almost always end-user apps. */
const LANGUAGE_FALLBACK: Partial<Record<string, GenreId>> = { Kotlin: 'app', Swift: 'app', Dart: 'app' };

export const genreOf = (text: string, language: string | null): GenreId =>
  GENRES.find((g) => g.pattern.test(text) && !('exclude' in g && g.exclude.test(text)))?.id ??
  (language ? LANGUAGE_FALLBACK[language] : undefined) ??
  OTHER_GENRE.id;
