export type Work = {
  id: string;
  slug: string;
  title: string;
  catchphrase: string;
  summary: string;
  cover: string | null;
  tags: string[];
  date: string | null;
  url: string | null;
  order: number | null;
  bodyMarkdown: string;
  /**
   * 個別の作品で額縁スタイルを上書きしたいとき設定する(任意)。
   * Notion の Frame プロパティ(Select)で指定。
   * 未設定なら `wall-layout.ts` の自動パターンが使われる。
   */
  frame: 'white' | 'white-thick' | 'black' | 'bare' | null;
};

/**
 * About セクション(プロフィール)の言語別データ。
 * Notion の Profile データベース(1 行)から取得する。
 *
 * すべてのフィールドは optional 扱い。Notion DB が未設定の場合や
 * 値が空の場合、対応する要素はレンダリングされない。
 */
export type Profile = {
  /** プロフィール写真のローカルパス(例: "/images/profile/xxxxx.jpg") */
  photo: string | null;
  /** 表示名 */
  name: string;
  /** 所属 / 肩書き(例: "Designer / Acme Inc.") */
  affiliation: string;
  /** 本文(markdown 文字列) */
  bio: string;
};

export const EMPTY_PROFILE: Profile = {
  photo: null,
  name: '',
  affiliation: '',
  bio: '',
};

/**
 * ヒーロー文の背景イラスト + 動画。Notion の Hero データベースで管理する。
 *   image:        PC 用画像(指定があればモバイル兼用にもなる)
 *   imageMobile:  モバイル専用画像(任意。空なら image が使われる)
 *   video:        PC 用動画(terminal デザイン用)
 *   videoMobile:  モバイル専用動画(任意)
 */
export type Hero = {
  image: string | null;
  imageMobile: string | null;
  video: string | null;
  videoMobile: string | null;
};

export const EMPTY_HERO: Hero = {
  image: null,
  imageMobile: null,
  video: null,
  videoMobile: null,
};

