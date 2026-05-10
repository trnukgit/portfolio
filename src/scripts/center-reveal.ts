// Mobile / touch端末で、ビューポートの中央に「もっとも近いカード 1 枚のみ」に
// .is-active を付与する。複数同時アクティブを防ぐため、IntersectionObserver
// ではなく、スクロール位置から各カードの中心までの距離を比較する方式。

(function () {
  // PC は :hover で発火するので何もしない
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]')
  );
  if (!cards.length) return;

  let raf = 0;
  let lastActive: HTMLElement | null = null;

  function pickActive() {
    raf = 0;
    const vh = window.innerHeight;
    const vCenter = vh / 2;

    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    const ACTIVATION_DIST = vh * 0.35; // 中央から 35% 以内のみ候補

    for (const card of cards) {
      const r = card.getBoundingClientRect();
      // 完全に画面外はスキップ
      if (r.bottom < 0 || r.top > vh) continue;
      const cy = r.top + r.height / 2;
      const dist = Math.abs(cy - vCenter);
      if (dist < bestDist && dist < ACTIVATION_DIST) {
        bestDist = dist;
        best = card;
      }
    }

    if (best !== lastActive) {
      if (lastActive) lastActive.classList.remove('is-active');
      if (best) best.classList.add('is-active');
      lastActive = best;
    }
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(pickActive);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  pickActive();
})();
