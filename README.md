# Portfolio (JA / EN)

Notion をデータソースに、GitHub Pages に **日本語版・英語版** 両方を公開する静的ポートフォリオサイト。

- **構成**: Astro(静的サイトジェネレータ) + Notion API + GitHub Pages
- **URL構造**:
  - 日本語: `https://...repo/`
  - 英語: `https://...repo/en/`
- **デザイン**: モダン・ミニマル。薄いグレージュの背景に、白/黒の額縁で大小さまざまな作品をクラスター配置。アクセントカラーはライムイエロー。タイポグラフィは Inter / Helvetica 系のサンセリフで統一。
- **設計思想**:
  - ① Notion に作品を追加するだけで、自動で両言語のサイトに反映される
  - ② 一覧ではキャッチコピーを常時表示、ホバー(PC)/中央交差(モバイル)で詳細(タイトル+概要+CTA)が暗いスクリムでオーバーレイ表示される
  - ③ 配置はクラスター展示アルゴリズム(`src/lib/wall-layout.ts`)で決定論的に算出される。同じ並びの入力に対して常に同じレイアウトを返す
  - ④ About セクションのプロフィール情報も Notion で管理(任意)

---

## 1. Notion 側の準備

### 1-1. インテグレーションを作成

1. <https://www.notion.so/my-integrations> にアクセス
2. **「+ New integration」** → 名前(例: `Portfolio Site`)を入力 → **Submit**
3. **Internal Integration Secret** をコピー → 後で `NOTION_TOKEN` として使う

### 1-2. Works データベースのプロパティ

| プロパティ名         | 種類           | 用途                                                                                                  |
| -------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| **Name**             | Title          | 日本語タイトル                                                                                        |
| **Name (EN)**        | Text           | 英語タイトル                                                                                          |
| **Catchphrase**      | Text           | 一覧で常に見える日本語キャッチコピー                                                                  |
| **Catchphrase (EN)** | Text           | 同・英語                                                                                              |
| **Summary**          | Text           | ホバー時に出る 1〜2 文の日本語概要                                                                    |
| **Summary (EN)**     | Text           | 同・英語                                                                                              |
| **Cover**            | Files & media  | サムネイル画像(言語共通)                                                                            |
| **Slug**             | Text           | URL に使う英数字(例: `my-app`)。空なら自動生成。**両言語で同じ slug**                                |
| **Tags**             | Multi-select   | カテゴリ(言語共通)                                                                                  |
| **Date**             | Date           | 並び順に使われる日付                                                                                  |
| **URL**              | URL            | 外部リンク(任意)                                                                                    |
| **Order**            | Number         | 手動の並び順(任意)                                                                                  |
| **Frame**            | Select         | 額縁の種類(任意。`white` / `white-thick` / `black` / `bare`)。空ならパターンの既定値が使われる         |
| **Languages**        | Multi-select   | 公開する言語。`ja` / `en` を選択。**空の場合は両言語に公開される**(片方だけにしたい場合のみ値を入れる)                            |
| **Published**        | Checkbox       | チェックを入れた作品だけサイトに表示される                                                            |

> プロパティ名の大文字小文字は問いません。`name` でも `NAME` でも OK です。
> `Name (EN)` などの英語プロパティを空にすると、日本語の値がフォールバックとして使われます。

### 1-3. データベース本文(詳細ページ)の書き方

Notion ページの本文に書いた内容(見出し・段落・画像・リスト・引用など)が、詳細ページに自動でレンダリングされます。

**両言語で違う本文を出したい場合**は、本文中に `--- en ---` の行を入れて区切ってください。

```
これは日本語の本文です。

このプロジェクトの背景や工夫を書きます。

--- en ---

This is the English body.

It can be a totally different write-up.
```

