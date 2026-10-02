// Praproses gambar untuk OCR struk. Semua fungsi bekerja pada array grayscale murni
// (tanpa DOM) sehingga bisa diuji di Node.

export interface Gray {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export const toGray = (rgba: ArrayLike<number>, width: number, height: number): Gray => {
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return { data, width, height };
};

export const resizeGray = (src: Gray, newWidth: number, newHeight: number): Gray => {
  const out = new Uint8ClampedArray(newWidth * newHeight);
  const xr = src.width / newWidth;
  const yr = src.height / newHeight;
  // Saat memperkecil, rata-ratakan blok sumber (area averaging) agar teks tidak aliasing.
  const shrink = xr > 1 || yr > 1;
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      if (shrink) {
        const x0 = Math.floor(x * xr);
        const x1 = Math.min(src.width, Math.max(x0 + 1, Math.floor((x + 1) * xr)));
        const y0 = Math.floor(y * yr);
        const y1 = Math.min(src.height, Math.max(y0 + 1, Math.floor((y + 1) * yr)));
        let sum = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) sum += src.data[yy * src.width + xx];
        out[y * newWidth + x] = sum / ((x1 - x0) * (y1 - y0));
      } else {
        const sx = Math.min(src.width - 1, (x + 0.5) * xr - 0.5);
        const sy = Math.min(src.height - 1, (y + 0.5) * yr - 0.5);
        const x0 = Math.max(0, Math.floor(sx));
        const y0 = Math.max(0, Math.floor(sy));
        const x1 = Math.min(src.width - 1, x0 + 1);
        const y1 = Math.min(src.height - 1, y0 + 1);
        const fx = sx - x0;
        const fy = sy - y0;
        const top = src.data[y0 * src.width + x0] * (1 - fx) + src.data[y0 * src.width + x1] * fx;
        const bottom = src.data[y1 * src.width + x0] * (1 - fx) + src.data[y1 * src.width + x1] * fx;
        out[y * newWidth + x] = top * (1 - fy) + bottom * fy;
      }
    }
  }
  return { data: out, width: newWidth, height: newHeight };
};

const otsu = (values: Uint8ClampedArray): number => {
  const hist = new Array(256).fill(0);
  values.forEach((v) => hist[v]++);
  const total = values.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
};

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Cari kertas struk: komponen terang terbesar. Jika tidak meyakinkan, kembalikan seluruh gambar.
export const findPaperBox = (gray: Gray): Box => {
  const full: Box = { x: 0, y: 0, width: gray.width, height: gray.height };
  const target = 160;
  const scale = Math.min(1, target / Math.max(gray.width, gray.height));
  const small = resizeGray(gray, Math.max(1, Math.round(gray.width * scale)), Math.max(1, Math.round(gray.height * scale)));
  const threshold = otsu(small.data);

  // Pastikan "terang" memang lebih jarang/lebih kecil dari latar; jika hampir seluruh gambar terang, tidak ada yang perlu di-crop.
  const w = small.width;
  const h = small.height;
  const mask = new Uint8Array(w * h);
  let brightCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (small.data[i] > threshold) {
      mask[i] = 1;
      brightCount++;
    }
  }
  if (brightCount > mask.length * 0.85 || brightCount < mask.length * 0.02) return full;

  const visited = new Uint8Array(w * h);
  let best: { size: number; minX: number; minY: number; maxX: number; maxY: number } | null = null;
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let size = 0;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    stack.push(start);
    visited[start] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % w;
      const y = (p - x) / w;
      size++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && mask[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && mask[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - w] && !visited[p - w]) { visited[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && mask[p + w] && !visited[p + w]) { visited[p + w] = 1; stack.push(p + w); }
    }
    if (!best || size > best.size) best = { size, minX, minY, maxX, maxY };
  }

  if (!best || best.size < mask.length * 0.02) return full;

  const pad = 0.04;
  const bx = best.minX / scale;
  const by = best.minY / scale;
  const bw = (best.maxX - best.minX + 1) / scale;
  const bh = (best.maxY - best.minY + 1) / scale;
  const x = Math.max(0, Math.floor(bx - bw * pad));
  const y = Math.max(0, Math.floor(by - bh * pad));
  const x2 = Math.min(gray.width, Math.ceil(bx + bw * (1 + pad)));
  const y2 = Math.min(gray.height, Math.ceil(by + bh * (1 + pad)));
  return { x, y, width: x2 - x, height: y2 - y };
};

export const cropGray = (src: Gray, box: Box): Gray => {
  const out = new Uint8ClampedArray(box.width * box.height);
  for (let y = 0; y < box.height; y++) {
    const from = (box.y + y) * src.width + box.x;
    out.set(src.data.subarray(from, from + box.width), y * box.width);
  }
  return { data: out, width: box.width, height: box.height };
};

