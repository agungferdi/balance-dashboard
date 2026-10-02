import { Gray, adaptiveThreshold, cropGray, estimateSkew, findPaperBox, resizeGray, rotateGray } from './imageProcessing';

// Gambar sintetis: latar gelap, kertas terang berisi baris "teks" gelap.
const makePage = (width: number, height: number, angle = 0): Gray => {
  const data = new Uint8ClampedArray(width * height).fill(40);
  const paper = { x: width * 0.3, y: height * 0.2, w: width * 0.4, h: height * 0.6 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= paper.x && x < paper.x + paper.w && y >= paper.y && y < paper.y + paper.h) data[y * width + x] = 220;
    }
  }
  for (let row = 0; row < 12; row++) {
    const ry = paper.y + 20 + row * 14;
    for (let y = ry; y < ry + 4; y++) {
      for (let x = paper.x + 10; x < paper.x + paper.w - 10; x++) data[Math.floor(y) * width + Math.floor(x)] = 30;
    }
  }
  const page: Gray = { data, width, height };
  return angle ? rotateGray(page, angle) : page;
};

describe('findPaperBox', () => {
  it('finds the bright paper inside a dark background', () => {
    const box = findPaperBox(makePage(400, 500));
    expect(box.x).toBeGreaterThan(80);
    expect(box.x).toBeLessThan(125);
    expect(box.width).toBeGreaterThan(150);
    expect(box.width).toBeLessThan(220);
  });

  it('returns the full image when there is no distinct paper', () => {
    const flat: Gray = { data: new Uint8ClampedArray(100 * 100).fill(200), width: 100, height: 100 };
    expect(findPaperBox(flat)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

describe('estimateSkew', () => {
  it('detects roughly zero skew on straight text', () => {
    const page = makePage(400, 500);
    expect(Math.abs(estimateSkew(cropGray(page, findPaperBox(page))))).toBeLessThanOrEqual(1);
  });

  it('recovers a rotation applied to the text', () => {
    const page = makePage(400, 500, 6);
    const cropped = cropGray(page, findPaperBox(page));
    expect(Math.abs(Math.abs(estimateSkew(cropped)) - 6)).toBeLessThanOrEqual(1.5);
  });
});

describe('adaptiveThreshold', () => {
  it('keeps dark text on an unevenly lit page', () => {
    // Gradien terang→gelap dengan satu goresan gelap di sisi gelap.
    const w = 120;
    const h = 40;
    const data = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = 230 - x;
    for (let y = 18; y < 22; y++) for (let x = 90; x < 110; x++) data[y * w + x] = 60;
    const out = adaptiveThreshold({ data, width: w, height: h }, 21, 12);
    expect(out.data[20 * w + 100]).toBe(0); // goresan = hitam
    expect(out.data[5 * w + 100]).toBe(255); // kertas tetap putih meski lebih gelap dari sisi kiri
  });
});

describe('resizeGray', () => {
  it('produces the requested dimensions', () => {
    const out = resizeGray(makePage(200, 300), 50, 75);
    expect([out.width, out.height]).toEqual([50, 75]);
    expect(out.data.length).toBe(50 * 75);
  });
});
