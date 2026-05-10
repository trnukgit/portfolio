// =============================================================
//   サイト全体の言語別文言。
//   各言語ごとに、ヒーローのコピーと UI ラベルをまとめています。
//   連絡先・著作権など言語共通のものは下にまとめています。
// =============================================================
//
//   ヒーローのタイトルだけ HTML を許容しています。
//   <strong>...</strong> はライムイエローのアクセント。
//   例: '<strong>A record</strong> of things made.'
// =============================================================

export const STRINGS = {
  ja: {
    // ブラウザタブ・OG など(「Portfolio」は表示しません)
    name: 'nanako toriu',
    title: 'tori portfolio',
    description: 'これまでつくってきたものの記録。',

    // ヒーロー
    heroTitleHTML:
      '<strong>つくった</strong>もの、<br/>関わったもの、<br/>考えてきたこと。',
    year: '2026',

    // ナビゲーション
    nav: { works: 'Works', about: 'About', contact: 'Contact' },

    // Worksセクション
    works: {
      eyebrow: 'Selected Works',
      countSuffix: '',
      hint: '',
      empty: 'empty',
    },

    // 作品カード
    card: {
      cta: 'Read more',
    },

    // 詳細ページ
    detail: {
      back: 'all works',
      date: 'Date',
      tags: 'Tags',
      link: 'Link',
      prev: 'prev',
      next: 'next',
    },

    // About
    about: {
      eyebrow: 'About',
      // heading は使いません(モダン・ミニマルではプロフィール+本文のみ表示)
    },

    // フッター
    footer: {
      eyebrow: 'Get in touch',
      lead: 'Reach out anytime.',
    },

    switchTo: 'EN',
  },

  en: {
    name: 'nanako toriu',
    title: 'Hi, I am tori.',
    description: 'A record of things made over the years.',

    heroTitleHTML:
      '<strong>A record</strong> of things made,<br/>shaped, and thought through.',
    year: '2026',

    nav: { works: 'Works', about: 'About', contact: 'Contact' },

    works: {
      eyebrow: 'Selected Works',
      countSuffix: ' works',
      hint: 'hover / center to preview',
      empty: 'Once your Notion Works database is connected, items will appear here.',
    },

    card: {
      cta: 'Read more',
    },

    detail: {
      back: 'all works',
      date: 'Date',
      tags: 'Tags',
      link: 'Link',
      prev: 'Prev',
      next: 'Next',
    },

    about: {
      eyebrow: 'About',
    },

    footer: {
      eyebrow: 'Get in touch',
      lead: 'Reach out anytime.',
    },

    switchTo: 'JA',
  },
} as const;

// 言語共通の設定
export const SITE = {
  contacts: [
    { label: 'Email', href: 'nishimita0601@gmail.com' },
    { label: 'Instagram', href: 'https://instagram.com/trn_uk' },
    // { label: 'GitHub', href: 'https://github.com/yourhandle' },
  ],
  copyright: '© nanako toriu',
};

// =============================================================
//   ギャラリーの「鑑賞者」(viewers)の表示設定
//   画像自体は Notion の Viewers データベースで管理する。
//   詳しくは README の「Viewers データベース」を参照。
// =============================================================
export const VIEWERS = {
  /**
   * 表示する鑑賞者の人数。
   * Notion の画像数より多くてもよい(同じ画像をくり返し使う)。
   * くり返し時に同じ画像が隣り合わないようロジックで担保される。
   */
  count: 7,

  /**
   * 不透明度 (0 = 完全透明 / 1 = 不透明)。
   * 背景に少しなじませたい場合は 0.85〜0.95 程度がおすすめ。
   */
  opacity: 0.9,

  /**
   * 横位置のばらつき (%)。0 で完全等間隔、大きくするほど不揃い感が増す。
   */
  jitter: 7,
};

export type Lang = 'ja' | 'en';
export type SiteStrings = (typeof STRINGS)[Lang];

export function strings(lang: Lang): SiteStrings {
  return STRINGS[lang];
}

// =============================================================
//   デザイン切替
// =============================================================
//   'gallery'  : 美術館の壁・クラスター展示・鑑賞者パララックス(現行)
//   'terminal' : OS / ターミナル風・3:4 サムネイル等間隔グリッド
//
//   切り替えると全ページ(JA/EN)に反映される。
//   既存のデータ(works/profile/hero/viewers)はそのまま使える。
// =============================================================
export const DESIGN: 'gallery' | 'terminal' = 'terminal';

// terminal モードでの上書き(必要なら)
export const TERMINAL = {
  /** ヒーロー文(両言語共通) */
  heroText: 'Nothing becomes simple when seen from every side.',
};
