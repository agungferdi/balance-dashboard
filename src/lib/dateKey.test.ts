import { toDateKey, fromDateKey } from './dateKey';

// Zona waktu ditetapkan sebelum Date dipakai agar tes konsisten di mesin mana pun.
process.env.TZ = 'Asia/Jakarta';

describe('toDateKey (WIB, UTC+7)', () => {
  it('puts an early-morning local transaction on the local day, not the UTC day', () => {
    // 2 Okt 03:00 WIB = 1 Okt 20:00 UTC
    expect(toDateKey(new Date('2026-10-01T20:00:00Z'))).toBe('2026-10-02');
  });

  it('keeps an evening transaction on the same local day', () => {
    // 2 Okt 23:30 WIB = 2 Okt 16:30 UTC
    expect(toDateKey(new Date('2026-10-02T16:30:00Z'))).toBe('2026-10-02');
  });

  it('gives local midnight its own day (the old toISOString() gave the previous day)', () => {
    const midnight = new Date(2026, 9, 2, 0, 0, 0);
    expect(toDateKey(midnight)).toBe('2026-10-02');
    expect(midnight.toISOString().split('T')[0]).toBe('2026-10-01');
  });
});

describe('fromDateKey', () => {
  it('round-trips with toDateKey', () => {
    expect(toDateKey(fromDateKey('2026-10-02'))).toBe('2026-10-02');
    expect(toDateKey(fromDateKey('2026-01-01'))).toBe('2026-01-01');
  });
});
