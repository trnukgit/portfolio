// scripts/fetch-notion.mjs
//
// Notion API から Works データベースを取得し、
// 言語別 (ja / en) の JSON とローカルにコピーした画像を出力する。
//
// 出力:
//   - src/data/works.ja.json
//   - src/data/works.en.json
//   - public/images/works/ 以下に各画像

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { imageSize } from 'image-size';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// ---------- パスとセットアップ ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'images', 'works');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// ローカル開発時は .env を読み込む
async function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  try {
    const text = await fs.readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // .env が無くても OK (CI では env から渡される)
  }
}

await loadEnv();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_WORKS_DB_ID = process.env.NOTION_WORKS_DB_ID;

await fs.mkdir(DATA_DIR, { recursive: true });

if (!NOTION_TOKEN || !NOTION_WORKS_DB_ID) {
  console.warn(
    '⚠️  NOTION_TOKEN / NOTION_WORKS_DB_ID が未設定です。空のデータで進行します。'
  );
  await fs.writeFile(path.join(DATA_DIR, 'works.ja.json'), '[]');
  await fs.writeFile(path.join(DATA_DIR, 'works.en.json'), '[]');
  await fs.writeFile(
    path.join(DATA_DIR, 'profile.ja.json'),
    JSON.stringify({ photo: null, name: '', affiliation: '', bio: '' }, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_DIR, 'profile.en.json'),
    JSON.stringify({ photo: null, name: '', affiliation: '', bio: '' }, null, 2)
  );
  await fs.writeFile(
    path.join(DATA_DIR, 'hero.json'),
    JSON.stringify({ image: null, imageMobile: null, video: null, videoMobile: null }, null, 2)
  );
  // Viewers: just scan the filesystem (no Notion needed)
  try {
    const VIEWERS_DIR = path.join(ROOT, 'public', 'images', 'viewers');
    await fs.mkdir(VIEWERS_DIR, { recursive: true });
    const files = await fs.readdir(VIEWERS_DIR);
    const supported = /\.(png|jpe?g|webp|svg)$/i;
    const filenames = files
      .filter((f) => supported.test(f) && !f.startsWith('.'))
      .sort();
    const list = [];
    for (const f of filenames) {
      const filepath = path.join(VIEWERS_DIR, f);
      const dim = await readImageDimensions(filepath);
      list.push({
        path: `images/viewers/${f}`,
        width: dim?.width ?? null,
        height: dim?.height ?? null,
      });
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'viewers.json'),
      JSON.stringify(list, null, 2)
    );
  } catch {
    await fs.writeFile(path.join(DATA_DIR, 'viewers.json'), '[]');
  }
  process.exit(0);
}

const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// ---------- 画像ダウンロード ----------
await fs.mkdir(IMAGES_DIR, { recursive: true });

const downloadCache = new Map();

function stableFilename(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length >= 2) {
      const fileId = segs[segs.length - 2];
      const name = decodeURIComponent(segs[segs.length - 1]);
      const ext = path.extname(name) || '.jpg';
      return `${fileId}${ext}`;
    }
  } catch {}
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 16);
  const m = url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)(?:$|\?)/i);
  const ext = m ? `.${m[1].toLowerCase()}` : '.jpg';
  return `${hash}${ext}`;
}

async function downloadImage(url) {
  if (!url) return null;
  if (downloadCache.has(url)) return downloadCache.get(url);

  const filename = stableFilename(url);
  const filepath = path.join(IMAGES_DIR, filename);
  const publicPath = `images/works/${filename}`;

  try {
    await fs.access(filepath);
    downloadCache.set(url, publicPath);
    return publicPath;
  } catch {}

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filepath, buf);
    downloadCache.set(url, publicPath);
    console.log(`  ✓ image: ${filename}`);
    return publicPath;
  } catch (e) {
    console.warn(`  ✗ image fetch failed: ${url}`, e.message);
    return null;
  }
}