// Putar terhadap pusat; area kosong diisi putih (warna kertas).
export const rotateGray = (src: Gray, degrees: number): Gray => {
  if (Math.abs(degrees) < 0.2) return src;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const out = new Uint8ClampedArray(src.width * src.height).fill(255);
  const cx = src.width / 2;
  const cy = src.height / 2;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;
      if (sx < 0 || sy < 0 || sx >= src.width - 1 || sy >= src.height - 1) continue;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const i = y0 * src.width + x0;
      out[y * src.width + x] =
        src.data[i] * (1 - fx) * (1 - fy) +
        src.data[i + 1] * fx * (1 - fy) +
        src.data[i + src.width] * (1 - fx) * fy +
        src.data[i + src.width + 1] * fx * fy;
    }
  }
  return { data: out, width: src.width, height: src.height };
};

// Estimasi kemiringan teks: sudut yang membuat profil proyeksi baris paling "tajam" (varians terbesar).
export const estimateSkew = (gray: Gray, range = 12, step = 0.5): number => {
  const target = 420;
  const scale = Math.min(1, target / Math.max(gray.width, gray.height));
  const small = resizeGray(gray, Math.max(8, Math.round(gray.width * scale)), Math.max(8, Math.round(gray.height * scale)));
  // Hanya goresan tinta (lebih gelap dari sekitarnya); area gelap luas di luar kertas tidak ikut dihitung.
  const ink = adaptiveThreshold(small, 15, 10);
  const dark: number[] = [];
  for (let i = 0; i < ink.data.length; i++) {
    if (ink.data[i] === 0) dark.push(i);
  }
  if (dark.length < 50) return 0;

  const w = small.width;
  const cx = w / 2;
  const cy = small.height / 2;
  let bestAngle = 0;
  let bestScore = -1;
  for (let a = -range; a <= range + 1e-9; a += step) {
    const rad = (a * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const bins = new Float64Array(small.height * 2);
    for (const idx of dark) {
      const x = (idx % w) - cx;
      const y = Math.floor(idx / w) - cy;
      const ry = Math.round(-sin * x + cos * y + small.height);
      if (ry >= 0 && ry < bins.length) bins[ry]++;
    }
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < bins.length; i++) {
      sum += bins[i];
      sumSq += bins[i] * bins[i];
    }
    const score = sumSq / bins.length - (sum / bins.length) ** 2;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = a;
    }
  }
  return bestAngle;
};

// Binarisasi adaptif (rata-rata lokal via integral image): tahan terhadap bayangan & tinta pudar.
export const adaptiveThreshold = (src: Gray, window: number, offset: number): Gray => {
  const { width: w, height: h, data } = src;
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += data[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  const half = Math.max(2, Math.floor(window / 2));
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(h, y + half + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(w, x + half + 1);
      const area = (x1 - x0) * (y1 - y0);
      const sum =
        integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      out[y * w + x] = data[y * w + x] < sum / area - offset ? 0 : 255;
    }
  }
  return { data: out, width: w, height: h };
};

// Regangkan kontras berdasarkan persentil (bukan min/max) agar tahan noise.
export const normalizeContrast = (src: Gray): Gray => {
  const hist = new Array(256).fill(0);
  src.data.forEach((v) => hist[v]++);
  const total = src.data.length;
  const percentile = (p: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= total * p) return i;
    }
    return 255;
  };
  const lo = percentile(0.02);
  const hi = Math.max(lo + 1, percentile(0.98));
  const out = new Uint8ClampedArray(total);
  for (let i = 0; i < total; i++) out[i] = ((src.data[i] - lo) * 255) / (hi - lo);
  return { data: out, width: src.width, height: src.height };
};

export interface ProcessedVariant {
  name: string;
  image: Gray;
}

// Hasilkan beberapa versi gambar; OCR dicoba berurutan sampai total ditemukan.
export const buildVariants = (rgba: ArrayLike<number>, width: number, height: number): ProcessedVariant[] => {
  const gray = toGray(rgba, width, height);
  const paper = cropGray(gray, findPaperBox(gray));

  // Target lebar ±1500px: teks struk jadi cukup besar untuk OCR, tapi tidak membebani HP.
  const targetWidth = 1500;
  const scaled = resizeGray(paper, targetWidth, Math.max(1, Math.round((paper.height * targetWidth) / paper.width)));
  const straight = rotateGray(scaled, -estimateSkew(scaled));

  return [
    { name: 'adaptive', image: adaptiveThreshold(straight, 51, 14) },
    { name: 'contrast', image: normalizeContrast(straight) },
  ];
};
