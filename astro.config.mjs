// @ts-check
import { defineConfig } from 'astro/config';

// =============================================================
//  GitHub Pages 用の設定
// =============================================================
//  現在: プロジェクトページ
//    https://trnukgit.github.io/portfolio
//
//  ユーザーページ (https://USERNAME.github.io) に切り替える場合:
//    site: 'https://USERNAME.github.io'
//    base: '/'
// =============================================================

export default defineConfig({
  site: 'https://trnukgit.github.io',
  base: '/portfolio',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    assets: '_assets',
  },
});
