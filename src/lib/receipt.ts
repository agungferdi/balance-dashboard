import { ExpenseCategory } from '../types/transaction';
import { Gray, buildVariants } from './imageProcessing';

export interface ReceiptData {
  total: number | null;
  merchant: string | null;
  category: ExpenseCategory | null;
  rawText: string;
  /** true jika total cocok dengan tunai − kembali (validasi silang). */
  confident: boolean;
  /** Nominal terbesar di struk, untuk dipilih manual bila total tidak terbaca. */
  candidates: number[];
}

// ===== Parsing teks hasil OCR =====

// Baris yang berisi angka tapi BUKAN total belanja.
const EXCLUDED = /sub\s*-?\s*total|total\s*(item|qty|barang|jumlah\s*item)|kembali|change|tunai|cash|kartu|debit|credit|diskon|disc|hemat|potongan|voucher|ppn|pajak|tax|service|dpp|poin|point|saldo/i;

// Urutan prioritas kata kunci total; yang lebih spesifik menang.
const TOTAL_KEYWORDS: RegExp[] = [
  /grand\s*total/i,
  /total\s*(bayar|belanja|pembayaran|tagihan|harga|akhir)/i,
  /(jumlah|jml)\s*(bayar|tagihan)/i,
  /tagihan/i,
  /\btotal\b|\bttl\b/i,
  /\bjumlah\b|amount\s*due|netto/i,
];

const AMOUNT_PATTERN = /\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;

export const parseAmount = (token: string): number | null => {
  let cleaned = token.trim().replace(/\s/g, '');
  // "45.000,00" / "45,000.50" → buang bagian desimal (rupiah tidak memakai sen).
  if (/[.,]\d{1,2}$/.test(cleaned) && !/[.,]\d{3}$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]\d{1,2}$/, '');
  }
  cleaned = cleaned.replace(/[.,]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const value = parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : null;
};

const amountsInLine = (line: string): number[] => {
  // Abaikan tanggal & jam agar tidak terbaca sebagai nominal.
  const withoutDates = line
    .replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g, ' ')
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ');
  return (withoutDates.match(AMOUNT_PATTERN) || [])
    .map(parseAmount)
    .filter((n): n is number => n !== null && n >= 100 && n < 100_000_000);
};

const findTotal = (lines: string[], allowFallback = true): number | null => {
  for (const keyword of TOTAL_KEYWORDS) {
    const candidates: number[] = [];
    lines.forEach((line, i) => {
      if (!keyword.test(line) || EXCLUDED.test(line)) return;
      // Nominal biasanya di baris yang sama; kadang turun ke baris berikutnya.
      const amounts = amountsInLine(line);
      const next = amounts.length ? amounts : amountsInLine(lines[i + 1] || '');
      if (next.length) candidates.push(next[next.length - 1]);
    });
    if (candidates.length) return Math.max(...candidates);
  }

  if (!allowFallback) return null;

  // Fallback: nominal terbesar yang ditulis dengan pemisah ribuan (mis. 45.000).
  const formatted = lines
    .filter((l) => !EXCLUDED.test(l))
    .flatMap((l) => (l.match(/\d{1,3}(?:[.,]\d{3})+/g) || []).map(parseAmount))
    .filter((n): n is number => n !== null && n < 100_000_000);
  return formatted.length ? Math.max(...formatted) : null;
};

const findMerchant = (lines: string[]): string | null => {
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.replace(/[^\p{L}\p{N}&'.\- ]/gu, '').replace(/\s+/g, ' ').trim();
    const letters = (cleaned.match(/\p{L}/gu) || []).length;
    if (letters >= 3 && letters / cleaned.length > 0.5 && !/struk|receipt|invoice|nota|jl\.?\s|jalan|telp|npwp/i.test(cleaned)) {
      return cleaned.slice(0, 40);
    }
  }
  return null;
};

const CATEGORY_KEYWORDS: [ExpenseCategory, RegExp][] = [
  ['Transportation', /spbu|pertamina|pertalite|pertamax|shell|\bbp\b|vivo|bensin|solar|parkir|parking|\btol\b|grab|gojek|gocar|maxim|krl|mrt|lrt|transjakarta|kereta|\bkai\b|bus|taxi|bluebird/i],
  ['Running', /running|\blari\b|marathon|\brun\b|decathlon|nike|adidas|asics|hoka|brooks|sports?\s*station|planet\s*sports/i],
  ['Entertainment', /cinema|xxi|cgv|cinepolis|bioskop|karaoke|inul|timezone|game|steam|playstation|netflix|spotify|tiket|ticket|konser/i],
  ['Equipment', /ace\s*hardware|informa|ikea|hardware|elektronik|electronic|erafone|ibox|toko\s*bangunan|depo|mitra10|kuota|pulsa|telkomsel|xl|indosat/i],
  ['Foods', /resto|restaurant|rumah\s*makan|\brm\b|cafe|caf[eé]|coffee|kopi|bakery|roti|makan|mie|bakso|ayam|nasi|sate|soto|warung|warteg|food|kfc|mcd|mcdonald|burger|pizza|starbucks|chatime|janji\s*jiwa|kopi\s*kenangan|hokben|indomaret|alfamart|alfamidi|superindo|hypermart|lawson|family\s*mart|minuman|drink/i],
];

const guessCategory = (text: string): ExpenseCategory | null => {
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return null;
};

const lastAmountNear = (lines: string[], pattern: RegExp, exclude?: RegExp): number | null => {
  for (let i = 0; i < lines.length; i++) {
    if (!pattern.test(lines[i]) || (exclude && exclude.test(lines[i]))) continue;
    const amounts = amountsInLine(lines[i]);
    const found = amounts.length ? amounts : amountsInLine(lines[i + 1] || '');
    if (found.length) return found[found.length - 1];
  }
  return null;
};

// Total belanja = uang yang dibayarkan − kembalian. Dipakai untuk memvalidasi / melengkapi hasil OCR.
const findCashMinusChange = (lines: string[]): number | null => {
  const cash = lastAmountNear(lines, /tunai|cash|dibayar|\bbayar\b/i, /total|kembali|change/i);
  const change = lastAmountNear(lines, /kembali|kembalian|change/i);
  if (cash !== null && change !== null && cash > change) return cash - change;
  return null;
};

const findCandidates = (lines: string[]): number[] => {
  const amounts = lines.flatMap((l) => (l.match(/\d{1,3}(?:[.,]\d{3})+/g) || []).map(parseAmount));
  const unique = Array.from(new Set(amounts.filter((n): n is number => n !== null && n >= 1000 && n < 100_000_000)));
  return unique.sort((a, b) => b - a).slice(0, 6);
};

export const parseReceiptText = (text: string): ReceiptData => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const keywordTotal = findTotal(lines, false);
  const derived = findCashMinusChange(lines);
  const confident = keywordTotal !== null && derived !== null && keywordTotal === derived;

  return {
    total: keywordTotal ?? derived ?? findTotal(lines),
    merchant: findMerchant(lines),
    category: guessCategory(text),
    rawText: text,
    confident,
    candidates: findCandidates(lines),
  };
};

