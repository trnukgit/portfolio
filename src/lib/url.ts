// BASE_URL のスラッシュ有無に依存しない URL ビルダー。
// Astro の `base` を `/repo` と `/repo/` どちらで書いても正しく動く。

import type { Lang } from '../config';

const RAW = import.meta.env.BASE_URL || '/';

// 末尾スラッシュを取り除いた "ルート" 表現
//   '/'        → ''
//   '/repo'    → '/repo'
//   '/repo/'   → '/repo'
const ROOT = RAW.replace(/\/+$/, '');

/**
 * ベース URL に相対パスを連結する(言語非依存)。
 * @example
 *   url('favicon.svg')        → '/repo/favicon.svg'
 *   url('/images/x.png')      → '/repo/images/x.png'
 */
export function url(p: string = ''): string {
  if (!p) return ROOT === '' ? '/' : ROOT + '/';
  const clean = p.startsWith('/') ? p : `/${p}`;
  return ROOT + clean;
}

/** ルート("/" or "/repo")を返す。リンクの起点として使う。 */
export const root = ROOT === '' ? '/' : ROOT + '/';

/**
 * 言語付きのパスを構築する。
 *   langUrl('ja', '')                  → '/repo/'
 *   langUrl('en', '')                  → '/repo/en/'
 *   langUrl('ja', 'works/foo/')        → '/repo/works/foo/'
 *   langUrl('en', 'works/foo/')        → '/repo/en/works/foo/'
 */
export function langUrl(lang: Lang, p: string = ''): string {
  const clean = p.replace(/^\/+/, '');
  if (lang === 'en') {
    return url(`en/${clean}`);
  }
  return url(clean);
}

/** 言語のホーム(トップページ)URL */
export function langHome(lang: Lang): string {
  return langUrl(lang, '');
}

/** 作品詳細のURL */
export function workUrl(lang: Lang, slug: string): string {
  return langUrl(lang, `works/${slug}/`);
}
