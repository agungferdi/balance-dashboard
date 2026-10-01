import { readJson, writeJson } from './storage';
import { TransactionWithBalance } from '../types/transaction';

export const notificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
};

// Fallback ketika izin notifikasi belum diberikan: App menampilkan toast di dalam halaman.
type InAppListener = (title: string, body: string) => void;
let inAppListener: InAppListener | null = null;
export const setInAppNotificationListener = (listener: InAppListener | null) => {
  inAppListener = listener;
};

export const notify = async (title: string, body: string, tag?: string): Promise<void> => {
  if (notificationsSupported() && Notification.permission === 'granted') {
    const options: NotificationOptions = {
      body,
      tag,
      icon: `${process.env.PUBLIC_URL}/icon-192.png`,
      badge: `${process.env.PUBLIC_URL}/icon-192.png`,
    };
    try {
      // Di mobile (Android) `new Notification()` tidak didukung; harus lewat service worker.
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
      if (registration) {
        await registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
      return;
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
  inAppListener?.(title, body);
};

// ===== Peringatan batas pengeluaran =====

export interface SpendingLimits {
  daily: number;
  weekly: number;
}

const LIMITS_KEY = 'balance-spending-limits';
const ALERTED_KEY = 'balance-spending-alerted';

export const DEFAULT_LIMITS: SpendingLimits = { daily: 40000, weekly: 280000 };

export const getSpendingLimits = (): SpendingLimits => ({ ...DEFAULT_LIMITS, ...readJson<Partial<SpendingLimits>>(LIMITS_KEY, {}) });
export const saveSpendingLimits = (limits: SpendingLimits) => writeJson(LIMITS_KEY, limits);

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Minggu dimulai hari Senin.
const startOfWeek = (d: Date): Date => {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

export const getSpendingTotals = (transactions: TransactionWithBalance[], now = new Date()) => {
  const todayKey = localDateKey(now);
  const weekStart = startOfWeek(now).getTime();
  let today = 0;
  let week = 0;

  transactions.forEach((t) => {
    if (t.type !== 'expense' || t.is_hidden) return;
    const created = new Date(t.created_at);
    if (created.getTime() >= weekStart) week += Number(t.total);
    if (localDateKey(created) === todayKey) today += Number(t.total);
  });

  return { today, week };
};

// Satu peringatan per hari / per minggu, agar tidak muncul berulang setiap transaksi.
export const checkSpendingAlerts = (transactions: TransactionWithBalance[], now = new Date()): void => {
  const limits = getSpendingLimits();
  const { today, week } = getSpendingTotals(transactions, now);
  const alerted = readJson<{ day?: string; week?: string }>(ALERTED_KEY, {});
  const dayKey = localDateKey(now);
  const weekKey = localDateKey(startOfWeek(now));

  if (limits.daily > 0 && today > limits.daily && alerted.day !== dayKey) {
    alerted.day = dayKey;
    notify(
      'Pengeluaran hari ini melebihi batas',
      `Hari ini ${formatCurrency(today)} (batas ${formatCurrency(limits.daily)}).`,
      'limit-daily'
    );
  }

  if (limits.weekly > 0 && week > limits.weekly && alerted.week !== weekKey) {
    alerted.week = weekKey;
    notify(
      'Pengeluaran minggu ini melebihi batas',
      `Minggu ini ${formatCurrency(week)} (batas ${formatCurrency(limits.weekly)}).`,
      'limit-weekly'
    );
  }

  writeJson(ALERTED_KEY, alerted);
};
