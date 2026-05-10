// =============================================================
// Wall layout — クラスター展示の配置計算(モダン・ミニマル版)
//
// 配置アルゴリズムは前バージョンと同じ。額縁スタイルだけ
// "white / white-thick / black / bare" の 4 種に変更。
// 微妙な傾き(rotation)はミニマルさのため 0 に統一。
// =============================================================

export type FrameStyle = 'white' | 'white-thick' | 'black' | 'bare';

export interface Placement {
  panelIndex: number;
  /** パネル幅に対する左端の % */
  x: number;
  /** パネル高に対する上端の % */
  y: number;
  /** パネル幅に対する横幅 % */
  w: number;
  /** width / height(0.8 = 縦長, 1.5 = 横長) */
  aspect: number;
  frame: FrameStyle;
}

type Slot = Omit<Placement, 'panelIndex'>;

const P4: Slot[][] = [
  [
    { x: 8,  y: 22, w: 18, aspect: 0.85, frame: 'white' },
    { x: 32, y: 12, w: 22, aspect: 1.30, frame: 'white-thick' },
    { x: 60, y: 28, w: 16, aspect: 1.00, frame: 'black' },
    { x: 80, y: 18, w: 14, aspect: 0.85, frame: 'bare' },
  ],
];

const P5: Slot[][] = [
  // Pattern A
  [
    { x: 5,  y: 22, w: 16, aspect: 0.85, frame: 'white' },
    { x: 25, y: 8,  w: 10, aspect: 1.00, frame: 'black' },
    { x: 39, y: 18, w: 22, aspect: 1.25, frame: 'white-thick' },
    { x: 65, y: 26, w: 16, aspect: 0.95, frame: 'white' },
    { x: 84, y: 14, w: 12, aspect: 1.20, frame: 'bare' },
  ],
  // Pattern B
  [
    { x: 6,  y: 30, w: 12, aspect: 1.00, frame: 'white-thick' },
    { x: 22, y: 12, w: 18, aspect: 0.80, frame: 'white' },
    { x: 44, y: 22, w: 22, aspect: 1.30, frame: 'black' },
    { x: 70, y: 14, w: 14, aspect: 0.90, frame: 'white' },
    { x: 86, y: 38, w: 11, aspect: 1.10, frame: 'bare' },
  ],
];

const P6: Slot[][] = [
  // Pattern A
  [
    { x: 4,  y: 26, w: 16, aspect: 0.80, frame: 'white' },
    { x: 24, y: 10, w: 10, aspect: 1.10, frame: 'black' },
    { x: 26, y: 50, w: 14, aspect: 1.40, frame: 'bare' },
    { x: 42, y: 18, w: 22, aspect: 1.25, frame: 'white-thick' },
    { x: 68, y: 28, w: 14, aspect: 0.90, frame: 'white' },
    { x: 85, y: 14, w: 12, aspect: 1.10, frame: 'white' },
  ],
  // Pattern B
  [
    { x: 6,  y: 18, w: 13, aspect: 1.00, frame: 'white' },
    { x: 5,  y: 56, w: 16, aspect: 1.45, frame: 'black' },
    { x: 25, y: 28, w: 18, aspect: 0.85, frame: 'white-thick' },
    { x: 47, y: 14, w: 22, aspect: 1.30, frame: 'white' },
    { x: 50, y: 60, w: 14, aspect: 1.30, frame: 'bare' },
    { x: 73, y: 30, w: 19, aspect: 0.85, frame: 'white' },
  ],
];

const P7: Slot[][] = [
  [
    { x: 4,  y: 30, w: 14, aspect: 0.85, frame: 'white' },
    { x: 5,  y: 8,  w: 10, aspect: 1.00, frame: 'white-thick' },
    { x: 22, y: 22, w: 12, aspect: 1.30, frame: 'black' },
    { x: 38, y: 12, w: 22, aspect: 1.25, frame: 'white' },
    { x: 38, y: 60, w: 14, aspect: 1.40, frame: 'bare' },
    { x: 64, y: 28, w: 18, aspect: 0.85, frame: 'white' },
    { x: 86, y: 18, w: 11, aspect: 1.10, frame: 'white' },
  ],
];

const P_FEW: Record<number, Slot[]> = {
  1: [
    { x: 38, y: 12, w: 24, aspect: 1.10, frame: 'white' },
  ],
  2: [
    { x: 18, y: 18, w: 22, aspect: 0.90, frame: 'white' },
    { x: 56, y: 22, w: 24, aspect: 1.25, frame: 'white-thick' },
  ],
  3: [
    { x: 8,  y: 22, w: 18, aspect: 0.85, frame: 'white' },
    { x: 38, y: 14, w: 24, aspect: 1.25, frame: 'white-thick' },
    { x: 70, y: 28, w: 18, aspect: 0.95, frame: 'black' },
  ],
};

function patternsFor(n: number): Slot[][] {
  switch (n) {
    case 4: return P4;
    case 5: return P5;
    case 6: return P6;
    case 7: return P7;
    default: return P6;
  }
}

function distributeIntoPanels(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 7) return [n];
  const panelCount = Math.ceil(n / 6);
  const out: number[] = [];
  let remaining = n;
  for (let i = 0; i < panelCount; i++) {
    const left = panelCount - i;
    const size = Math.ceil(remaining / left);
    out.push(size);
    remaining -= size;
  }
  return out;
}

export function assignPlacements(count: number): Placement[] {
  if (count === 0) return [];

  if (count <= 3) {
    return P_FEW[count].map((s) => ({ ...s, panelIndex: 0 }));
  }

  const sizes = distributeIntoPanels(count);
  const result: Placement[] = [];
  for (let panelIdx = 0; panelIdx < sizes.length; panelIdx++) {
    const size = sizes[panelIdx];
    const patterns = patternsFor(size);
    const pattern = patterns[panelIdx % patterns.length];
    for (let i = 0; i < size; i++) {
      result.push({ ...pattern[i], panelIndex: panelIdx });
    }
  }
  return result;
}

export function panelCount(count: number): number {
  if (count <= 3) return 1;
  return distributeIntoPanels(count).length;
}
