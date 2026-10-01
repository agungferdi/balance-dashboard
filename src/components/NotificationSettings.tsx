import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, X } from 'lucide-react';
import {
  getSpendingLimits,
  saveSpendingLimits,
  notificationPermission,
  requestNotificationPermission,
  notify,
} from '../lib/notifications';

const NotificationSettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(notificationPermission());
  const [daily, setDaily] = useState(String(getSpendingLimits().daily));
  const [weekly, setWeekly] = useState(String(getSpendingLimits().weekly));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      notify('Notifikasi aktif', 'Anda akan menerima info sync, hasil scan struk, dan batas pengeluaran.');
    }
  };

  const saveLimits = (nextDaily: string, nextWeekly: string) => {
    saveSpendingLimits({
      daily: Math.max(0, parseInt(nextDaily, 10) || 0),
      weekly: Math.max(0, parseInt(nextWeekly, 10) || 0),
    });
  };

  const Icon = permission === 'granted' ? BellRing : permission === 'denied' ? BellOff : Bell;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
        title="Notifikasi"
      >
        <Icon size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] z-50 bg-white dark:bg-[#1a1a24] rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Notifikasi</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          </div>

          {permission === 'granted' && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Notifikasi aktif.</p>
          )}
          {permission === 'default' && (
            <button
              onClick={enableNotifications}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              Aktifkan notifikasi
            </button>
          )}
          {permission === 'denied' && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Notifikasi diblokir browser. Izinkan lewat pengaturan situs, lalu muat ulang. Sementara itu pesan tampil di dalam aplikasi.
            </p>
          )}
          {permission === 'unsupported' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Browser ini tidak mendukung notifikasi. Di iPhone, tambahkan aplikasi ke Home Screen dulu.
            </p>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Peringatan batas pengeluaran</p>
            <label className="block">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Per hari (Rp)</span>
              <input
                type="number"
                min="0"
                value={daily}
                onChange={(e) => {
                  setDaily(e.target.value);
                  saveLimits(e.target.value, weekly);
                }}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Per minggu, mulai Senin (Rp)</span>
              <input
                type="number"
                min="0"
                value={weekly}
                onChange={(e) => {
                  setWeekly(e.target.value);
                  saveLimits(daily, e.target.value);
                }}
                className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Isi 0 untuk mematikan. Peringatan muncul sekali per hari / minggu.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