// ===== OCR =====

// Batas sisi terpanjang saat membaca foto: cukup besar agar struk kecil di dalam frame masih terbaca,
// tapi tidak menghabiskan memori HP (foto 12 MP ≈ 48 MB sebagai RGBA).
const MAX_PHOTO_SIDE = 3500;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak bisa dibaca'));
    };
    image.src = url;
  });

const grayToCanvas = (gray: Gray): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = gray.width;
  canvas.height = gray.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');
  const imageData = ctx.createImageData(gray.width, gray.height);
  for (let i = 0, p = 0; i < gray.data.length; i++, p += 4) {
    imageData.data[p] = imageData.data[p + 1] = imageData.data[p + 2] = gray.data[i];
    imageData.data[p + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

interface Pass {
  variant: string;
  psm: '3' | '6';
}

// Dicoba berurutan sampai ada kesepakatan. Mode berbeda saling melengkapi
// (mis. satu digit salah baca di satu mode tetapi benar di mode lain).
const PASSES: Pass[] = [
  { variant: 'adaptive', psm: '3' },
  { variant: 'adaptive', psm: '6' },
  { variant: 'contrast', psm: '6' },
];

interface PassResult {
  data: ReceiptData;
  confidence: number;
}

// Gabungkan hasil beberapa pass: total dengan suara terbanyak (seri → keyakinan OCR tertinggi).
export const mergeResults = (results: PassResult[]): ReceiptData => {
  if (results.length === 0) {
    return { total: null, merchant: null, category: null, rawText: '', confident: false, candidates: [] };
  }

  const score = new Map<number, { votes: number; confidence: number; confident: boolean }>();
  results.forEach(({ data, confidence }) => {
    if (data.total === null) return;
    const entry = score.get(data.total) || { votes: 0, confidence: 0, confident: false };
    entry.votes += data.confident ? 2 : 1;
    entry.confidence = Math.max(entry.confidence, confidence);
    entry.confident = entry.confident || data.confident;
    score.set(data.total, entry);
  });

  let total: number | null = null;
  let bestVotes = -1;
  let bestConfidence = -1;
  score.forEach((value, key) => {
    if (value.votes > bestVotes || (value.votes === bestVotes && value.confidence > bestConfidence)) {
      total = key;
      bestVotes = value.votes;
      bestConfidence = value.confidence;
    }
  });

  const byConfidence = [...results].sort((a, b) => b.confidence - a.confidence).map((r) => r.data);
  const candidates = Array.from(new Set(results.flatMap((r) => r.data.candidates)))
    .sort((a, b) => b - a)
    .slice(0, 6);

  return {
    total,
    merchant: byConfidence.find((d) => d.merchant)?.merchant ?? null,
    category: byConfidence.find((d) => d.category)?.category ?? null,
    rawText: byConfidence[0].rawText,
    confident: total !== null && !!score.get(total)?.confident,
    candidates,
  };
};

export const scanReceipt = async (file: File, onProgress?: (progress: number, status: string) => void): Promise<ReceiptData> => {
  onProgress?.(0, 'preparing');
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas tidak tersedia');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  await nextFrame();
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  await nextFrame();
  const variants = buildVariants(rgba, canvas.width, canvas.height);

  // Dimuat saat dibutuhkan saja supaya bundle utama tetap kecil.
  const { createWorker } = await import('tesseract.js');
  let currentPass = 0;
  const worker = await createWorker(['ind', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.((currentPass + m.progress) / PASSES.length, m.status);
    },
  });

  const results: PassResult[] = [];
  try {
    for (currentPass = 0; currentPass < PASSES.length; currentPass++) {
      const pass = PASSES[currentPass];
      const variant = variants.find((v) => v.name === pass.variant);
      if (!variant) continue;

      await worker.setParameters({ tessedit_pageseg_mode: pass.psm as any });
      const { data } = await worker.recognize(grayToCanvas(variant.image));
      const parsed = parseReceiptText(data.text);
      results.push({ data: parsed, confidence: data.confidence });

      // Berhenti lebih awal: total cocok dengan tunai − kembali, atau dua pass sepakat.
      if (parsed.total !== null) {
        if (parsed.confident) break;
        if (results.filter((r) => r.data.total === parsed.total).length >= 2) break;
      }
    }
  } finally {
    await worker.terminate();
  }

  return mergeResults(results);
};
