import { parseAmount, parseReceiptText, mergeResults } from './receipt';

describe('parseAmount', () => {
  it.each([
    ['45.000', 45000],
    ['45,000', 45000],
    ['45.000,00', 45000],
    ['1.250.000', 1250000],
    ['27500', 27500],
    ['12 500', 12500],
  ])('%s → %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });
});

describe('parseReceiptText', () => {
  it('reads an Indomaret-style receipt', () => {
    const text = `INDOMARET
JL. SUDIRMAN NO 12
01/10/2026 12:31
AQUA 600ML    2 x 3.500    7.000
ROTI TAWAR         15.500
SUB TOTAL          22.500
DISKON             -1.000
TOTAL BELANJA      21.500
TUNAI              50.000
KEMBALI            28.500`;
    const result = parseReceiptText(text);
    expect(result.total).toBe(21500);
    expect(result.merchant).toBe('INDOMARET');
    expect(result.category).toBe('Foods');
  });

  it('prefers grand total over subtotal and tax', () => {
    const text = `Kopi Kenangan
Subtotal 40,000
PPN 10% 4,000
Grand Total 44,000
Cash 50,000`;
    expect(parseReceiptText(text).total).toBe(44000);
  });

  it('handles the amount on the line after the keyword', () => {
    const text = `SPBU 34.123.45
PERTALITE
TOTAL
Rp 100.000`;
    const result = parseReceiptText(text);
    expect(result.total).toBe(100000);
    expect(result.category).toBe('Transportation');
  });

  it('falls back to the largest formatted amount', () => {
    const text = `Warung Bu Siti
Nasi ayam 18.000
Es teh 5.000
23.000`;
    expect(parseReceiptText(text).total).toBe(23000);
  });
});

describe('cash − change cross-check', () => {
  it('flags a total that matches tunai − kembali as confident', () => {
    const r = parseReceiptText(`INDOMARET\nTOTAL BELANJA 50.000\nTUNAI 100.000\nKEMBALI 50.000`);
    expect(r.total).toBe(50000);
    expect(r.confident).toBe(true);
  });

  it('derives the total from tunai − kembali when no total keyword is readable', () => {
    const r = parseReceiptText(`WARUNG\nNasi ayam 20.000\nEs teh 5.000\nTUNAI 50.000\nKEMBALI 25.000`);
    expect(r.total).toBe(25000);
  });

  it('exposes the biggest amounts as manual candidates', () => {
    const r = parseReceiptText(`WARUNG\nNasi 20.000\nEs teh 5.000\nTUNAI 50.000`);
    expect(r.candidates).toEqual([50000, 20000, 5000]);
  });
});

describe('mergeResults', () => {
  const result = (total: number | null, confidence: number, confident = false) => ({
    data: { total, merchant: null, category: null, rawText: '', confident, candidates: [] as number[] },
    confidence,
  });

  it('prefers the total most passes agree on', () => {
    expect(mergeResults([result(63805, 80), result(83805, 50), result(83805, 40)]).total).toBe(83805);
  });

  it('breaks ties by OCR confidence', () => {
    expect(mergeResults([result(100, 30), result(200, 90)]).total).toBe(200);
  });

  it('returns null total when nothing was read', () => {
    expect(mergeResults([result(null, 10)]).total).toBeNull();
  });
});