n2m.setCustomTransformer('image', async (block) => {
  const image = block.image;
  const url = image.type === 'file' ? image.file.url : image.external.url;
  const local = await downloadImage(url);
  const caption =
    image.caption?.map((c) => c.plain_text).join('') || '';
  if (!local) return '';
  return `![${caption}](/${local})`;
});

// ---------- プロパティ抽出ユーティリティ ----------
function plainText(rich) {
  if (!Array.isArray(rich)) return '';
  return rich.map((t) => t.plain_text).join('');
}

function getProp(props, name) {
  const keys = Object.keys(props);
  const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? props[key] : null;
}

function readProp(props, name) {
  const p = getProp(props, name);
  if (!p) return null;
  switch (p.type) {
    case 'title':
      return plainText(p.title);
    case 'rich_text':
      return plainText(p.rich_text);
    case 'url':
      return p.url || null;
    case 'number':
      return p.number;
    case 'checkbox':
      return p.checkbox;
    case 'date':
      return p.date?.start || null;
    case 'multi_select':
      return p.multi_select.map((s) => s.name);
    case 'select':
      return p.select?.name || null;
    case 'files': {
      const f = p.files?.[0];
      if (!f) return null;
      return f.type === 'file' ? f.file.url : f.external.url;
    }
    default:
      return null;
  }
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ---------- 本文を言語別に分割 ----------
//
//   `--- en ---` 行をマーカーとして分割する。
//   それより前は JA、それより後は EN とみなす。
//   コードブロック内のマーカーは無視する(``` で囲まれた中)。
//
// オプション:
//   `--- ja ---` を文書の前半に書いてもよい(その行は除去される)。
//
function splitBodyByLang(md) {
  if (!md) return { ja: '', en: '' };

  const lines = md.split('\n');
  let inCode = false;
  let enIdx = -1;

  const isFence = (l) => /^\s*```/.test(l);
  const isEnMarker = (l) => /^\s*---\s*en\s*---\s*$/i.test(l);
  const isJaMarker = (l) => /^\s*---\s*ja\s*---\s*$/i.test(l);

  for (let i = 0; i < lines.length; i++) {
    if (isFence(lines[i])) {
      inCode = !inCode;
      continue;
    }
    if (!inCode && isEnMarker(lines[i])) {
      enIdx = i;
      break;
    }
  }

  let ja, en;
  if (enIdx === -1) {
    ja = md;
    en = md; // マーカー無し → 同じ本文を両言語に
  } else {
    ja = lines.slice(0, enIdx).join('\n').trim();
    en = lines.slice(enIdx + 1).join('\n').trim();
  }

  // `--- ja ---` 行があれば除去
  ja = ja
    .split('\n')
    .filter((l) => !isJaMarker(l))
    .join('\n')
    .trim();

  return { ja, en };
}

// ---------- メイン処理 ----------
async function fetchAllPages(databaseId) {
  const all = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return all;
}

console.log('→ Fetching works from Notion…');
const pages = await fetchAllPages(NOTION_WORKS_DB_ID);
console.log(`  retrieved ${pages.length} pages`);

const ja = [];
const en = [];

for (const page of pages) {
  const props = page.properties;

  if (readProp(props, 'Published') === false) continue;

  // 言語共通プロパティ
  const slugRaw = readProp(props, 'Slug');
  const tags = readProp(props, 'Tags') || [];
  const date = readProp(props, 'Date');
  const externalUrl = readProp(props, 'URL');
  const order = readProp(props, 'Order');

  // 個別の額縁スタイル(任意)。Select プロパティ。
  // 値: white / white-thick / black / bare / 空
  const frameRaw = readProp(props, 'Frame');
  const VALID_FRAMES = ['white', 'white-thick', 'black', 'bare'];
  const frame = frameRaw && VALID_FRAMES.includes(frameRaw.toLowerCase())
    ? frameRaw.toLowerCase()
    : null;

  // 言語ごとのテキスト
  const titleJa = readProp(props, 'Name') || readProp(props, 'Title') || '(untitled)';
  const titleEn = readProp(props, 'Name (EN)') || titleJa;
  const catchJa = readProp(props, 'Catchphrase') || '';
  const catchEn = readProp(props, 'Catchphrase (EN)') || catchJa;
  const sumJa = readProp(props, 'Summary') || '';
  const sumEn = readProp(props, 'Summary (EN)') || sumJa;

  // この作品をどの言語で公開するか
  // Languages multi-select が設定されていればそれを使う。
  // 未設定(空)の場合は **両言語**で公開する(以前は ja のみ)。
  // ja のみ・en のみに絞りたい場合だけ Languages に値を入れる。
  const languages = readProp(props, 'Languages');
  const langs = languages && languages.length > 0
    ? languages.map((l) => l.toLowerCase())
    : ['ja', 'en'];

  // Cover
  let coverUrl = readProp(props, 'Cover');
  if (!coverUrl && page.cover) {
    coverUrl =
      page.cover.type === 'file' ? page.cover.file.url : page.cover.external.url;
  }
  const cover = coverUrl ? `/${await downloadImage(coverUrl)}` : null;

  // 本文ブロック → Markdown(言語分割)
  const mdBlocks = await n2m.pageToMarkdown(page.id);
  const mdString = n2m.toMarkdownString(mdBlocks);
  const fullBody = mdString?.parent || '';
  const { ja: bodyJa, en: bodyEn } = splitBodyByLang(fullBody);

  const slug = slugRaw && slugRaw.trim()
    ? slugify(slugRaw)
    : slugify(titleJa) || page.id.replace(/-/g, '');

  const baseRecord = {
    id: page.id,
    slug,
    cover,
    tags,
    date,
    url: externalUrl,
    order,
    frame,
  };

  if (langs.includes('ja')) {
    ja.push({
      ...baseRecord,
      title: titleJa,
      catchphrase: catchJa,
      summary: sumJa,
      bodyMarkdown: bodyJa,
    });
  }
  if (langs.includes('en')) {
    en.push({
      ...baseRecord,
      title: titleEn,
      catchphrase: catchEn,
      summary: sumEn,
      bodyMarkdown: bodyEn,
    });
  }

  console.log(`  ✓ ${titleJa} [${langs.join(',')}]`);
}

// 並び順: Order 優先 → Date 降順
function sortWorks(arr) {
  arr.sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    const ad = a.date ? new Date(a.date).getTime() : 0;
    const bd = b.date ? new Date(b.date).getTime() : 0;
    return bd - ad;
  });
}

sortWorks(ja);
sortWorks(en);

await fs.writeFile(
  path.join(DATA_DIR, 'works.ja.json'),
  JSON.stringify(ja, null, 2)
);
await fs.writeFile(
  path.join(DATA_DIR, 'works.en.json'),
  JSON.stringify(en, null, 2)
);
console.log(`✓ Wrote ${ja.length} JA works, ${en.length} EN works`);

// =============================================================
// Profile データベース(About セクション用)
// =============================================================
//
//   1 行だけのデータベースを想定。プロパティ:
//     - Name              : Title       — 日本語の表示名(例: 山田太郎)
//     - Name (EN)         : Text        — 英語の表示名
//     - Affiliation       : Text        — 日本語の所属/肩書き
//     - Affiliation (EN)  : Text        — 英語の所属/肩書き
//     - Photo             : Files       — プロフィール写真(任意)
//
//   そのページの本文(Markdown)が About 本文として使われる。
//   本文中に `--- en ---` マーカーを置くと、それより前を JA 本文・
//   それより後を EN 本文として分割する(Works と同じルール)。
//
// 出力:
//   - src/data/profile.ja.json
//   - src/data/profile.en.json
//   - public/images/profile/<filename>(画像があれば)
// =============================================================

const PROFILE_IMAGES_DIR = path.join(ROOT, 'public', 'images', 'profile');
await fs.mkdir(PROFILE_IMAGES_DIR, { recursive: true });

const NOTION_PROFILE_DB_ID = process.env.NOTION_PROFILE_DB_ID;

async function downloadProfileImage(url) {
  if (!url) return null;
  const filename = stableFilename(url);
  const filepath = path.join(PROFILE_IMAGES_DIR, filename);
  const publicPath = `images/profile/${filename}`;
  try {
    await fs.access(filepath);
    return publicPath;
  } catch {}
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filepath, buf);
    console.log(`  ✓ profile image: ${filename}`);
    return publicPath;
  } catch (e) {
    console.warn(`  ✗ profile image fetch failed: ${url}`, e.message);
    return null;
  }
}

const EMPTY_PROFILE = { photo: null, name: '', affiliation: '', bio: '' };

async function fetchProfile() {
  if (!NOTION_PROFILE_DB_ID) {
    console.warn(
      'ℹ️  NOTION_PROFILE_DB_ID が未設定です。About セクションのプロフィール情報は表示されません。'
    );
    return { ja: EMPTY_PROFILE, en: EMPTY_PROFILE };
  }

  console.log('→ Fetching profile from Notion…');
  let pages;
  try {
    pages = await fetchAllPages(NOTION_PROFILE_DB_ID);
  } catch (e) {
    console.warn(`✗ Profile DB の取得に失敗しました: ${e.message}`);
    return { ja: EMPTY_PROFILE, en: EMPTY_PROFILE };
  }

  if (pages.length === 0) {
    console.warn('  Profile DB に行がありません。');
    return { ja: EMPTY_PROFILE, en: EMPTY_PROFILE };
  }

  // 1 行目を採用(複数行あっても先頭のみ)
  const page = pages[0];
  const props = page.properties;

  const nameJa = readProp(props, 'Name') || readProp(props, 'Title') || '';
  const nameEn = readProp(props, 'Name (EN)') || nameJa;
  const affJa = readProp(props, 'Affiliation') || '';
  const affEn = readProp(props, 'Affiliation (EN)') || affJa;

  let photoUrl = readProp(props, 'Photo');
  if (!photoUrl && page.cover) {
    photoUrl =
      page.cover.type === 'file' ? page.cover.file.url : page.cover.external.url;
  }
  const photo = photoUrl ? `/${await downloadProfileImage(photoUrl)}` : null;

  // 本文を Markdown 化 → JA / EN に分割
  const mdBlocks = await n2m.pageToMarkdown(page.id);
  const mdString = n2m.toMarkdownString(mdBlocks);
  const fullBody = mdString?.parent || '';
  const { ja: bioJa, en: bioEn } = splitBodyByLang(fullBody);

  console.log(`  ✓ profile: ${nameJa || '(no name)'} / ${nameEn || '(no en name)'}`);

  return {
    ja: { photo, name: nameJa, affiliation: affJa, bio: bioJa },
    en: { photo, name: nameEn, affiliation: affEn, bio: bioEn },
  };
}

const profiles = await fetchProfile();
await fs.writeFile(
  path.join(DATA_DIR, 'profile.ja.json'),
  JSON.stringify(profiles.ja, null, 2)
);
await fs.writeFile(
  path.join(DATA_DIR, 'profile.en.json'),
  JSON.stringify(profiles.en, null, 2)
);
console.log('✓ Wrote profile.ja.json / profile.en.json');

// =============================================================
// Hero データベース(ヒーロー文の背景イラスト・任意)
// =============================================================
//
//   1 行だけのデータベースを想定。プロパティ:
//     - Name             : Title  — 識別名(任意)
//     - Image            : Files  — 透過 PNG 等(PC/モバイル兼用、または PC 用)
//     - Image (Mobile)   : Files  — モバイル専用画像(任意)
//     - Video            : Files  — 動画ファイル(terminal デザイン用、PC/モバイル兼用)
//     - Video (Mobile)   : Files  — モバイル専用動画(任意)
//
//   `... (Mobile)` を空にしておくと、モバイルでも PC 版が使われる。
//   gallery デザインは Image を、terminal デザインは Video を使う。
//
//   出力: src/data/hero.json = { image, imageMobile, video, videoMobile }
//   画像/動画は public/images/hero/ にダウンロードされる。
// =============================================================

const HERO_DIR = path.join(ROOT, 'public', 'images', 'hero');
await fs.mkdir(HERO_DIR, { recursive: true });

const NOTION_HERO_DB_ID = process.env.NOTION_HERO_DB_ID;

const EMPTY_HERO = { image: null, imageMobile: null, video: null, videoMobile: null };

/** Files / URL プロパティから最初のファイル URL を取り出す */
function firstImageUrl(prop) {
  if (!prop) return null;
  if (prop.type === 'url') return prop.url || null;
  if (prop.type === 'files') {
    const f = prop.files?.[0];
    if (!f) return null;
    return f.type === 'file' ? f.file?.url : f.external?.url;
  }
  return null;
}

async function downloadHeroAsset(assetUrl) {
  if (!assetUrl) return null;
  const filename = stableFilename(assetUrl);
  const filepath = path.join(HERO_DIR, filename);
  const publicPath = `/images/hero/${filename}`;
  try {
    await fs.access(filepath);
    return publicPath;
  } catch {}
  try {
    const res = await fetch(assetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filepath, buf);
    console.log(`  ✓ downloaded hero asset: ${filename}`);
    return publicPath;
  } catch (e) {
    console.warn(`  ✗ hero download failed: ${assetUrl} (${e.message})`);
    return null;
  }
}

async function fetchHero() {
  if (!NOTION_HERO_DB_ID) {
    return EMPTY_HERO;
  }

  console.log('→ Fetching hero from Notion…');
  let pages;
  try {
    pages = await fetchAllPages(NOTION_HERO_DB_ID);
  } catch (e) {
    console.warn(`  ✗ Hero DB の取得に失敗しました: ${e.message}`);
    return EMPTY_HERO;
  }

  if (pages.length === 0) {
    console.warn('  Hero DB に行がありません。');
    return EMPTY_HERO;
  }

  const props = pages[0].properties;
  console.log(`  Properties: ${Object.keys(props).join(', ')}`);

  // 画像プロパティ候補
  const IMAGE_DESKTOP = ['Image', 'Image (Desktop)', 'Image Desktop', 'Photo', 'Illustration', '画像', 'PC'];
  const IMAGE_MOBILE = ['Image (Mobile)', 'Image Mobile', 'Mobile', 'Mobile Image', 'モバイル', 'スマホ'];
  // 動画プロパティ候補
  const VIDEO_DESKTOP = ['Video', 'Video (Desktop)', 'Movie', 'Film', '動画', 'ムービー'];
  const VIDEO_MOBILE = ['Video (Mobile)', 'Video Mobile', 'Mobile Video', '動画 (モバイル)'];

  function findFirstAsset(candidates) {
    for (const name of candidates) {
      const p = getProp(props, name);
      if (p && (p.type === 'files' || p.type === 'url')) {
        const url = firstImageUrl(p);
        if (url) return { name, url };
      }
    }
    return null;
  }

  const imageProp = findFirstAsset(IMAGE_DESKTOP);
  const imageMobileProp = findFirstAsset(IMAGE_MOBILE);
  const videoProp = findFirstAsset(VIDEO_DESKTOP);
  const videoMobileProp = findFirstAsset(VIDEO_MOBILE);

  const image = imageProp ? await downloadHeroAsset(imageProp.url) : null;
  const imageMobile = imageMobileProp ? await downloadHeroAsset(imageMobileProp.url) : null;
  const video = videoProp ? await downloadHeroAsset(videoProp.url) : null;
  const videoMobile = videoMobileProp ? await downloadHeroAsset(videoMobileProp.url) : null;

  if (image) console.log(`  ✓ hero image: ${imageProp.name}`);
  if (imageMobile) console.log(`  ✓ hero image (mobile): ${imageMobileProp.name}`);
  if (video) console.log(`  ✓ hero video: ${videoProp.name}`);
  if (videoMobile) console.log(`  ✓ hero video (mobile): ${videoMobileProp.name}`);

  if (!image && !imageMobile && !video && !videoMobile) {
    console.warn(
      `  ⚠️  画像/動画プロパティが見つかりません ` +
      `(画像候補: ${IMAGE_DESKTOP.join('/')} / 動画候補: ${VIDEO_DESKTOP.join('/')})`
    );
  }

  return { image, imageMobile, video, videoMobile };
}

const hero = await fetchHero();
await fs.writeFile(
  path.join(DATA_DIR, 'hero.json'),
  JSON.stringify(hero, null, 2)
);
console.log('✓ Wrote hero.json');

// =============================================================
// Viewers データベース(ギャラリー鑑賞者の画像・任意)
// =============================================================
//
//   2 通りの管理方法をサポート:
//
//   (A) Notion で管理する場合:
//       1 行 = 1 人(画像)。Viewers データベースを作成してプロパティ:
//         - Name           : Title       — 識別名(例: man1。任意)
//         - Image          : Files       — 透過 PNG など
//         - Order          : Number      — 並び順(任意)
//       NOTION_VIEWERS_DB_ID 環境変数に DB ID を設定すると有効。
//
//   (B) ファイルで管理する場合(デフォルト):
//       public/images/viewers/ 内の .png / .jpg / .webp を全部使う。
//
//   どちらの場合も、最終的に src/data/viewers.json に
//   ["images/viewers/man1.png", ...] という相対パス配列が出力される。
// =============================================================

const VIEWERS_DIR = path.join(ROOT, 'public', 'images', 'viewers');
await fs.mkdir(VIEWERS_DIR, { recursive: true });

const NOTION_VIEWERS_DB_ID = process.env.NOTION_VIEWERS_DB_ID;

/**
 * ローカルの画像ファイルから縦横ピクセルを取得する。
 * 失敗したら null を返す(その画像は他と同じ高さに揃えられる)。
 */
async function readImageDimensions(filepath) {
  try {
    const buf = await fs.readFile(filepath);
    const dim = imageSize(buf);
    if (!dim?.width || !dim?.height) return null;
    return { width: dim.width, height: dim.height };
  } catch (e) {
    console.warn(`  ⚠️  could not read dimensions of ${filepath}: ${e.message}`);
    return null;
  }
}

async function fetchViewers() {
  // 「鑑賞者」画像の取得方針:
  //   1. NOTION_VIEWERS_DB_ID が設定されていれば、まず Notion を試す。
  //      - プロパティ名は Image / Images / Photo / Photos / File / Files / 画像 のいずれかにフィット。
  //      - 1 行に複数ファイルがあっても全部使う(Files プロパティ)。
  //   2. Notion から 1 件も取れなかった場合、public/images/viewers/ を走査して
  //      置いてあるファイルを使う(セーフティネット)。
  //   3. それでも 0 件なら空配列。
  //
  //   各画像の縦横サイズも読み取って格納する(viewer ごとの相対表示サイズに使う)。
  //
  // GitHub Actions のログで、各段階で何が起きたか分かるよう詳しく出力する。

  const IMAGE_PROP_CANDIDATES = ['Image', 'Images', 'Photo', 'Photos', 'File', 'Files', '画像'];

  /** Notion の Files / URL プロパティから画像 URL の配列を抽出 */
  function extractImageUrls(prop) {
    if (!prop) return [];
    if (prop.type === 'url') {
      return prop.url ? [prop.url] : [];
    }
    if (prop.type === 'files') {
      return (prop.files || [])
        .map((f) => (f.type === 'file' ? f.file?.url : f.external?.url))
        .filter(Boolean);
    }
    return [];
  }

  // ---------- (A) Notion から取得 ----------
  const notionItems = [];
  if (NOTION_VIEWERS_DB_ID) {
    console.log('→ Fetching viewers from Notion…');
    let pages;
    try {
      pages = await fetchAllPages(NOTION_VIEWERS_DB_ID);
      console.log(`  Notion returned ${pages.length} row(s) from Viewers DB`);
    } catch (e) {
      console.warn(`  ✗ Viewers DB の取得に失敗しました: ${e.message}`);
      pages = [];
    }

    if (pages.length > 0) {
      // 1 行目のプロパティ名一覧を出力(プロパティ名のミスマッチ調査用)
      const propNames = Object.keys(pages[0].properties);
      console.log(`  Properties on first row: ${propNames.join(', ')}`);
    }

    let rowIdx = 0;
    for (const page of pages) {
      rowIdx++;
      const props = page.properties;
      const order = readProp(props, 'Order') ?? rowIdx;

      // Image プロパティを名前候補から探す
      let imageProp = null;
      let imagePropName = null;
      for (const name of IMAGE_PROP_CANDIDATES) {
        const p = getProp(props, name);
        if (p && (p.type === 'files' || p.type === 'url')) {
          imageProp = p;
          imagePropName = name;
          break;
        }
      }

      if (!imageProp) {
        console.warn(
          `  ⚠️  row ${rowIdx}: 画像プロパティが見つかりません ` +
          `(候補: ${IMAGE_PROP_CANDIDATES.join(' / ')})`
        );
        continue;
      }

      const urls = extractImageUrls(imageProp);
      if (urls.length === 0) {
        console.warn(`  ⚠️  row ${rowIdx}: プロパティ "${imagePropName}" は空です`);
        continue;
      }

      // 1 つのプロパティに複数ファイル添付されているケースに対応
      for (let i = 0; i < urls.length; i++) {
        const imageUrl = urls[i];
        const filename = stableFilename(imageUrl);
        const filepath = path.join(VIEWERS_DIR, filename);
        const publicPath = `images/viewers/${filename}`;
        try {
          await fs.access(filepath);
        } catch {
          try {
            const res = await fetch(imageUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = Buffer.from(await res.arrayBuffer());
            await fs.writeFile(filepath, buf);
            console.log(`  ✓ downloaded viewer image: ${filename}`);
          } catch (e) {
            console.warn(`  ✗ viewer download failed: ${imageUrl} (${e.message})`);
            continue;
          }
        }
        const dim = await readImageDimensions(filepath);
        // 同一行の複数画像は親 order の細かい増分でソートされる
        notionItems.push({
          order: order + i * 0.001,
          path: publicPath,
          width: dim?.width ?? null,
          height: dim?.height ?? null,
        });
      }
    }

    notionItems.sort((a, b) => a.order - b.order);
    if (notionItems.length > 0) {
      console.log(`  ✓ ${notionItems.length} viewer image(s) from Notion`);
      return notionItems.map((it) => ({
        path: it.path,
        width: it.width,
        height: it.height,
      }));
    }
    console.warn(
      '  ⚠️  Notion から画像を 1 件も取得できませんでした。' +
      'public/images/viewers/ にファイルがあればそちらを使います。'
    );
  }

  // ---------- (B) ファイル走査(フォールバック) ----------
  let files;
  try {
    files = await fs.readdir(VIEWERS_DIR);
  } catch {
    files = [];
  }
  const supported = /\.(png|jpe?g|webp|svg)$/i;
  const filenames = files
    .filter((f) => supported.test(f) && !f.startsWith('.'))
    .sort();
  const list = [];
  for (const f of filenames) {
    const filepath = path.join(VIEWERS_DIR, f);
    const dim = await readImageDimensions(filepath);
    list.push({
      path: `images/viewers/${f}`,
      width: dim?.width ?? null,
      height: dim?.height ?? null,
    });
  }
  if (list.length > 0) {
    console.log(`→ Using ${list.length} viewer image(s) from public/images/viewers/ (filesystem)`);
  } else {
    console.log(
      '→ No viewer images. Notion DB を設定するか、public/images/viewers/ に PNG を置いてください。'
    );
  }
  return list;
}

const viewerImages = await fetchViewers();
await fs.writeFile(
  path.join(DATA_DIR, 'viewers.json'),
  JSON.stringify(viewerImages, null, 2)
);
console.log(`✓ Wrote viewers.json (${viewerImages.length} image(s))`);
