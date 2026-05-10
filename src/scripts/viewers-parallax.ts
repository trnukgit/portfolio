// =============================================================
// viewers-parallax.ts
//
// ギャラリー鑑賞者の画像を、スクロールに合わせて以下のように動かす:
//
//   1. 初期位置で待機している(PC: 1段目フレーム下、モバイル: 1枚目作品の下)
//   2. 下スクロールでビューポート下端が「足先」に追いつくと、
//      ビューポート下端に張り付いて一緒に降りていく(sticky 風)
//   3. 最終位置(PC: 最下段フレーム、モバイル: 最後の作品の下)に到達したら
//      追従を解除し、その位置で止まる
//
// PC とモバイルでアンカーを変える:
//   PC: `.wall-panel` の最初/最後をアンカーにする(クラスター展示)
//   モバイル: `.work-card` の最初/最後を使う(縦積み 1 列)
// =============================================================

(function () {
  const wall = document.querySelector<HTMLElement>('.wall');
  const viewersEl = document.querySelector<HTMLElement>('.viewers');
  if (!wall || !viewersEl) return;

  const panels = Array.from(wall.querySelectorAll<HTMLElement>('.wall-panel'));
  const cards = Array.from(wall.querySelectorAll<HTMLElement>('.work-card'));
  if (panels.length === 0 || cards.length === 0) return;

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  // ----- 頭の被り量 (viewer の高さに対する比率) -----
  //   PC で 1.0 にすると頭頂がパネル箱の下端、上半身がフレーム area に大きく入る。
  //   モバイルでは 0(被りなし、足元が card の真下に来る)を既定とする。
  const HEAD_OVERLAP_RATIO = 1.0;
  const HEAD_OVERLAP_RATIO_MOBILE = 0;

  let scheduled = false;

  function compute() {
    scheduled = false;

    const wallRect = wall!.getBoundingClientRect();
    const wallTopDoc = wallRect.top + window.scrollY;

    const viewerH = viewersEl!.offsetHeight;
    if (viewerH === 0) return;

    let initialAnchorBottomDoc: number;
    let finalAnchorBottomDoc: number;
    let overlap: number;

    if (isMobile()) {
      // モバイル: 1 枚目の card の下から、最後の card の下まで sticky に動く。
      const firstCardRect = cards[0].getBoundingClientRect();
      const lastCardRect = cards[cards.length - 1].getBoundingClientRect();
      initialAnchorBottomDoc = firstCardRect.bottom + window.scrollY;
      finalAnchorBottomDoc = lastCardRect.bottom + window.scrollY;
      overlap = viewerH * HEAD_OVERLAP_RATIO_MOBILE;
    } else {
      // PC: 1 段目 panel の下から、最終 panel の下まで sticky に動く。
      const firstPanel = panels[0].getBoundingClientRect();
      const lastPanel = panels[panels.length - 1].getBoundingClientRect();
      initialAnchorBottomDoc = firstPanel.bottom + window.scrollY;
      finalAnchorBottomDoc = lastPanel.bottom + window.scrollY;
      overlap = viewerH * HEAD_OVERLAP_RATIO;
    }

    // 「足の Y 位置」(ドキュメント座標)
    //   = アンカー下端 + (viewerH - 頭のかぶり量)
    //   - overlap 0 → 足元がアンカー直下、画像全体がアンカーの下にある
    //   - overlap viewerH → 頭頂がアンカー下端、上半身がアンカー area に入る
    const initialFeetDoc = initialAnchorBottomDoc + (viewerH - overlap);
    const finalFeetDoc = finalAnchorBottomDoc + (viewerH - overlap);

    const viewportBottom = window.scrollY + window.innerHeight;

    let targetFeetDoc: number;
    if (viewportBottom < initialFeetDoc) {
      targetFeetDoc = initialFeetDoc;       // 初期位置に固定
    } else if (viewportBottom > finalFeetDoc) {
      targetFeetDoc = finalFeetDoc;         // 最終位置に固定
    } else {
      targetFeetDoc = viewportBottom;       // ビューポート下端に張り付き
    }

    // viewers.top を wall 内相対座標で設定
    const targetTopRelative = targetFeetDoc - wallTopDoc - viewerH;
    viewersEl!.style.top = `${targetTopRelative}px`;
  }

  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(compute);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  // 画像読み込み後にもサイズが変わるので再計算
  const imgs = viewersEl.querySelectorAll('img');
  imgs.forEach((img) => {
    if (!img.complete) img.addEventListener('load', schedule, { once: true });
  });

  compute();
})();
