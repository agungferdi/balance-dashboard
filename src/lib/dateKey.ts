// Kunci tanggal berdasarkan zona waktu perangkat. Jangan pakai toISOString(): itu UTC, sehingga
// transaksi dini hari (WIB) masuk ke hari sebelumnya dan kolom "hari ini" bergeser.
export const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const fromDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