- 区切りより前: 日本語版に表示
- 区切りより後: 英語版に表示
- 区切りが無い場合: 両言語に同じ本文が表示される
- 任意で本文の前半に `--- ja ---` を書いて明示することもできます(その行は日本語版の表示から除去されます)
- 区切り文字はコードブロック(```` ``` ````)の中なら無視されます

### 1-4. データベースをインテグレーションに共有 + ID 取得

データベース右上の **「…」 → Connections → Portfolio Site** で接続。

URL の形式:

```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=...
```

`<DATABASE_ID>` 部分(32 文字)が **`NOTION_WORKS_DB_ID`**。

### 1-5. Profile データベース(About セクション用・任意)

About セクションの「プロフィール写真・名前・所属・自己紹介本文」を Notion で管理したい場合は、**もう 1 つ別のデータベース**を作成して以下のプロパティを持たせます。1 行だけ作ればよく、その行が About に表示されます。

| プロパティ名         | 種類           | 用途                                                                                  |
| -------------------- | -------------- | ------------------------------------------------------------------------------------- |
| **Name**             | Title          | 日本語の表示名(例: 山田太郎)                                                        |
| **Name (EN)**        | Text           | 英語の表示名                                                                          |
| **Affiliation**      | Text           | 日本語の所属/肩書き(例: デザイナー / 〇〇株式会社)                                  |
| **Affiliation (EN)** | Text           | 英語の所属/肩書き                                                                     |
| **Photo**            | Files & media  | プロフィール写真(任意・1 枚)                                                        |

**自己紹介の本文(bio)** は、その行のページ本文(Markdown)に書きます。Works と同じく `--- en ---` で区切ると JA / EN を別々に書け、無ければ同じ本文が両言語で使われます。

データベース ID を **`NOTION_PROFILE_DB_ID`** として `.env` または GitHub Secrets に設定してください。Connections への共有も同様に必要です。

未設定でもサイトは動きます(About セクションが非表示になるだけ)。

### 1-6. Hero データベース(ヒーロー文の背景イラスト・任意)

トップページのヒーロー(タイトル文)の背景に、透過 PNG のイラストを差し込めます。Notion で 1 行だけのデータベースを作成:

| プロパティ名         | 種類           | 用途                                                                                  |
| -------------------- | -------------- | ------------------------------------------------------------------------------------- |
| **Name**             | Title          | 識別用の名前(任意)                                                                  |
| **Image**            | Files & media  | PC 用(モバイル兼用)の透過 PNG(gallery デザインで使用)                              |
| **Image (Mobile)**   | Files & media  | モバイル専用の透過 PNG(任意。空なら Image が両方で使われる)                         |
| **Video**            | Files & media  | PC 用(モバイル兼用)の動画(mp4 推奨。terminal デザインで使用)                       |
| **Video (Mobile)**   | Files & media  | モバイル専用の動画(任意)                                                            |

データベース ID を **`NOTION_HERO_DB_ID`** として `.env` または GitHub Secrets に設定し、Connections への共有も忘れずに。

**PC 用とモバイル用、分けるべき?**

PC のヒーロー領域は横長(1:0.4 程度)、モバイルは縦長気味(1:1.2)で **アスペクト比がかなり違います**。

- 1 枚で運用 → PC で美味しい構図がモバイルで切れたり、逆にモバイル向けの構図が PC で間延びしがち
- 2 枚で運用 → PC は右側に寄せた横長、モバイルは正方形〜縦長中央寄せのように、別々に作ると両環境で破綻しません

そこで **両モード対応**にしてあります。`Image` だけ入れれば全環境で同じ画像、`Image (Mobile)` も入れればモバイル時のみそちらが使われます。

**PC**: ヒーロー文の **背景** に絶対配置(右側に寄せる初期設定)。テキストとイラストが重なって表示される。

**モバイル**: ヒーロー文の **下** に縦並びで配置(重ならない)。狭い画面でもテキストの可読性が保たれる。

イラストの配置・大きさ・透明度は CSS 変数で調整できます(`src/components/Home.astro` の `.hero-bg` セクション):

```css
/* PC 用 */
--hero-bg-fit: contain;            /* contain | cover */
--hero-bg-position: right center;  /* オブジェクト位置 */
--hero-bg-opacity: 1;              /* 不透明度 */

/* モバイル用 */
--hero-bg-opacity-mobile: 1;
--hero-bg-mobile-margin-top: 1.5rem;     /* テキスト ↔ 画像 の間隔 */
--hero-bg-mobile-margin-bottom: 0;        /* 画像 ↔ Works の間隔 */
```

なおイラストはヒーロー領域だけにクリップされ、下の Works セクションにははみ出しません(`overflow: hidden`)。

### 1-7. Viewers データベース(ギャラリーの鑑賞者・任意)

ギャラリーの手前に立つ「鑑賞者」(museum on-lookers)の画像を Notion で管理したい場合に作成します。透過 PNG など人型の画像を想定。

| プロパティ名         | 種類           | 用途                                                             |
| -------------------- | -------------- | ---------------------------------------------------------------- |
| **Name**             | Title          | 識別用の名前(任意。例: man1)                                  |
| **Image**            | Files & media  | 鑑賞者の画像(透過 PNG 推奨。1 行 = 1 枚)                       |
| **Order**            | Number         | 並び順(任意。サイクル時の順番に影響)                           |

データベース ID を **`NOTION_VIEWERS_DB_ID`** として `.env` または GitHub Secrets に設定。Connections で接続も忘れずに。

**Notion を使わない場合**: `public/images/viewers/` に `man1.png` など PNG ファイルを直接置いてもよく、build 時にそれらが自動で読み込まれます。`NOTION_VIEWERS_DB_ID` 未設定なら自動でこちらの方式になります。

表示する人数や不透明度などは `src/config.ts` の `VIEWERS` で調整できます:

```ts
export const VIEWERS = {
  count: 4,        // 表示する人数(画像数より多くてもよい。同じ画像を循環)
  opacity: 1,      // 不透明度 (0〜1)
  jitter: 4,       // 横位置のばらつき (%)
};
```

鑑賞者の高さは `src/styles/global.css` の `--viewer-h`、頭が 1 段目フレームに被る量は `src/scripts/viewers-parallax.ts` の `HEAD_OVERLAP_RATIO` で調整できます。

**モバイル時の挙動**: PC は 1 段目フレーム下から最終段フレーム下までを sticky 範囲としますが、モバイル(縦積み 1 列)では、**最初の作品の真下〜最後の作品の真下** の範囲で同じ動きをします(`HEAD_OVERLAP_RATIO_MOBILE` 定数で被り量を別途調整可能)。

---

## 2. ローカルで動かす

```bash
# 依存をインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env
# .env を開いて NOTION_TOKEN と NOTION_WORKS_DB_ID を記入

# 起動
npm run dev
```

- 日本語版: <http://localhost:4321/>
- 英語版: <http://localhost:4321/en/>

> 起動時に `scripts/fetch-notion.mjs` が走り、Notion からデータを取得して
> `src/data/works.ja.json` と `src/data/works.en.json`、`public/images/works/` を生成します。
> Notion を編集した後にすぐ反映させたいときは、サーバを再起動するか
> `npm run fetch` を別ターミナルで実行してください。

---

## 3. ブランディングを変える

### 3-1. サイト名・連絡先・コピー文言

`src/config.ts` を編集します。各言語ごとに独立して書けます:

```ts
STRINGS.ja = {
  name: 'Your Name',
  title: 'Your Name — Portfolio',
  description: '...',
  heroTitleHTML: '<em>A record of</em> things made,...',  // <em> タグでイタリック化
  tagline: 'つくったもの、関わったもの、考えてきたこと。',
  // ...
};

STRINGS.en = {
  name: 'Your Name',
  // ...
  tagline: 'Selected work, and the thinking around it.',
};
```

### 3-2. About me(プロフィール)

About セクションのプロフィール写真・名前・所属・自己紹介本文は **Notion の Profile データベースで管理** します(セットアップは「1-5. Profile データベース」を参照)。

`NOTION_PROFILE_DB_ID` を設定しない場合、About セクションは表示されません。

### 3-3. 色やフォント

`src/styles/global.css` の `:root` に CSS 変数(`--bg`, `--ink`, `--accent` など)が集約されています。ここを書き換えるとサイト全体の見た目が変わります。

### 3-4. デザインモードを切り替える

2 つのデザインから選べます。`src/config.ts` の **`DESIGN`** を変えるだけで切り替わります。

```ts
export const DESIGN: 'gallery' | 'terminal' = 'gallery';
```

| モード       | 概要                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| `gallery`    | 美術館の壁・クラスター展示・鑑賞者パララックス。Inter / Helvetica 系サンセリフ          |
| `terminal`   | OS / ターミナル風・3:4 サムネイル等間隔グリッド・モノスペースフォント。鑑賞者は無し       |

データベース(works/profile/hero)は両モードで共通。同じ Notion を使ったまま見た目だけ切り替えられます。

`terminal` モードのヒーロー文は両言語共通で固定:

```ts
export const TERMINAL = {
  heroText: 'Nothing becomes simple when seen from every side.',
};
```

変えたければここを書き換えてください。

### 3-4. 額縁(フレーム)の出方をカスタマイズする

各作品の額縁は **白枠 / 白太枠 / 黒枠 / 額なし** の 4 種類があります(`white` / `white-thick` / `black` / `bare`)。 デフォルトはランダムではなく、**作品数 → クラスター・パターン → 各スロットの額縁** という決定論的な仕組みで割り当てられます。同じ並びの作品なら何度ビルドしても同じ配置になります。

##### 全体的な傾向を変えたい場合

`src/lib/wall-layout.ts` を編集します。`P_FEW`(1〜3 件)、`P4`、`P5`、`P6`、`P7` という名前で、人数ごとのクラスター・パターンが定義されています。各スロットの `frame:` を好きな値(`'white' / 'white-thick' / 'black' / 'bare'`)に書き換えるだけで OK です。

```ts
// 例: P6 の Pattern A の真ん中の作品を黒枠にしたい
const P6: Slot[][] = [
  [
    { x: 4,  y: 26, w: 16, aspect: 0.80, frame: 'white' },
    { x: 24, y: 10, w: 10, aspect: 1.10, frame: 'black' },     // ← 変更
    ...
```

##### 個別の作品だけ額縁を指定したい場合

Notion の Works データベースに `Frame` という Select プロパティを追加し、`white` / `white-thick` / `black` / `bare` のいずれかを設定すると、その作品だけパターンの割当を上書きできます。空のままなら通常通りパターン側の値が使われます。

---

## 4. GitHub Pages に公開する

### 4-1. リポジトリへ push

```bash
git init
git remote add origin https://github.com/<YOU>/<REPO>.git
git add .
git commit -m "init"
git push -u origin main
```

### 4-2. `astro.config.mjs` の `site` / `base` を書き換え

```js
// ユーザーページ (https://USERNAME.github.io) の場合:
site: 'https://USERNAME.github.io',
base: '/',

// プロジェクトページ (https://USERNAME.github.io/REPO_NAME) の場合:
site: 'https://USERNAME.github.io',
base: '/REPO_NAME',
```

### 4-3. GitHub 側の設定

- **Settings → Pages → Source: GitHub Actions** を選択
- **Settings → Secrets and variables → Actions** で以下を登録:
  - `NOTION_TOKEN` ← Notion インテグレーションのトークン
  - `NOTION_WORKS_DB_ID` ← データベース ID

### 4-4. デプロイ

`main` に push すると `.github/workflows/deploy.yml` が動き、サイトがビルド・公開されます。

---

## 5. Notion を編集 → サイトに反映する方法

- **A. 自動(6時間ごと)**: cron で定期再ビルド(deploy.yml に記述済み)
- **B. 手動**: Actions タブ → **Run workflow** ボタン
- **C. Webhook(上級者向け)**: Notion から `repository_dispatch` を叩いて即時再デプロイ

```bash
curl -X POST \
  -H "Authorization: Bearer <YOUR_GITHUB_PAT>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<YOU>/<REPO>/dispatches \
  -d '{"event_type":"notion-update"}'
```

---

## 6. ファイル構成

```
.
├── astro.config.mjs
├── package.json
├── public/
│   ├── favicon.svg
│   └── images/                 # ビルド時に生成(works / profile / viewers)
├── scripts/
│   └── fetch-notion.mjs        # Notion からデータ取得 + 言語別 JSON 出力
├── src/
│   ├── config.ts               # 言語別ブランディング・UI文言・VIEWERS設定
│   ├── data/                   # 自動生成(works / profile / viewers)
│   │   ├── works.ja.json
│   │   ├── works.en.json
│   │   ├── profile.ja.json
│   │   ├── profile.en.json
│   │   └── viewers.json
│   ├── lib/
│   │   ├── types.ts
│   │   ├── url.ts              # 言語付きパスのビルダー
│   │   └── wall-layout.ts      # クラスター配置パターン+額縁の割当
│   ├── layouts/Layout.astro
│   ├── components/
│   │   ├── Header.astro        # JA/EN トグルもここ
│   │   ├── Footer.astro
│   │   ├── About.astro
│   │   ├── WorkCard.astro
│   │   ├── Home.astro          # トップページ共通レイアウト
│   │   └── WorkDetail.astro    # 詳細ページ共通レイアウト
│   ├── scripts/
│   │   ├── center-reveal.ts    # モバイルの中央交差ハイライト
│   │   └── viewers-parallax.ts # 鑑賞者の sticky 追従
│   ├── pages/
│   │   ├── index.astro              # 日本語トップ →  /
│   │   ├── works/[slug].astro       # 日本語詳細 →  /works/foo/
│   │   └── en/
│   │       ├── index.astro          # 英語トップ →  /en/
│   │       └── works/[slug].astro   # 英語詳細 →  /en/works/foo/
│   ├── scripts/center-reveal.ts
│   └── styles/global.css
└── .github/workflows/deploy.yml
```

---

## 7. よくあるハマり

### 「英語版に作品が出ない」

- 既定では `Languages` プロパティが空の作品は **両言語**に公開されます。EN にだけ出ない場合は `Languages` に `ja` だけ入れていないか確認
- `Name (EN)` などの英語プロパティが空でも、日本語の値がフォールバックとして使われます

### 「言語切替トグルがトップに飛ぶ」

- 詳細ページの場合、反対言語側にもその作品が存在しないとトップにフォールバックします(設計通り)。両言語に出したいなら `Languages` を `ja, en` 両方に。

### 「画像が表示されない」

- `astro.config.mjs` の `base` が間違っている可能性が高いです
- プロジェクトページ(`/REPO_NAME` で公開)なら `base: '/REPO_NAME'` を必ず設定

### 「ローカルでは鑑賞者が出るのに、GitHub Pages では出ない」

`NOTION_VIEWERS_DB_ID` を Secrets に入れているのに反映されない場合は、まず GitHub Actions のログを開いて `→ Fetching viewers from Notion…` 直下に出力される診断メッセージを確認してください。

- `Notion returned 0 row(s)` → DB が空、または **インテグレーションに DB を Connect していない**(Notion の DB 右上「…」 → Connections)
- `Properties on first row: ...` のリストに **Image / Photo などが無い** → プロパティ名が違う(英語か漢字か / 単複の違い)。修正後に再ビルド
- `画像プロパティが見つかりません` の警告が並ぶ → 同上、プロパティ名のミスマッチ
- `viewer download failed: HTTP 401` 等 → トークンの権限不足。インテグレーションへの DB 共有を再確認

なお `NOTION_VIEWERS_DB_ID` を設定していて Notion から 1 件も取れなかった場合は、**自動的に `public/images/viewers/` 内のファイルにフォールバック**します。緊急時は `public/images/viewers/` に PNG を置いてコミット → push でも公開できます。

### 「ビルドは成功するけど 404」

- リポジトリの **Settings → Pages → Source** が **GitHub Actions** になっているか確認

---

Built with Astro · Notion · GitHub Pages
