import { ExpenseCategory } from '../types/transaction';

export interface ReceiptData {
  total: number | null;
  merchant: string | null;
  category: ExpenseCategory | null;
  rawText: string;
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

const findTotal = (lines: string[]): number | null => {
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

export const parseReceiptText = (text: string): ReceiptData => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    total: findTotal(lines),
    merchant: findMerchant(lines),
    category: guessCategory(text),
    rawText: text,
  };
};

// ===== OCR =====

// Perkecil + grayscale + naikkan kontras: OCR jauh lebih akurat & cepat untuk foto kamera.
const preprocessImage = async (file: File): Promise<HTMLCanvasElement> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
      image.src = url;
    });

    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    const contrast = 1.4;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const scanReceipt = async (file: File, onProgress?: (progress: number, status: string) => void): Promise<ReceiptData> => {
  const image = await preprocessImage(file);
  // Dimuat saat dibutuhkan saja supaya bundle utama tetap kecil.
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['ind', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => onProgress?.(m.progress, m.status),
  });
  try {
    const { data } = await worker.recognize(image);
    return parseReceiptText(data.text);
  } finally {
    await worker.terminate();
  }
};
