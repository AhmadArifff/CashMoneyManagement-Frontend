'use client';

import { useEffect, useState } from 'react';
import flatpickr from 'flatpickr';
import { Chart, registerables } from 'chart.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import LandingPage from './components/LandingPage';

Chart.register(...registerables);
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_BASE = rawApiUrl.replace(/\/health\/?$/i, '').replace(/\/+$/, '');

export default function Home({ initialView = 'landing' }) {
  const [isLandingVisible, setIsLandingVisible] = useState(initialView === 'landing');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.Chart = Chart;
    window.flatpickr = flatpickr;
    window.html2canvas = html2canvas;
    window.jspdf = { jsPDF };

    window.__onAuthChange = (isLoggedIn) => {
      if (!isLoggedIn) {
        setIsLandingVisible(true);
      }
    };

    if (initialView !== 'landing') {
      const token = localStorage.getItem('cashmoney:token');
      if (token) {
        setIsLandingVisible(false);
      }
    }

    // Registrasi Service Worker hanya pada mode produksi agar tidak mengganggu HMR dev server (404 chunks)
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service worker registered:', registration.scope);
          })
          .catch((error) => {
            console.warn('Service worker registration failed:', error);
          });
      });
    } else if (typeof window !== 'undefined') {
      // Unregister service worker dan bersihkan Cache Storage saat development agar Next.js dev HMR tidak 404
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => r.unregister());
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    }

    const U = {
      uid: () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      todayStr: () => U.iso(new Date()),
      iso: (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },
      parseD: (s) => {
        if (!s || typeof s !== 'string') return new Date();
        const parts = s.split('-');
        if (parts.length < 3) return new Date();
        const [y, m, d] = parts.map(Number);
        return new Date(y, m - 1, d);
      },
      addDays: (d, n) => {
        const r = new Date(d);
        r.setDate(r.getDate() + n);
        return r;
      },
      fmtIDR: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      formatNumberID: (val) => {
        if (val === null || val === undefined || val === '') return '';
        const clean = String(val).replace(/\D/g, '');
        if (!clean) return '';
        return Number(clean).toLocaleString('id-ID');
      },
      parseNumberID: (val) => {
        if (!val) return 0;
        const clean = String(val).replace(/\D/g, '');
        return clean ? Number(clean) : 0;
      },
      attachRupiahInputMask: (inputEl) => {
        if (!inputEl || inputEl.dataset.rupiahBound) return;
        inputEl.dataset.rupiahBound = 'true';
        const handler = () => {
          const raw = inputEl.value;
          if (!raw) return;
          const formatted = U.formatNumberID(raw);
          inputEl.value = formatted;
        };
        inputEl.addEventListener('input', handler);
        inputEl.addEventListener('blur', handler);
      },
      fmtDateID: (s) => U.parseD(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      fmtDateShort: (s) => U.parseD(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      fmtRangeLabel: (start, end) => {
        if (!start || !end) return '';
        const d1 = U.parseD(start);
        const d2 = U.parseD(end);
        const m1 = d1.toLocaleDateString('id-ID', { month: 'short' });
        const m2 = d2.toLocaleDateString('id-ID', { month: 'short' });
        const y1 = d1.getFullYear();
        const y2 = d2.getFullYear();
        const day1 = String(d1.getDate()).padStart(2, '0');
        const day2 = String(d2.getDate()).padStart(2, '0');

        if (y1 === y2) {
          if (m1 === m2) {
            return `${day1} – ${day2} ${m1} ${y1}`;
          }
          return `${day1} ${m1} – ${day2} ${m2} ${y1}`;
        }
        return `${day1} ${m1} ${y1} – ${day2} ${m2} ${y2}`;
      },
      getMonday: (d) => {
        const r = new Date(d);
        const day = (r.getDay() + 6) % 7;
        r.setDate(r.getDate() - day);
        r.setHours(0, 0, 0, 0);
        return r;
      },
      getSunday: (d) => U.addDays(U.getMonday(U.parseD(d)), 6),
      monthKey: (s) => s.slice(0, 7),
      monthLabel: (key) => {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      },
      daysBetween: (a, b) => Math.round((U.parseD(b) - U.parseD(a)) / 86400000),
      clamp: (n, a, b) => Math.max(a, Math.min(b, n)),
    };

    const EXPENSE_CATS = {
      tetap: {
        label: 'Pengeluaran Tetap (Fixed Expenses)',
        color: '#1F6F5C',
        description: 'Pengeluaran rutin bulanan yang nilainya cenderung konstan dan WAJIB dibayar setiap periode. Memiliki sanksi/denda jika terlambat.',
        examples: 'Sewa/KPR Rumah, Tagihan Listrik/Air/Wi-Fi, Cicilan Kendaraan, SPP Sekolah, Premi Asuransi.',
        tips: '💡 Porsi ideal: Maksimal 30% - 40% dari total penghasilan bulanan Anda.',
        freq: [['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan']],
        subs: ['Sewa/Kontrakan Rumah', 'Tagihan Internet', 'Tagihan Listrik', 'Tagihan Air', 'Cicilan/KPR', 'Premi Asuransi', 'Langganan Digital', 'Lainnya'],
      },
      berkala: {
        label: 'Pengeluaran Berkala (Periodic Expenses)',
        color: '#DE9518',
        description: 'Pengeluaran yang tidak terjadi setiap bulan, tetapi waktunya terprediksi (misal: per 3 bulan, 6 bulan, atau tahunan).',
        examples: 'Pajak STNK / Kendaraan, Servis Besar Mobil/Motor, Pajak PBB, Zakat Maal / Sumbangan Tahunan.',
        tips: '💡 Tips Finansial: Sisihkan dana tiap bulan agar tidak kaget saat jatuh tempo bayar.',
        freq: [['3bulan', 'Tiap 3 Bulan'], ['6bulan', 'Tiap 6 Bulan'], ['tahunan', 'Tahunan']],
        subs: ['Pajak Kendaraan', 'Servis Besar Kendaraan', 'Perpanjangan STNK', 'Zakat / Sumbangan Tahunan', 'Lainnya'],
      },
      dinamis: {
        label: 'Pengeluaran Dinamis / Variabel (Variable Expenses)',
        color: '#B8471F',
        description: 'Pengeluaran harian atau fleksibel yang jumlahnya dapat berubah-ubah dan relatif bisa dikontrol sesuai gaya hidup.',
        examples: 'Makan & Minum di luar, Transportasi/BBM, Belanja Hobi, Hiburan/Nonton, Belanja Pakaian, Jajan.',
        tips: '💡 Tips Finansial: Pos terbaik untuk dihemat jika ingin menaikkan kapasitas alokasi tabungan & investasi.',
        freq: [['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan']],
        subs: ['Makan & Minum', 'Transportasi / BBM', 'Rekreasi / Hiburan', 'Belanja Kebutuhan', 'Kesehatan', 'Lainnya'],
      },
    };

    const INCOME_CATS = {
      earned: {
        label: 'Earned / Active Income (Penghasilan Aktif)',
        color: '#1F6F5C',
        description: 'Penghasilan utama dari pertukaran waktu & tenaga secara langsung (bekerja/berjasa).',
        examples: 'Gaji Bulanan, Upah Harian, Bonus Kinerja, Komisi Penjualan, Project Freelance.',
        tips: '💡 Sumber modal awal untuk menopang biaya hidup & membangun aset.',
        subs: ['Gaji Bulanan', 'Upah Harian', 'Bonus', 'Komisi', 'Pekerjaan Lepas', 'Lainnya'],
      },
      passive: {
        label: 'Passive Income (Penghasilan Pasif)',
        color: '#4FA88E',
        description: 'Penghasilan yang terus mengalir secara otomatis dari sistem atau aset tanpa kehadiran fisik harian.',
        examples: 'Hasil Sewa Kontrakan/Kosan, Royalti Karya/Buku, Lisensi Software, Bisnis Berjalan via Manager.',
        tips: '💡 Target kebebasan finansial! Semakin besar pasif income, semakin mandiri keuangan Anda.',
        subs: ['Sewa Properti', 'Royalti', 'Afiliasi', 'Lainnya'],
      },
      portfolio: {
        label: 'Portfolio / Investment Income (Penghasilan Investasi)',
        color: '#7EC2AC',
        description: 'Penghasilan dari pertumbuhan dan imbal hasil aset keuangan/pasar modal.',
        examples: 'Dividen Saham, Bunga Deposito, Gain Reksadana, Kupon Obligasi/ORISURI.',
        tips: '💡 Hasil dari membiarkan uang bekerja untuk Anda (Money works for you).',
        subs: ['Dividen Saham', 'Bunga Deposito', 'Capital Gain', 'Reksadana', 'Lainnya'],
      },
    };

    const ALLOCATION_CATS = {
      darurat: {
        label: 'Dana Darurat (Emergency Fund)',
        color: '#1F6F5C',
        description: 'Bantal pengaman finansial cair untuk menghadapi krisis darurat (PHK, sakit mendadak, musibah).',
        examples: 'Tabungan khusus di rekening terpisah / Reksadana Pasar Uang.',
        tips: '💡 Target Ideal: 3–6 bulan pengeluaran (lajang) atau 6–12 bulan pengeluaran (berkeluarga).',
        subs: ['Dana Darurat'],
      },
      asuransi: {
        label: 'Asuransi & Proteksi (Financial Risk Transfer)',
        color: '#4FA88E',
        description: 'Alokasi pengaman agar kekayaan & tabungan tidak ludes akibat risiko kesehatan/jiwa.',
        examples: 'BPJS Kesehatan, Asuransi Kesehatan Swasta, Asuransi Jiwa Term-Life, Asuransi Kendaraan.',
        tips: '💡 Fondasi paling dasar sebelum mulai berinvestasi risiko tinggi.',
        subs: ['Asuransi Jiwa', 'Asuransi Kesehatan', 'Asuransi Kendaraan', 'Lainnya'],
      },
      investasi: {
        label: 'Investasi Pertumbuhan (Wealth Growth)',
        color: '#DE9518',
        description: 'Alokasi dana jangka panjang untuk mengalahkan inflasi dan membangun kekayaan.',
        examples: 'Saham Bluechip, Reksadana Saham/Campuran, Obligasi Pemerintah (SBR/ORI), Emas Batangan.',
        tips: '💡 Lakukan secara rutin tiap bulan (Dollar Cost Averaging).',
        subs: ['Saham', 'Reksadana', 'Obligasi', 'Emas', 'Kripto', 'Lainnya'],
      },
      cadangan: {
        label: 'Dana Cadangan & Target Khusus (Short-Term Goals)',
        color: '#B8471F',
        description: 'Alokasi tabungan untuk rencana pengeluaran khusus di masa depan (jangka pendek/menengah).',
        examples: 'Dana Liburan, DP Rumah/Motor, Dana Perayaan Hari Raya, Gadget/Komputer Baru.',
        tips: '💡 Dipisahkan agar tidak terpakai untuk kebutuhan harian.',
        subs: ['Dana Liburan', 'Dana Perayaan', 'Cadangan Lainnya'],
      },
    };

    const expenseToBackend = (item) => ({
      category: item.category,
      subcategory: item.subcategory || 'Umum',
      frequency: item.freq || null,
      amount: item.amount,
      date: item.date,
      status: item.status || 'paid',
      is_estimate: !!item.isEstimate,
      note: item.note || '',
    });

    const expenseFromBackend = (item) => ({
      id: String(item.id),
      category: item.category,
      subcategory: item.subcategory || 'Umum',
      freq: item.frequency || '',
      amount: Number(item.amount),
      date: item.date,
      status: item.status,
      isEstimate: !!item.is_estimate,
      note: item.note || '',
      attachmentPath: item.attachment_path || '',
      attachmentUrl: item.attachment_url || '',
      createdAt: item.created_at ? Date.parse(item.created_at) : Date.now(),
    });

    const incomeToBackend = (item) => ({
      category: item.category,
      subcategory: item.subcategory || 'Umum',
      amount: item.amount,
      date: item.date,
      note: item.note || '',
    });

    const incomeFromBackend = (item) => ({
      id: String(item.id),
      category: item.category,
      subcategory: item.subcategory || 'Umum',
      amount: Number(item.amount),
      date: item.date,
      note: item.note || '',
      attachmentPath: item.attachment_path || '',
      attachmentUrl: item.attachment_url || '',
      createdAt: item.created_at ? Date.parse(item.created_at) : Date.now(),
    });

    const allocationToBackend = (item) => ({
      category: item.category,
      subcategory: item.subcategory || 'Umum',
      amount: item.amount,
      target_amount: item.targetAmount || 0,
      date: item.date,
      note: item.note || '',
    });

    const allocationFromBackend = (item) => ({
      id: String(item.id),
      category: item.category,
      subcategory: item.subcategory,
      amount: Number(item.amount),
      targetAmount: Number(item.target_amount || 0),
      remainingAmount: Number(item.remaining_amount || (item.target_amount > item.amount ? item.target_amount - item.amount : 0)),
      progressPercentage: Number(item.progress_percentage || (item.target_amount > 0 ? Math.min(100, Math.round((item.amount / item.target_amount) * 100)) : 0)),
      date: item.date,
      note: item.note || '',
      attachmentPath: item.attachment_path || '',
      attachmentUrl: item.attachment_url || '',
      createdAt: item.created_at ? Date.parse(item.created_at) : Date.now(),
    });

    class Store {
      constructor() {
        this.hasWidgetStorage = typeof window !== 'undefined' && !!window.storage;
        this.hasLocalStorage = (() => {
          try {
            localStorage.setItem('__t', '1');
            localStorage.removeItem('__t');
            return true;
          } catch (e) {
            return false;
          }
        })();
        this.mem = {};
      }
      async get(key) {
        let val = null;
        if (this.hasLocalStorage) {
          try { val = localStorage.getItem(key); } catch (_) {}
        }
        if (!val && typeof document !== 'undefined') {
          try {
            const match = document.cookie.match(new RegExp('(^| )' + encodeURIComponent(key) + '=([^;]+)'));
            if (match) val = decodeURIComponent(match[2]);
          } catch (_) {}
        }
        if (!val && this.hasWidgetStorage) {
          try {
            const r = await window.storage.get(key, false);
            val = r ? r.value : null;
          } catch (_) {}
        }
        return val || (key in this.mem ? this.mem[key] : null);
      }
      async set(key, value) {
        this.mem[key] = value;
        if (this.hasLocalStorage) {
          try {
            if (value === '' || value === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, value);
            }
          } catch (_) {}
        }
        if (typeof document !== 'undefined') {
          try {
            if (value === '' || value === null) {
              document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            } else {
              document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; max-age=2592000; path=/; SameSite=Lax`;
            }
          } catch (_) {}
        }
        if (this.hasWidgetStorage) {
          try {
            await window.storage.set(key, value, false);
          } catch (_) {}
        }
        return true;
      }
    }

    class Repo {
      constructor(store, key, endpoint = null, toBackend = (item) => item, fromBackend = (item) => item) {
        this.store = store;
        this.key = key;
        this.endpoint = endpoint;
        this.toBackend = toBackend;
        this.fromBackend = fromBackend;
        this.items = [];
      }

      async apiRequest(method, path = '', body = null) {
        const token = await this.store.get('cashmoney:token');
        if (!token || !this.endpoint) {
          throw new Error('No API token or endpoint available');
        }

        const headers = {
          'Accept': 'application/json',
        };

        // Authorization header
        headers.Authorization = `Bearer ${token}`;

        const options = { method, headers };

        // If body is FormData, send it as-is (do not set Content-Type)
        if (body instanceof FormData) {
          options.body = body;
        } else if (body) {
          headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}/${path}`, options);

        // If unauthorized, clear stored token so App can react and prompt login
        if (response.status === 401) {
          try {
            await this.store.set('cashmoney:token', '');
          } catch (e) {
            // ignore
          }
          const jsonErr = await response.json().catch(() => null);
          const msg = jsonErr?.message || 'Unauthorized';
          const err = new Error(msg);
          err.code = 'unauthorized';
          throw err;
        }

        const json = await response.json().catch(() => null);
        if (!response.ok) {
          const message = json?.message || json?.error || response.statusText;
          throw new Error(message);
        }

        return json;
      }

      async load(params = null) {
        try {
          let url = this.endpoint;
          if (params) {
            const query = new URLSearchParams(params).toString();
            url = `${this.endpoint}?${query}`;
          }
          const json = await this.apiRequest('GET', url);
          const payload = json?.data ?? json;
          if (Array.isArray(payload)) {
            this.items = payload.map(this.fromBackend);
            await this.persist();
            return this.items;
          }
        } catch (error) {
          console.warn('Backend load failed, using local cache:', error);
          if (error && error.code === 'unauthorized') {
            throw error;
          }
        }

        const raw = await this.store.get(this.key);
        try {
          this.items = raw ? JSON.parse(raw) : [];
        } catch (e) {
          this.items = [];
        }
        return this.items;
      }

      async persist() {
        await this.store.set(this.key, JSON.stringify(this.items));
      }

      async add(item) {
        if (this.items.find((x) => x.id === item.id)) {
          return this.update(item.id, item);
        }

        try {
          const response = await this.apiRequest('POST', this.endpoint, this.toBackend(item));
          const returned = response?.data ?? response;
          const created = this.fromBackend(returned);
          this.items.push(created);
          await this.persist();
          return created;
        } catch (error) {
          console.warn('Backend add failed, saving locally:', error);
          this.items.push(item);
          await this.persist();
          return item;
        }
      }

      async update(id, patch) {
        const index = this.items.findIndex((x) => x.id === id);
        if (index === -1) {
          return;
        }

        const existing = this.items[index];
        const updatedItem = { ...existing, ...patch };

        try {
          const response = await this.apiRequest('PUT', `${this.endpoint}/${id}`, this.toBackend(updatedItem));
          const returned = response?.data ?? response;
          const converted = this.fromBackend(returned);
          this.items[index] = converted;
          await this.persist();
          return converted;
        } catch (error) {
          console.warn('Backend update failed, updating locally:', error);
          this.items[index] = updatedItem;
          await this.persist();
          return updatedItem;
        }
      }

      async remove(id) {
        try {
          await this.apiRequest('DELETE', `${this.endpoint}/${id}`);
        } catch (error) {
          console.warn('Backend delete failed, removing locally:', error);
        }

        this.items = this.items.filter((x) => x.id !== id);
        await this.persist();
      }

      find(id) {
        return this.items.find((x) => x.id === id);
      }

      inRange(start, end) {
        return this.items.filter((x) => x.date >= start && x.date <= end);
      }
    }

    class Aggregator {
      static byCategory(items) {
        const m = {};
        items.forEach((x) => {
          m[x.category] = (m[x.category] || 0) + Number(x.amount);
        });
        return m;
      }
      static total(items) {
        return items.reduce((s, x) => s + Number(x.amount), 0);
      }
      static byWeek(items) {
        const m = {};
        items.forEach((x) => {
          const wkKey = U.iso(U.getMonday(U.parseD(x.date)));
          m[wkKey] = (m[wkKey] || 0) + Number(x.amount);
        });
        return m;
      }
      static byMonth(items) {
        const m = {};
        items.forEach((x) => {
          const k = U.monthKey(x.date);
          m[k] = (m[k] || 0) + Number(x.amount);
        });
        return m;
      }
    }

    function toast(msg, kind = 'ok') {
      const wrap = document.getElementById('toastWrap');
      if (!wrap) return;
      const el = document.createElement('div');
      const bg = kind === 'ok' ? 'bg-teal-700' : kind === 'err' ? 'bg-rust-600' : 'bg-ink';
      el.className = `toast ${bg} text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-lg`;
      el.textContent = msg;
      wrap.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .3s';
        setTimeout(() => el.remove(), 300);
      }, 2200);
    }

    class App {
      constructor(initialView = 'dashboard') {
        this.store = new Store();
        this.expenses = new Repo(this.store, 'cashmoney:expenses', 'expenses', expenseToBackend, expenseFromBackend);
        this.incomes = new Repo(this.store, 'cashmoney:incomes', 'incomes', incomeToBackend, incomeFromBackend);
        this.allocations = new Repo(this.store, 'cashmoney:allocations', 'allocations', allocationToBackend, allocationFromBackend);
        this.expenseFilter = 'all';
        this.incomeFilter = 'all';
        this.charts = {};
        this.confirmCb = null;
        this.initialView = initialView;
        this.tokenKey = 'cashmoney:token';
        this.userKey = 'cashmoney:user';
        this.user = null;
        this.profile = null;
        this.inited = false;
        this.setupRepoKeys();
        const today = new Date();
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        this.range = { start: U.iso(first), end: U.iso(last) };
      }
      cacheKey(key) {
        return this.user ? `cashmoney:user-${this.user.id}:${key}` : `cashmoney:${key}`;
      }
      setupRepoKeys() {
        this.expenses.key = this.cacheKey('expenses');
        this.incomes.key = this.cacheKey('incomes');
        this.allocations.key = this.cacheKey('allocations');
      }
      async setUser(user) {
        this.user = user || null;
        if (user) {
          await this.store.set(this.userKey, JSON.stringify(user));
        } else {
          await this.store.set(this.userKey, '');
        }
        this.setupRepoKeys();
        this.updateAuthStatus();
        this.updateUserDisplay();
      }
      updateUserDisplay() {
        const userTile = document.getElementById('userTile');
        const userName = document.getElementById('userNameDisplay');
        const dName = document.getElementById('userDropdownName');
        const dEmail = document.getElementById('userDropdownEmail');
        if (!userTile || !userName) return;
        if (this.user) {
          const shortName = this.user.name ? this.user.name.split(' ')[0] : 'User';
          userName.textContent = `Halo, ${shortName}`;
          if (dName) dName.textContent = this.user.name || 'User';
          if (dEmail) dEmail.textContent = this.user.email || '';
          userTile.classList.remove('hidden');
        } else {
          userTile.classList.add('hidden');
          userName.textContent = '';
        }
      }
      updateAuthStatus() {
        const btn = document.getElementById('authBtn');
        const userTile = document.getElementById('userTile');
        if (this.token) {
          if (btn) btn.classList.add('hidden');
          if (userTile) userTile.classList.remove('hidden');
        } else {
          if (btn) {
            btn.classList.remove('hidden');
            btn.textContent = 'Masuk';
          }
          if (userTile) userTile.classList.add('hidden');
        }
      }
      async fetchProfile() {
        if (!this.token) return null;
        try {
          const res = await fetch(`${API_BASE}/profile`, {
            headers: { 'Authorization': `Bearer ${this.token}`, Accept: 'application/json' },
          });
          if (!res.ok) return null;
          const json = await res.json();
          this.profile = json?.data ?? json;
          return this.profile;
        } catch (err) {
          return null;
        }
      }
      isProfileComplete() {
        if (typeof window !== 'undefined' && localStorage.getItem('profile_setup_done') === 'true') {
          return true;
        }
        if (!this.profile) return false;
        const phone = (this.profile.phone || this.profile.phone_number || '').trim();
        const job = (this.profile.job_title || '').trim();
        const emp = (this.profile.employment_type || '').trim();
        const bio = (this.profile.bio || '').trim();
        return Boolean(phone || job || emp || bio || this.profile.user_id || this.profile.id);
      }
      async checkProfileGuard() {
        if (!this.token) return true;
        await this.fetchProfile();
        if (!this.isProfileComplete()) {
          this.openProfileModal(true);
          toast('Lengkapi data profil kamu terlebih dahulu untuk membuka semua menu.', 'err');
          return false;
        }
        return true;
      }
      openProfileModal(force = false) {
        const modal = document.getElementById('profileModal');
        if (!modal) return;

        const p = this.profile || {};
        if (document.getElementById('prof_name')) document.getElementById('prof_name').value = this.user?.name || '';
        if (document.getElementById('prof_email')) document.getElementById('prof_email').value = this.user?.email || '';
        if (document.getElementById('prof_phone')) document.getElementById('prof_phone').value = p.phone || p.phone_number || '';
        if (document.getElementById('prof_employment')) document.getElementById('prof_employment').value = p.employment_type || 'karyawan';
        if (document.getElementById('prof_job')) document.getElementById('prof_job').value = p.job_title || '';
        if (document.getElementById('prof_company')) document.getElementById('prof_company').value = p.company_name || '';
        if (document.getElementById('prof_income')) document.getElementById('prof_income').value = p.monthly_income_estimate || '';

        const closeBtn = document.getElementById('profClose');
        const cancelBtn = document.getElementById('profCancel');
        const banner = document.getElementById('profWarningBanner');

        if (force) {
          if (closeBtn) closeBtn.style.display = 'none';
          if (cancelBtn) cancelBtn.style.display = 'none';
          if (banner) banner.classList.remove('hidden');
        } else {
          if (closeBtn) closeBtn.style.display = '';
          if (cancelBtn) cancelBtn.style.display = '';
          if (banner) banner.classList.add('hidden');
        }

        this.openModal('profileModal');
      }
      async submitProfile(e) {
        e.preventDefault();
        if (!this.token) return;

        const name = document.getElementById('prof_name')?.value.trim();
        const phone_number = document.getElementById('prof_phone')?.value.trim();
        const employment_type = document.getElementById('prof_employment')?.value;
        const job_title = document.getElementById('prof_job')?.value.trim();
        const company_name = document.getElementById('prof_company')?.value.trim();
        const monthly_income_estimate = Number(document.getElementById('prof_income')?.value || 0);

        if (!phone_number) {
          return toast('Nomor telepon / WA wajib diisi', 'err');
        }
        if (!job_title && !employment_type) {
          return toast('Status Pekerjaan / Jabatan wajib diisi', 'err');
        }

        try {
          const res = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              name,
              phone: phone_number,
              phone_number,
              employment_type,
              job_title,
              company_name,
              monthly_income_estimate,
              bio: job_title || employment_type || ''
            })
          });

          const json = await res.json();
          if (!res.ok) {
            throw new Error(json?.message || 'Gagal menyimpan profil');
          }

          this.profile = json?.data ?? json;
          if (typeof window !== 'undefined') {
            localStorage.setItem('profile_setup_done', 'true');
          }
          if (this.user) {
            this.user.name = name || this.user.name;
            await this.setUser(this.user);
          }

          this.closeModal('profileModal');
          toast('Profil berhasil disimpan & dilengkapi! 🎉');
          this.renderAll();
        } catch (err) {
          console.error(err);
          toast(err.message || 'Gagal menyimpan profil', 'err');
        }
      }
      async loadAllData() {
        const fallbackCleanup = setTimeout(() => {
          this.hideLoading();
        }, 1500);

        try {
          const el = document.getElementById('loadingOverlay');
          if (el) el.style.opacity = '1';

          await Promise.all([
            this.expenses.load({ start: this.range.start, end: this.range.end }),
            this.incomes.load({ start: this.range.start, end: this.range.end }),
            this.allocations.load({ start: this.range.start, end: this.range.end })
          ]);

          // Automatically expand date range if items exist outside current default range
          const allItems = [...this.expenses.items, ...this.incomes.items, ...this.allocations.items];
          allItems.forEach((item) => {
            if (item.date) this.ensureRangeIncludes(item.date);
          });
        } catch (e) {
          if (e && e.code === 'unauthorized') {
            await this.store.set(this.tokenKey, '');
            this.token = null;
            this.updateAuthStatus();
            this.openModal('loginModal', true);
            toast('Sesi berakhir. Silakan login kembali.', 'err');
            return;
          }
          console.error('Gagal memuat data:', e);
          toast('Gagal menyinkronkan data dengan server, memakai cache lokal', 'err');
        } finally {
          clearTimeout(fallbackCleanup);
          this.renderAll();
          this.hideLoading();
        }
      }
      async logout() {
        try {
          if (this.token) {
            await fetch(`${API_BASE}/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
              }
            }).catch(() => null);
          }
        } catch (e) {
          // ignore
        }
        await this.store.set(this.tokenKey, '');
        this.token = null;
        await this.setUser(null);
        this.expenses.items = [];
        this.incomes.items = [];
        this.allocations.items = [];
        await this.expenses.persist();
        await this.incomes.persist();
        await this.allocations.persist();

        if (typeof window !== 'undefined' && window.__onAuthChange) {
          window.__onAuthChange(false);
        }

        this.renderAll();

        toast('Berhasil keluar sesi');
      }
      async init() {
        if (this.inited) return;
        this.inited = true;
        this.bindNav();
        this.bindModals();
        this.bindRangePicker();
        this.bindAttachmentPreviews();
        this.switchView(this.initialView === 'landing' ? 'dashboard' : this.initialView);
        
        this.token = await this.store.get(this.tokenKey);
        if (this.token) {
          const rawUser = await this.store.get(this.userKey);
          if (rawUser) {
            try {
              await this.setUser(JSON.parse(rawUser));
            } catch (_) {}
          }
          try {
            const me = await this.fetchMe();
            if (me) {
              await this.setUser(me);
            }
          } catch (e) {
            console.warn('fetchMe failed on startup, using cached session:', e);
          }
        }

        this.updateAuthStatus();

        if (!this.token) {
          this.openModal('loginModal', true);
          this.hideLoading();
          this.renderAll();
          return;
        }

        await this.loadAllData();
        await this.checkProfileGuard();
      }
      hideLoading() {
        // fade out built-in loading overlay (if present)
        const el = document.getElementById('loadingOverlay');
        if (el) {
          el.style.opacity = '0';
          el.style.transition = 'opacity .25s ease';
          setTimeout(() => el.remove(), 260);
        }
      }
      switchView(view) {
        if (this.token && this.profile && !this.isProfileComplete()) {
          this.openProfileModal(true);
          toast('Lengkapi data profil kamu terlebih dahulu untuk membuka menu', 'err');
          return;
        }
        const main = document.querySelector('main');
        // Lightweight fade effect between views (no splash, just a subtle transition)
        if (main) {
          main.style.opacity = '0';
          main.style.transition = 'opacity 0.15s ease';
        }
        setTimeout(() => {
          document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
          const target = document.getElementById('view-' + view);
          if (target) target.classList.add('active');
          document.querySelectorAll('.nav-link').forEach((n) => n.classList.toggle('active', n.dataset.view === view));
          document.querySelectorAll('.nav-link-mobile').forEach((n) => {
            const on = n.dataset.view === view;
            n.classList.toggle('active', on);
            n.classList.toggle('text-teal-700', on);
            n.classList.toggle('text-inksoft', !on);
          });
          window.scrollTo({ top: 0, behavior: 'instant' });
          if (view === 'reports') this.renderReports();
          if (main) {
            main.style.opacity = '1';
          }
        }, 150);
      }
      toggleAlertDropdown() {
        const dd = document.getElementById('alertDropdown');
        if (!dd) return;
        const isHidden = dd.classList.contains('hidden');
        if (isHidden) {
          this.renderAlertDropdown();
          dd.classList.remove('hidden');
        } else {
          dd.classList.add('hidden');
        }
      }
      openAlertDropdown() {
        const dd = document.getElementById('alertDropdown');
        if (!dd) return;
        this.renderAlertDropdown();
        dd.classList.remove('hidden');
      }
      renderAlertDropdown() {
        const unpaid = this.expenses.items
          .filter((x) => x.status === 'unpaid' && !x.isEstimate)
          .sort((a, b) => a.date.localeCompare(b.date));
        const countEl = document.getElementById('alertDropdownCount');
        const alertDot = document.getElementById('alertDot');
        if (countEl) countEl.textContent = unpaid.length;
        if (alertDot) {
          alertDot.textContent = unpaid.length;
          if (unpaid.length > 0) {
            alertDot.classList.remove('hidden');
            alertDot.classList.add('flex');
          } else {
            alertDot.classList.add('hidden');
            alertDot.classList.remove('flex');
          }
        }
        const listEl = document.getElementById('alertDropdownList');
        if (!listEl) return;
        if (!unpaid.length) {
          listEl.innerHTML = `<div class="flex flex-col items-center gap-2 py-6 px-4 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4FA88E" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p class="text-sm font-semibold text-teal-700">Semua tagihan lunas!</p>
            <p class="text-[12px] text-inksoft">Tidak ada tagihan yang tertunda. Mantap! 🎉</p>
          </div>`;
          return;
        }
        listEl.innerHTML = `
          <div class="border-b border-slate-800 px-4 py-3 bg-slate-900">
            <p class="text-sm font-bold text-white">Notifikasi Semua Tagihan (${unpaid.length})</p>
            <p class="text-[12px] text-slate-400">Klik tombol ✓ Lunas untuk menyelesaikan tagihan langsung dari sini.</p>
          </div>
          <div class="space-y-2 p-2.5">
            ${unpaid.map((x) => {
              const days = U.daysBetween(x.date, U.todayStr());
              const overdue = days > 0;
              const dueBadge = overdue
                ? `<span class="inline-flex items-center gap-1 text-[10.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full px-2 py-0.5"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Terlambat ${days}h</span>`
                : `<span class="inline-flex items-center gap-1 text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${U.fmtDateShort(x.date)}</span>`;
              return `<div class="flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-xl border border-slate-800 bg-slate-950/80 shadow-md hover:border-teal-500/40 transition">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${overdue ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-amber-500/20 border border-amber-500/30'}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${overdue ? '#FB7185' : '#FBBF24'}" strokeWidth="2"><path d="M3 10h18M7 15h4"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-white truncate">${x.subcategory}</p>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-400">
                    ${dueBadge}
                    <span>${EXPENSE_CATS[x.category]?.label ?? x.category}</span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1 shrink-0">
                  <span class="font-mono text-xs font-bold text-rose-400">${U.fmtIDR(x.amount)}</span>
                  <button data-mark-paid="${x.id}" class="rounded-lg border border-teal-500/30 bg-teal-500/20 px-2.5 py-1 text-[11px] font-bold text-teal-300 hover:bg-teal-500/30 transition">✓ Lunas</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        `;
        // Bind mark-as-paid buttons
        listEl.querySelectorAll('[data-mark-paid]').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.markPaid(btn.dataset.markPaid);
            this.renderAlertDropdown();
          });
        });
      }
      async markPaid(id) {
        const item = this.expenses.items.find((x) => x.id === id);
        if (!item) return;
        // Optimistic update
        item.status = 'paid';
        await this.expenses.persist();
        // Sync to backend
        try {
          if (this.token) {
            const payload = { ...item, status: 'paid' };
            await fetch(`${API_BASE}/expenses/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/json'
              },
              body: JSON.stringify(payload)
            });
          }
        } catch(e) {
          console.warn('Sync markPaid failed:', e);
        }
        toast(`${item.subcategory} ditandai lunas ✓`);
        this.renderAll();
        // Re-render the dropdown to reflect updated state
        this.renderAlertDropdown();
      }
      bindNav() {
        const go = async (view) => {
          if (this.token) {
            await this.loadAllData();
          }
          this.switchView(view);
        };
        document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', async (e) => {
          if (e) e.preventDefault();
          const targetView = btn.dataset.view;
          if (targetView) {
            try {
              window.history.pushState({}, '', `/${targetView}`);
            } catch (_) {}
            await go(targetView);
          }
        }));
        document.getElementById('alertBell')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleAlertDropdown();
        });
        document.getElementById('alertBanner')?.addEventListener('click', () => this.openAlertDropdown());
        document.addEventListener('click', (e) => {
          const dd = document.getElementById('alertDropdown');
          const bell = document.getElementById('alertBell');
          if (dd && !dd.classList.contains('hidden') && !dd.contains(e.target) && bell && !bell.contains(e.target)) {
            dd.classList.add('hidden');
          }
        });
        document.querySelectorAll('#expenseCatTabs [data-cat]').forEach((btn) => btn.addEventListener('click', () => {
          this.expenseFilter = btn.dataset.cat;
          document.querySelectorAll('#expenseCatTabs [data-cat]').forEach((b) => b.classList.toggle('active', b === btn));
          this.renderExpenseList();
        }));
        document.querySelectorAll('#incomeCatTabs [data-cat]').forEach((btn) => btn.addEventListener('click', () => {
          this.incomeFilter = btn.dataset.cat;
          document.querySelectorAll('#incomeCatTabs [data-cat]').forEach((b) => b.classList.toggle('active', b === btn));
          this.renderIncomeList();
        }));

        document.getElementById('expenseSearch')?.addEventListener('input', () => this.renderExpenseList());
        document.getElementById('incomeSearch')?.addEventListener('input', () => this.renderIncomeList());
        document.getElementById('allocationSearch')?.addEventListener('input', () => this.renderAllocations());

        document.querySelectorAll('#dashGroupTabs [data-dash-group]').forEach((btn) => btn.addEventListener('click', () => {
          this.dashGroup = btn.dataset.dashGroup;
          document.querySelectorAll('#dashGroupTabs [data-dash-group]').forEach((b) => {
            const isAct = b === btn;
            b.classList.toggle('active', isAct);
            b.classList.toggle('bg-rose-500/20', isAct && b.dataset.dashGroup === 'expense');
            b.classList.toggle('border-rose-500/40', isAct && b.dataset.dashGroup === 'expense');
            b.classList.toggle('text-rose-300', isAct && b.dataset.dashGroup === 'expense');

            b.classList.toggle('bg-emerald-500/20', isAct && b.dataset.dashGroup === 'income');
            b.classList.toggle('border-emerald-500/40', isAct && b.dataset.dashGroup === 'income');
            b.classList.toggle('text-emerald-300', isAct && b.dataset.dashGroup === 'income');

            b.classList.toggle('bg-amber-500/20', isAct && b.dataset.dashGroup === 'allocation');
            b.classList.toggle('border-amber-500/40', isAct && b.dataset.dashGroup === 'allocation');
            b.classList.toggle('text-amber-300', isAct && b.dataset.dashGroup === 'allocation');

            b.classList.toggle('text-slate-400', !isAct);
          });
          this.renderCascadeGroup(this.dashGroup);
          this.renderTrendGroup(this.dashGroup);
          this.renderDonutGroup(this.dashGroup);
        }));

        document.getElementById('expensePerPage')?.addEventListener('change', () => this.renderExpenseList());
        document.getElementById('incomePerPage')?.addEventListener('change', () => this.renderIncomeList());
        document.getElementById('allocationPerPage')?.addEventListener('change', () => this.renderAllocations());
      }
      bindRangePicker() {
        const updateLabel = () => {
          const labelEl = document.getElementById('rangeLabel');
          if (labelEl) labelEl.textContent = U.fmtRangeLabel(this.range.start, this.range.end);
        };
        updateLabel();
        const input = document.getElementById('rangeInput');
        const rangeBtn = document.getElementById('rangeBtn');
        if (!input) return;
        this.fp = flatpickr(input, {
          mode: 'range',
          dateFormat: 'Y-m-d',
          defaultDate: [this.range.start, this.range.end],
          positionElement: rangeBtn || undefined,
          disableMobile: true,
          locale: { rangeSeparator: ' s/d ' },
          onClose: (selectedDates) => {
            if (selectedDates.length === 2) {
              this.range.start = U.iso(selectedDates[0]);
              this.range.end = U.iso(selectedDates[1]);
              updateLabel();
              this.loadAllData();
            }
          },
        });
        rangeBtn?.addEventListener('click', () => this.fp.open());
      }
      bindModals() {
        // Rupiah input masking
        U.attachRupiahInputMask(document.getElementById('exp_amount'));
        U.attachRupiahInputMask(document.getElementById('inc_amount'));
        U.attachRupiahInputMask(document.getElementById('alc_amount'));
        U.attachRupiahInputMask(document.getElementById('alc_target'));

        // auth bindings
        document.getElementById('authBtn')?.addEventListener('click', async () => {
          if (this.token) {
            if (confirm('Apakah Anda yakin ingin keluar dari sesi?')) {
              await this.logout();
            }
          } else {
            this.openModal('loginModal');
          }
        });
        document.getElementById('loginCancel')?.addEventListener('click', () => this.closeModal('loginModal'));
        document.getElementById('loginClose')?.addEventListener('click', () => this.closeModal('loginModal'));
        document.getElementById('registerLink')?.addEventListener('click', () => {
          this.closeModal('loginModal');
          this.openModal('registerModal');
        });
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.loginSubmit(e));
        document.getElementById('registerCancel')?.addEventListener('click', () => this.closeModal('registerModal'));
        document.getElementById('registerClose')?.addEventListener('click', () => this.closeModal('registerModal'));
        document.getElementById('registerSwitchLogin')?.addEventListener('click', () => {
          this.closeModal('registerModal');
          this.openModal('loginModal');
        });
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.registerSubmit(e));

        document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const targetId = btn.dataset.togglePassword;
            const input = document.getElementById(targetId);
            if (input) {
              const isPwd = input.type === 'password';
              input.type = isPwd ? 'text' : 'password';
              btn.innerHTML = isPwd
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            }
          });
        });

        const userTileEl = document.getElementById('userTile');
        const userDropdownEl = document.getElementById('userDropdown');
        if (userTileEl && userDropdownEl) {
          userTileEl.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownEl.classList.toggle('hidden');
          });
          document.addEventListener('click', (e) => {
            if (!userDropdownEl.contains(e.target) && !userTileEl.contains(e.target)) {
              userDropdownEl.classList.add('hidden');
            }
          });
        }
        document.getElementById('userDropdownProfileBtn')?.addEventListener('click', () => {
          document.getElementById('userDropdown')?.classList.add('hidden');
          this.openProfileModal(false);
        });
        document.getElementById('userDropdownLogoutBtn')?.addEventListener('click', async () => {
          document.getElementById('userDropdown')?.classList.add('hidden');
          if (confirm('Apakah Anda yakin ingin keluar dari sesi?')) {
            await this.logout();
          }
        });
        document.getElementById('profClose')?.addEventListener('click', () => {
          if (this.token && !this.isProfileComplete()) {
            return toast('Lengkapi profil terlebih dahulu!', 'err');
          }
          this.closeModal('profileModal');
        });
        document.getElementById('profCancel')?.addEventListener('click', () => {
          if (this.token && !this.isProfileComplete()) {
            return toast('Lengkapi profil terlebih dahulu!', 'err');
          }
          this.closeModal('profileModal');
        });
        document.getElementById('profileForm')?.addEventListener('submit', (e) => this.submitProfile(e));

        document.getElementById('quickAddBtn')?.addEventListener('click', () => {
          if (this.token && !this.isProfileComplete()) {
            this.openProfileModal(true);
            return toast('Lengkapi profil kamu terlebih dahulu', 'err');
          }
          this.openModal('quickAddModal');
        });
        document.getElementById('quickAddCancel')?.addEventListener('click', () => this.closeModal('quickAddModal'));
        document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
          this.closeModal('quickAddModal');
          this.openEntryForm(btn.dataset.add);
        }));
        document.querySelectorAll('.modal-close').forEach((btn) => btn.addEventListener('click', (e) => {
          const parent = e.target.closest('.modal-backdrop');
          if (parent) {
            if (parent.id === 'profileModal' && this.token && !this.isProfileComplete()) {
              return toast('Lengkapi profil terlebih dahulu!', 'err');
            }
            this.closeModal(parent.id);
          }
        }));
        document.querySelectorAll('.modal-backdrop').forEach((m) => m.addEventListener('click', (e) => {
          if (e.target === m) {
            if (m.id === 'profileModal' && this.token && !this.isProfileComplete()) {
              return toast('Lengkapi profil terlebih dahulu!', 'err');
            }
            this.closeModal(m.id);
          }
        }));
        const expCat = document.getElementById('exp_category');
        expCat?.addEventListener('change', () => this.refreshExpenseFormFields());
        document.getElementById('expenseForm')?.addEventListener('submit', (e) => this.submitExpense(e));
        document.getElementById('incomeForm')?.addEventListener('submit', (e) => this.submitIncome(e));
        document.getElementById('allocationForm')?.addEventListener('submit', (e) => this.submitAllocation(e));
        document.getElementById('exp_delete')?.addEventListener('click', () => this.confirm(async () => {
          await this.expenses.remove(document.getElementById('exp_id').value);
          this.closeModal('expenseModal');
          await this.loadAllData();
          toast('Pengeluaran dihapus');
        }));
        document.getElementById('inc_delete')?.addEventListener('click', () => this.confirm(async () => {
          await this.incomes.remove(document.getElementById('inc_id').value);
          this.closeModal('incomeModal');
          await this.loadAllData();
          toast('Pemasukan dihapus');
        }));
        document.getElementById('alc_delete')?.addEventListener('click', () => this.confirm(async () => {
          await this.allocations.remove(document.getElementById('alc_id').value);
          this.closeModal('allocationModal');
          await this.loadAllData();
          toast('Alokasi dihapus');
        }));
        document.getElementById('confirmCancel')?.addEventListener('click', () => this.closeModal('confirmModal'));
        document.getElementById('confirmOk')?.addEventListener('click', async () => {
          if (this.confirmCb) await this.confirmCb();
          this.closeModal('confirmModal');
        });
        document.getElementById('exportPdfBtn')?.addEventListener('click', () => this.exportPdf());
      }
      async loginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('login_email')?.value;
        const password = document.getElementById('login_password')?.value;
        if (!email || !password) return toast('Email dan password wajib', 'err');

        try {
          const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const json = await res.json();
          if (!res.ok) {
            throw new Error(json?.message || json?.error || 'Login gagal');
          }

          const token = json?.token;
          if (!token) throw new Error('Token tidak diterima');

          await this.store.set(this.tokenKey, token);
          this.token = token;
          await this.setUser(json.user);
          if (typeof window !== 'undefined' && window.__onAuthChange) {
            window.__onAuthChange(true);
          }
          toast('Login berhasil');
          this.closeModal('loginModal');

          // reload backend data
          await this.loadAllData();
          await this.checkProfileGuard();
        } catch (err) {
          console.error(err);
          toast(err.message || 'Login gagal', 'err');
        }
      }

      async registerSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('register_name')?.value;
        const email = document.getElementById('register_email')?.value;
        const password = document.getElementById('register_password')?.value;
        const confirmPassword = document.getElementById('register_password_confirmation')?.value;

        if (!name || !email || !password || !confirmPassword) return toast('Semua field wajib diisi', 'err');
        if (password !== confirmPassword) return toast('Password dan konfirmasi harus sama', 'err');

        try {
          const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name, email, password, password_confirmation: confirmPassword }),
          });

          const json = await res.json();
          if (!res.ok) {
            const message = json?.message || (json?.errors ? Object.values(json.errors).flat().join(' ') : 'Registrasi gagal');
            throw new Error(message);
          }

          const token = json?.token;
          if (!token) throw new Error('Token tidak diterima');

          await this.store.set(this.tokenKey, token);
          this.token = token;
          await this.setUser(json.user);
          if (typeof window !== 'undefined' && window.__onAuthChange) {
            window.__onAuthChange(true);
          }
          toast('Registrasi berhasil');
          this.closeModal('registerModal');

          await this.loadAllData();
          await this.checkProfileGuard();
        } catch (err) {
          console.error(err);
          toast(err.message || 'Registrasi gagal', 'err');
        }
      }

      async fetchMe() {
        if (!this.token) return null;
        try {
          const res = await fetch(`${API_BASE}/me`, {
            headers: { 'Authorization': `Bearer ${this.token}`, Accept: 'application/json' },
          });
          if (!res.ok) {
            if (res.status === 401) {
              await this.store.set(this.tokenKey, '');
              this.token = null;
              await this.setUser(null);
            }
            return null;
          }
          return await res.json();
        } catch (err) {
          return null;
        }
      }
      openModal(id, forceFullscreen = false) {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('active');
          if (id === 'loginModal' && forceFullscreen) {
            el.classList.add('login-fullscreen');
            const closeBtn = document.getElementById('loginClose');
            const cancelBtn = document.getElementById('loginCancel');
            if (closeBtn) closeBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
          }
        }
      }
      closeModal(id) {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove('active');
          if (id === 'loginModal') {
            el.classList.remove('login-fullscreen');
            const closeBtn = document.getElementById('loginClose');
            const cancelBtn = document.getElementById('loginCancel');
            if (closeBtn) closeBtn.style.display = '';
            if (cancelBtn) cancelBtn.style.display = '';
          }
        }
      }
      setAttachmentPreview(containerId, url) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!url) {
          el.innerHTML = '';
          return;
        }
        const filename = url.split('/').pop().split('?')[0];
        el.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="font-semibold text-teal-700 underline">Lihat bukti: ${filename}</a>`;
      }
      openAttachmentPreview(url) {
        const modal = document.getElementById('attachmentModal');
        const img = document.getElementById('attachPreviewImg');
        const pdf = document.getElementById('attachPreviewPdf');
        const openTab = document.getElementById('attachOpenTab');
        if (!modal || !url) return;

        let fullUrl = url;
        if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
          const cleanPath = fullUrl.replace(/^\/+/, '');
          fullUrl = cleanPath.startsWith('storage/') ? `${API_BASE}/${cleanPath}` : `${API_BASE}/storage/${cleanPath}`;
        }

        if (openTab) {
          openTab.href = fullUrl;
        }

        const ext = fullUrl.split('.').pop().split('?')[0].toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
          if (img) {
            img.src = fullUrl;
            img.style.display = 'block';
          }
          if (pdf) {
            pdf.style.display = 'none';
            pdf.src = '';
          }
        } else if (ext === 'pdf') {
          if (pdf) {
            pdf.src = fullUrl;
            pdf.style.display = 'block';
          }
          if (img) {
            img.style.display = 'none';
            img.src = '';
          }
        } else {
          window.open(fullUrl, '_blank');
          return;
        }
        modal.classList.add('active');
      }

      closeAttachmentPreview() {
        const modal = document.getElementById('attachmentModal');
        if (modal) modal.classList.remove('active');
        const img = document.getElementById('attachPreviewImg');
        const pdf = document.getElementById('attachPreviewPdf');
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (pdf) { pdf.src = ''; pdf.style.display = 'none'; }
      }
      confirm(cb) {
        this.confirmCb = cb;
        this.openModal('confirmModal');
      }
      refreshExpenseFormFields() {
        const cat = document.getElementById('exp_category')?.value || 'dinamis';
        const def = EXPENSE_CATS[cat];
        const freqSel = document.getElementById('exp_freq');
        if (freqSel && def?.freq) {
          freqSel.innerHTML = def.freq.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
        }
        const subList = document.getElementById('exp_sub_list');
        if (subList && def?.subs) {
          subList.innerHTML = def.subs.map((s) => `<option value="${s}">`).join('');
        }
        const statusWrap = document.getElementById('exp_status_wrap');
        if (statusWrap) statusWrap.classList.toggle('hidden', cat === 'dinamis');

        const help = document.getElementById('exp_cat_help');
        if (help && def) {
          help.innerHTML = `
            <div class="space-y-1">
              <p class="font-bold text-white text-[12px] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${def.color}"></span>
                ${def.label}
              </p>
              <p class="text-[11px] text-slate-300">${def.description}</p>
              <p class="text-[10.5px] text-slate-400"><strong>Contoh:</strong> ${def.examples}</p>
              <p class="text-[10.5px] text-teal-300 font-medium">${def.tips}</p>
            </div>`;
        }
      }
      openEntryForm(type, existingId) {
        if (type === 'expense') {
          const form = document.getElementById('expenseForm');
          form?.reset();
          document.getElementById('exp_id').value = '';
          const expDelBtn = document.getElementById('exp_delete');
          if (expDelBtn) { expDelBtn.classList.add('hidden'); expDelBtn.style.display = ''; }
          document.getElementById('exp_date').value = U.todayStr();
          this.showExistingAttachment('expAttachPreview', null);
          this.refreshExpenseFormFields();
          if (existingId) {
            const it = this.expenses.find(existingId);
            if (it) {
              document.getElementById('exp_id').value = it.id;
              document.getElementById('exp_category').value = it.category;
              this.refreshExpenseFormFields();
              document.getElementById('exp_sub').value = it.subcategory;
              document.getElementById('exp_freq').value = it.freq;
              document.getElementById('exp_amount').value = U.formatNumberID(it.amount);
              document.getElementById('exp_date').value = it.date;
              document.getElementById('exp_status').value = it.status;
              document.getElementById('exp_estimate').checked = !!it.isEstimate;
              document.getElementById('exp_note').value = it.note || '';
              this.showExistingAttachment('expAttachPreview', it.attachmentUrl);
              const delBtn = document.getElementById('exp_delete');
              if (delBtn) {
                delBtn.classList.remove('hidden');
                delBtn.style.display = 'flex';
              }
            }
          }
          this.openModal('expenseModal');
        } else if (type === 'income') {
          const form = document.getElementById('incomeForm');
          form?.reset();
          document.getElementById('inc_id').value = '';
          document.getElementById('inc_delete')?.classList.add('hidden');
          document.getElementById('inc_date').value = U.todayStr();
          this.showExistingAttachment('incAttachPreview', null);
          const updateIncHelp = () => {
            const catKey = document.getElementById('inc_category')?.value || 'earned';
            const def = INCOME_CATS[catKey];
            if (def) {
              const subEl = document.getElementById('inc_sub_list');
              if (subEl) subEl.innerHTML = def.subs.map((s) => `<option value="${s}">`).join('');
              const help = document.getElementById('inc_cat_help');
              if (help) {
                help.innerHTML = `
                  <div class="space-y-1">
                    <p class="font-bold text-white text-[12px] flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full shrink-0" style="background:${def.color}"></span>
                      ${def.label}
                    </p>
                    <p class="text-[11px] text-slate-300">${def.description}</p>
                    <p class="text-[10.5px] text-slate-400"><strong>Contoh:</strong> ${def.examples}</p>
                    <p class="text-[10.5px] text-teal-300 font-medium">${def.tips}</p>
                  </div>`;
              }
            }
          };
          const incCatSelect = document.getElementById('inc_category');
          if (incCatSelect) incCatSelect.onchange = updateIncHelp;
          updateIncHelp();

          if (existingId) {
            const it = this.incomes.find(existingId);
            if (it) {
              document.getElementById('inc_id').value = it.id;
              document.getElementById('inc_category').value = it.category;
              updateIncHelp();
              document.getElementById('inc_sub').value = it.subcategory;
              document.getElementById('inc_amount').value = U.formatNumberID(it.amount);
              document.getElementById('inc_date').value = it.date;
              document.getElementById('inc_note').value = it.note || '';
              this.showExistingAttachment('incAttachPreview', it.attachmentUrl);
              const incDelBtn = document.getElementById('inc_delete');
              if (incDelBtn) { incDelBtn.classList.remove('hidden'); incDelBtn.style.display = 'flex'; }
            }
          }
          this.openModal('incomeModal');
        } else if (type === 'allocation') {
          const form = document.getElementById('allocationForm');
          form?.reset();
          document.getElementById('alc_id').value = '';
          document.getElementById('alc_delete')?.classList.add('hidden');
          document.getElementById('alc_date').value = U.todayStr();
          if (document.getElementById('alc_target')) document.getElementById('alc_target').value = '';
          this.showExistingAttachment('alcAttachPreview', null);
          const updateAlcHelp = () => {
            const catKey = document.getElementById('alc_category')?.value || 'darurat';
            const def = ALLOCATION_CATS[catKey];
            if (def) {
              const subEl = document.getElementById('alc_sub_list');
              if (subEl) subEl.innerHTML = def.subs.map((s) => `<option value="${s}">`).join('');
              const help = document.getElementById('alc_cat_help');
              if (help) {
                help.innerHTML = `
                  <div class="space-y-1">
                    <p class="font-bold text-white text-[12px] flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full shrink-0" style="background:${def.color}"></span>
                      ${def.label}
                    </p>
                    <p class="text-[11px] text-slate-300">${def.description}</p>
                    <p class="text-[10.5px] text-slate-400"><strong>Contoh:</strong> ${def.examples}</p>
                    <p class="text-[10.5px] text-amber-300 font-medium">${def.tips}</p>
                  </div>`;
              }
            }
          };
          const alcCatSelect = document.getElementById('alc_category');
          if (alcCatSelect) alcCatSelect.onchange = updateAlcHelp;
          updateAlcHelp();
          if (existingId) {
            const it = this.allocations.find(existingId);
            if (it) {
              document.getElementById('alc_id').value = it.id;
              document.getElementById('alc_category').value = it.category;
              document.getElementById('alc_category').onchange();
              document.getElementById('alc_sub').value = it.subcategory;
              document.getElementById('alc_amount').value = U.formatNumberID(it.amount);
              if (document.getElementById('alc_target')) document.getElementById('alc_target').value = U.formatNumberID(it.targetAmount || '');
              document.getElementById('alc_date').value = it.date;
              document.getElementById('alc_note').value = it.note || '';
              this.showExistingAttachment('alcAttachPreview', it.attachmentUrl);
              const alcDelBtn = document.getElementById('alc_delete');
              if (alcDelBtn) { alcDelBtn.classList.remove('hidden'); alcDelBtn.style.display = 'flex'; }
            }
          } else {
            this.showExistingAttachment('alcAttachPreview', null);
          }
          this.openModal('allocationModal');
        }
      }
      async submitExpense(e) {
        e.preventDefault();
        const cat = document.getElementById('exp_category').value;
        const id = document.getElementById('exp_id').value || U.uid();
        const data = {
          id,
          category: cat,
          subcategory: document.getElementById('exp_sub').value || EXPENSE_CATS[cat].subs[EXPENSE_CATS[cat].subs.length - 1],
          freq: document.getElementById('exp_freq').value,
          amount: U.parseNumberID(document.getElementById('exp_amount').value || 0),
          date: document.getElementById('exp_date').value,
          status: cat === 'dinamis' ? 'paid' : document.getElementById('exp_status').value,
          isEstimate: document.getElementById('exp_estimate').checked,
          note: document.getElementById('exp_note').value,
          createdAt: Date.now(),
        };

        const fileInput = document.getElementById('exp_attachment');
        const file = fileInput?.files && fileInput.files[0] ? fileInput.files[0] : null;

        if (file) {
          // build FormData and send directly so file is uploaded
          const fd = new FormData();
          fd.append('category', data.category);
          fd.append('subcategory', data.subcategory);
          fd.append('frequency', data.freq);
          fd.append('amount', String(data.amount));
          fd.append('date', data.date);
          fd.append('status', data.status);
          fd.append('is_estimate', data.isEstimate ? '1' : '0');
          fd.append('note', data.note || '');
          fd.append('attachment', file);

          try {
            if (this.expenses.find(id)) {
              // Laravel expects PUT for update; use method override
              fd.append('_method', 'PUT');
              const resp = await this.expenses.apiRequest('POST', `${this.expenses.endpoint}/${id}`, fd);
              const returned = resp?.data ?? resp;
              const converted = this.expenses.fromBackend(returned);
              const idx = this.expenses.items.findIndex((x) => x.id === id);
              if (idx !== -1) this.expenses.items[idx] = converted; else this.expenses.items.push(converted);
              await this.expenses.persist();
            } else {
              const resp = await this.expenses.apiRequest('POST', this.expenses.endpoint, fd);
              const returned = resp?.data ?? resp;
              const created = this.expenses.fromBackend(returned);
              this.expenses.items.push(created);
              await this.expenses.persist();
            }
          } catch (err) {
            console.warn('Upload failed, falling back to local save', err);
            if (this.expenses.find(id)) await this.expenses.update(id, data); else await this.expenses.add(data);
          }
        } else {
          if (this.expenses.find(id)) await this.expenses.update(id, data); else await this.expenses.add(data);
        }
        this.closeModal('expenseModal');
        this.ensureRangeIncludes(data.date);
        await this.loadAllData();
        toast('Pengeluaran tersimpan');
      }
      async submitIncome(e) {
        e.preventDefault();
        const cat = document.getElementById('inc_category').value;
        const id = document.getElementById('inc_id').value || U.uid();
        const data = {
          id,
          category: cat,
          subcategory: document.getElementById('inc_sub').value || INCOME_CATS[cat].subs[INCOME_CATS[cat].subs.length - 1],
          amount: U.parseNumberID(document.getElementById('inc_amount').value || 0),
          date: document.getElementById('inc_date').value,
          note: document.getElementById('inc_note').value,
          createdAt: Date.now(),
        };

        const fileInput = document.getElementById('inc_attachment');
        const file = fileInput?.files && fileInput.files[0] ? fileInput.files[0] : null;

        if (file) {
          const fd = new FormData();
          fd.append('category', data.category);
          fd.append('subcategory', data.subcategory);
          fd.append('amount', String(data.amount));
          fd.append('date', data.date);
          fd.append('note', data.note || '');
          fd.append('attachment', file);

          try {
            if (this.incomes.find(id)) {
              fd.append('_method', 'PUT');
              const resp = await this.incomes.apiRequest('POST', `${this.incomes.endpoint}/${id}`, fd);
              const returned = resp?.data ?? resp;
              const converted = this.incomes.fromBackend(returned);
              const idx = this.incomes.items.findIndex((x) => x.id === id);
              if (idx !== -1) this.incomes.items[idx] = converted; else this.incomes.items.push(converted);
              await this.incomes.persist();
            } else {
              const resp = await this.incomes.apiRequest('POST', this.incomes.endpoint, fd);
              const returned = resp?.data ?? resp;
              const created = this.incomes.fromBackend(returned);
              this.incomes.items.push(created);
              await this.incomes.persist();
            }
          } catch (err) {
            console.warn('Upload failed, falling back to local save', err);
            if (this.incomes.find(id)) await this.incomes.update(id, data); else await this.incomes.add(data);
          }
        } else {
          if (this.incomes.find(id)) await this.incomes.update(id, data); else await this.incomes.add(data);
        }
        this.closeModal('incomeModal');
        this.ensureRangeIncludes(data.date);
        await this.loadAllData();
        toast('Pemasukan tersimpan');
      }
      async submitAllocation(e) {
        e.preventDefault();
        const cat = document.getElementById('alc_category').value;
        const id = document.getElementById('alc_id').value || U.uid();
        const data = {
          id,
          category: cat,
          subcategory: document.getElementById('alc_sub').value || ALLOCATION_CATS[cat].subs[ALLOCATION_CATS[cat].subs.length - 1],
          amount: U.parseNumberID(document.getElementById('alc_amount').value || 0),
          targetAmount: U.parseNumberID(document.getElementById('alc_target')?.value || 0),
          date: document.getElementById('alc_date').value,
          note: document.getElementById('alc_note').value,
          createdAt: Date.now(),
        };

        const fileInput = document.getElementById('alc_attachment');
        const file = fileInput?.files && fileInput.files[0] ? fileInput.files[0] : null;

        if (file) {
          const fd = new FormData();
          fd.append('category', data.category);
          fd.append('subcategory', data.subcategory);
          fd.append('amount', String(data.amount));
          fd.append('target_amount', String(data.targetAmount));
          fd.append('date', data.date);
          fd.append('note', data.note || '');
          fd.append('attachment', file);

          try {
            if (this.allocations.find(id)) {
              fd.append('_method', 'PUT');
              const resp = await this.allocations.apiRequest('POST', `${this.allocations.endpoint}/${id}`, fd);
              const returned = resp?.data ?? resp;
              const converted = this.allocations.fromBackend(returned);
              const idx = this.allocations.items.findIndex((x) => x.id === id);
              if (idx !== -1) this.allocations.items[idx] = converted; else this.allocations.items.push(converted);
              await this.allocations.persist();
            } else {
              const resp = await this.allocations.apiRequest('POST', this.allocations.endpoint, fd);
              const returned = resp?.data ?? resp;
              const created = this.allocations.fromBackend(returned);
              this.allocations.items.push(created);
              await this.allocations.persist();
            }
          } catch (err) {
            console.warn('Upload failed, falling back to local save', err);
            if (this.allocations.find(id)) await this.allocations.update(id, data); else await this.allocations.add(data);
          }
        } else {
          if (this.allocations.find(id)) await this.allocations.update(id, data); else await this.allocations.add(data);
        }

        this.closeModal('allocationModal');
        this.ensureRangeIncludes(data.date);
        await this.loadAllData();
        toast('Alokasi tersimpan');
      }
      async markPaid(id) {
        await this.expenses.update(id, { status: 'paid' });
        await this.loadAllData();
        toast('Ditandai lunas');
      }
      toggleAlertDropdown() {
        const dd = document.getElementById('alertDropdown');
        if (dd) dd.classList.toggle('hidden');
      }
      openAlertDropdown() {
        document.getElementById('alertDropdown')?.classList.remove('hidden');
      }
      ensureRangeIncludes(dateStr) {
        let changed = false;
        if (dateStr < this.range.start) {
          this.range.start = dateStr;
          changed = true;
        }
        if (dateStr > this.range.end) {
          this.range.end = dateStr;
          changed = true;
        }
        if (changed) {
          this.fp.setDate([this.range.start, this.range.end], false);
          const labelEl = document.getElementById('rangeLabel');
          if (labelEl) labelEl.textContent = U.fmtRangeLabel(this.range.start, this.range.end);
        }
        return changed;
      }
      renderAll() {
        try {
          this.renderDashboard();
          this.renderExpenseList();
          this.renderIncomeList();
          this.renderAllocations();
          this.renderAlertDropdown();
          if (document.getElementById('view-reports')?.classList.contains('active')) this.renderReports();
        } catch (e) {
          console.error('Error rendering dashboard components:', e);
        }
      }
      currentExpenses() {
        return this.expenses.inRange(this.range.start, this.range.end).filter((x) => !x.isEstimate);
      }
      currentIncomes() {
        return this.incomes.inRange(this.range.start, this.range.end);
      }
      currentAllocations() {
        return this.allocations.inRange(this.range.start, this.range.end);
      }
      renderDashboard() {
        const exp = this.currentExpenses();
        const inc = this.currentIncomes();
        const alc = this.currentAllocations();
        const totalInc = Aggregator.total(inc);
        const totalExp = Aggregator.total(exp);
        const totalAlc = Aggregator.total(alc);
        const balance = totalInc - totalExp - totalAlc;
        const dashLabel = document.getElementById('dashPeriodLabel');
        if (dashLabel) dashLabel.textContent = `Periode: ${U.fmtDateID(this.range.start)} – ${U.fmtDateID(this.range.end)}`;
        const sInc = document.getElementById('sumIncome');
        if (sInc) sInc.textContent = U.fmtIDR(totalInc);
        const sExp = document.getElementById('sumExpense');
        if (sExp) sExp.textContent = U.fmtIDR(totalExp);
        const sAlc = document.getElementById('sumAllocation');
        if (sAlc) sAlc.textContent = U.fmtIDR(totalAlc);
        const sBal = document.getElementById('sumBalance');
        if (sBal) sBal.textContent = U.fmtIDR(balance);
        const card = document.getElementById('sumBalanceCard');
        const badge = document.getElementById('balanceBadge');
        if (card && badge) {
          if (balance < 0) {
            card.className = 'bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 backdrop-blur-md rounded-2xl border border-rose-500/50 p-5.5 md:p-6 shadow-xl hover:border-rose-500/70 transition flex items-center justify-between min-h-[125px] md:min-h-[140px]';
            badge.textContent = 'DEFISIT';
            badge.className = 'text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full px-2.5 py-0.5 inline-flex items-center shrink-0';
          } else {
            card.className = 'bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-900 backdrop-blur-md rounded-2xl border border-teal-500/50 p-5.5 md:p-6 shadow-xl hover:border-teal-500/70 transition flex items-center justify-between min-h-[125px] md:min-h-[140px]';
            badge.textContent = 'SURPLUS';
            badge.className = 'text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full px-2.5 py-0.5 inline-flex items-center shrink-0';
          }
        }
        const unpaid = this.expenses.items.filter((x) => (x.category === 'tetap' || x.category === 'berkala') && x.status === 'unpaid' && !x.isEstimate).sort((a, b) => a.date.localeCompare(b.date));
        const bell = document.getElementById('alertDot');
        const banner = document.getElementById('alertBanner');
        if (unpaid.length) {
          if (bell) {
            bell.textContent = String(unpaid.length);
            bell.classList.remove('hidden');
            bell.classList.add('flex');
          }
          banner?.classList.remove('hidden');
          document.getElementById('alertBannerText').textContent = `${unpaid.length} tagihan belum dibayar — total ${U.fmtIDR(Aggregator.total(unpaid))}`;
        } else {
          bell?.classList.add('hidden');
          banner?.classList.add('hidden');
        }
        const listEl = document.getElementById('unpaidList');
        if (listEl) {
          if (!unpaid.length) {
            listEl.innerHTML = `<div class="flex items-center gap-2.5 py-4 px-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p class="text-sm font-semibold text-teal-300">Semua tagihan sudah lunas! 🎉</p>
            </div>`;
          } else {
            listEl.innerHTML = unpaid.map((x) => {
              const days = U.daysBetween(x.date, U.todayStr());
              const overdue = days > 0;
              return `<div class="flex items-center justify-between gap-3 p-3.5 rounded-xl border ${overdue ? 'border-rose-500/40 bg-rose-500/10' : 'border-slate-800 bg-slate-900/90'} transition shadow-md">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${overdue ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-amber-500/20 border border-amber-500/30'}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${overdue ? '#FB7185' : '#FBBF24'}" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-bold truncate text-white">${x.subcategory}</p>
                    <p class="text-[11.5px] ${overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'}">${overdue ? `⚠ Terlambat ${days} hari` : `Jatuh tempo ${U.fmtDateID(x.date)}`} · ${EXPENSE_CATS[x.category]?.label ?? x.category}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                  <span class="font-mono text-sm font-bold text-rose-400">${U.fmtIDR(x.amount)}</span>
                  <button data-mark-paid="${x.id}" class="text-[11.5px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 rounded-lg px-2.5 py-1.5 hover:bg-teal-500/30 transition">✓ Lunas</button>
                </div>
              </div>`;
            }).join('');
            listEl.querySelectorAll('[data-mark-paid]').forEach((b) => b.addEventListener('click', () => this.markPaid(b.dataset.markPaid)));
          }
        }
        this.renderCascadeGroup(this.dashGroup || 'expense');
        this.renderTrendGroup(this.dashGroup || 'expense');
        this.renderDonutGroup(this.dashGroup || 'expense');
      }
      renderCascadeGroup(group = 'expense') {
        const wrap = document.getElementById('cascadeWrap');
        if (!wrap) return;
        const end = U.parseD(this.range.end);
        const days = [];
        let items = [];
        let barGradient = 'from-rose-600 to-rose-400';
        let boxStyle = 'from-rose-950/90 to-slate-900 border-rose-500/40';
        let monthColor = 'text-rose-400';
        let labelGroup = 'Pengeluaran';

        if (group === 'income') {
          items = this.incomes.items;
          barGradient = 'from-emerald-600 to-teal-400';
          boxStyle = 'from-emerald-950/90 to-slate-900 border-emerald-500/40';
          monthColor = 'text-emerald-400';
          labelGroup = 'Pemasukan';
        } else if (group === 'allocation') {
          items = this.allocations.items;
          barGradient = 'from-amber-600 to-amber-400';
          boxStyle = 'from-amber-950/90 to-slate-900 border-amber-500/40';
          monthColor = 'text-amber-400';
          labelGroup = 'Dana Alokasi';
        } else {
          items = this.expenses.items.filter((x) => !x.isEstimate);
        }

        for (let i = 6; i >= 0; i -= 1) {
          const d = U.addDays(end, -i);
          const key = U.iso(d);
          const total = items.filter((x) => x.date === key).reduce((s, x) => s + Number(x.amount || 0), 0);
          days.push({ key, total, label: d.toLocaleDateString('id-ID', { weekday: 'short' }) });
        }
        const weekTotal = days.reduce((s, d) => s + d.total, 0);
        const rangeTotal = items
          .filter((x) => x.date >= this.range.start && x.date <= this.range.end)
          .reduce((s, x) => s + Number(x.amount || 0), 0);
        const isSameMonth = this.range.start.slice(0, 7) === this.range.end.slice(0, 7);
        const rangeDisplayLabel = isSameMonth
          ? U.monthLabel(this.range.start.slice(0, 7))
          : `Total Periode`;
        const maxDay = Math.max(...days.map((d) => d.total), 1);

        wrap.innerHTML = `
      <div class="flex items-end gap-3 md:gap-5 min-w-max px-1 overflow-x-auto py-2">
        <div class="flex items-end gap-2 md:gap-3">
          ${days
            .map(
              (d) => `
            <div class="flex flex-col items-center gap-1.5 w-10 md:w-12">
              <div class="w-full h-28 bg-slate-950/90 border border-slate-800 rounded-xl flex items-end p-1 overflow-hidden shadow-inner">
                <div class="cascade-bar w-full bg-gradient-to-t ${barGradient} rounded-lg shadow-md" style="height:${U.clamp((d.total / maxDay) * 100, 4, 100)}%" title="${d.label}: ${U.fmtIDR(d.total)}"></div>
              </div>
              <span class="text-[11px] font-bold text-slate-400">${d.label}</span>
            </div>`
            )
            .join('')}
        </div>
        <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2.5" class="shrink-0 mb-7 text-teal-400"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="flex flex-col items-center gap-1 shrink-0">
          <div class="w-36 h-28 rounded-2xl bg-gradient-to-br ${boxStyle} border flex flex-col items-center justify-center text-white p-3.5 shadow-xl backdrop-blur-md shrink-0">
            <span class="text-[11px] font-semibold text-slate-300">7 Hari Terakhir (${labelGroup})</span>
            <span class="font-mono text-xs sm:text-sm font-extrabold text-white mt-1 text-center truncate w-full px-1" title="${U.fmtIDR(weekTotal)}">${U.fmtIDR(weekTotal)}</span>
          </div>
        </div>
        <svg width="20" height="16" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2.5" class="shrink-0 mb-7 text-teal-400"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <div class="flex flex-col items-center gap-1 shrink-0">
          <div class="w-44 h-28 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center text-white p-3 shadow-xl backdrop-blur-md shrink-0">
            <span class="text-[11px] font-semibold text-slate-400 text-center leading-tight truncate w-full" title="${rangeDisplayLabel}">${rangeDisplayLabel}</span>
            <span class="font-mono text-xs sm:text-sm font-extrabold ${monthColor} mt-1 text-center truncate w-full px-1" title="${U.fmtIDR(rangeTotal)}">${U.fmtIDR(rangeTotal)}</span>
          </div>
        </div>
      </div>`;

        if (group === 'allocation') {
          const consolidated = this.getConsolidatedAllocations(this.allocations.items);
          if (consolidated.length) {
            wrap.innerHTML += `
              <div class="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    Ringkasan Target & Progres Dana Alokasi
                  </h3>
                  <span class="text-[11px] text-slate-400 font-mono">${consolidated.length} Dana Alokasi Terekam</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  ${consolidated.map((item) => {
                    const targetVal = Number(item.targetAmount || 0);
                    const amtVal = Number(item.amount || 0);
                    const pctVal = targetVal > 0 ? Math.min(100, Math.round((amtVal / targetVal) * 100)) : 0;
                    const remVal = targetVal > 0 ? Math.max(0, targetVal - amtVal) : 0;
                    const catLabel = ALLOCATION_CATS[item.category]?.label || item.category;
                    const color = ALLOCATION_CATS[item.category]?.color || '#FBBF24';

                    return `
                      <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5 shadow-inner">
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <p class="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${color}"></span>
                              ${item.subcategory}
                            </p>
                            <p class="text-[10px] text-slate-400 truncate">(${catLabel})</p>
                          </div>
                          ${targetVal > 0 ? `<span class="text-xs font-extrabold font-mono shrink-0 ${pctVal >= 100 ? 'text-emerald-400' : 'text-amber-400'}">${pctVal}%</span>` : '<span class="text-[10px] text-slate-500 font-mono">-</span>'}
                        </div>
                        ${targetVal > 0 ? `
                          <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500 ${pctVal >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-teal-500'}" style="width:${pctVal}%"></div>
                          </div>
                          <div class="flex items-center justify-between text-[11px] font-mono">
                            <span class="text-slate-400">Terkumpul: <strong class="text-amber-400 font-extrabold">${U.fmtIDR(amtVal)}</strong></span>
                            <span class="text-slate-400">Target: <strong class="text-white">${U.fmtIDR(targetVal)}</strong></span>
                          </div>
                          ${remVal > 0 ? `<p class="text-[10px] text-slate-400 font-mono">Sisa Target: <strong class="text-slate-300">${U.fmtIDR(remVal)}</strong></p>` : `<p class="text-[10px] text-emerald-400 font-bold">✓ Target Tercapai!</p>`}
                        ` : `
                          <div class="flex items-center justify-between text-[11px] font-mono pt-1">
                            <span class="text-slate-400">Jumlah Alokasi:</span>
                            <strong class="text-amber-400 font-extrabold">${U.fmtIDR(amtVal)}</strong>
                          </div>
                        `}
                      </div>`;
                  }).join('')}
                </div>
              </div>`;
          }
        }
      }

      renderTrendGroup(group = 'expense') {
        const ctx = document.getElementById('chartTrend');
        const titleEl = document.getElementById('chartTrendTitle');
        if (!ctx) return;

        if (group === 'income') {
          if (titleEl) titleEl.textContent = 'Tren Pemasukan Mingguan';
          const inc = this.currentIncomes();
          const weeksInc = Aggregator.byWeek(inc);
          const keys = Object.keys(weeksInc).sort();
          const labels = keys.map((k) => 'Mgg ' + U.fmtDateShort(k));
          const dataInc = keys.map((k) => weeksInc[k] || 0);

          if (this.charts.trend) this.charts.trend.destroy();
          this.charts.trend = new Chart(ctx, {
            type: 'bar',
            data: {
              labels,
              datasets: [{ label: 'Pemasukan', data: dataInc, backgroundColor: '#2DD4BF', borderRadius: 6, maxBarThickness: 32 }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: '#94A3B8' } } },
              scales: {
                y: { ticks: { callback: (v) => v / 1000 + 'k', font: { size: 10 }, color: '#94A3B8' }, grid: { color: '#1E293B' } },
                x: { ticks: { font: { size: 10 }, color: '#94A3B8' }, grid: { display: false } },
              },
            },
          });
        } else if (group === 'allocation') {
          if (titleEl) titleEl.textContent = 'Tren Dana Alokasi vs Target';
          const alc = this.currentAllocations();
          const weeksAlc = Aggregator.byWeek(alc);
          const keys = Object.keys(weeksAlc).sort();
          const labels = keys.map((k) => 'Mgg ' + U.fmtDateShort(k));
          const dataAlc = keys.map((k) => weeksAlc[k] || 0);

          if (this.charts.trend) this.charts.trend.destroy();
          this.charts.trend = new Chart(ctx, {
            type: 'bar',
            data: {
              labels,
              datasets: [{ label: 'Dana Alokasi Terkumpul', data: dataAlc, backgroundColor: '#FBBF24', borderRadius: 6, maxBarThickness: 32 }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: '#94A3B8' } } },
              scales: {
                y: { ticks: { callback: (v) => v / 1000 + 'k', font: { size: 10 }, color: '#94A3B8' }, grid: { color: '#1E293B' } },
                x: { ticks: { font: { size: 10 }, color: '#94A3B8' }, grid: { display: false } },
              },
            },
          });
        } else {
          if (titleEl) titleEl.textContent = 'Tren Pengeluaran Mingguan';
          const exp = this.currentExpenses();
          const inc = this.currentIncomes();
          this.renderTrendChart(exp, inc);
        }
      }

      renderDonutGroup(group = 'expense') {
        const titleEl = document.getElementById('chartDonutTitle');
        if (group === 'income') {
          if (titleEl) titleEl.textContent = 'Komposisi Pemasukan';
          const inc = this.currentIncomes();
          this.renderDonut('chartExpenseDonut', Aggregator.byCategory(inc), INCOME_CATS);
        } else if (group === 'allocation') {
          if (titleEl) titleEl.textContent = 'Komposisi Dana Alokasi';
          const alc = this.currentAllocations();
          this.renderDonut('chartExpenseDonut', Aggregator.byCategory(alc), ALLOCATION_CATS);
        } else {
          if (titleEl) titleEl.textContent = 'Komposisi Pengeluaran';
          const exp = this.currentExpenses();
          this.renderDonut('chartExpenseDonut', Aggregator.byCategory(exp), EXPENSE_CATS);
        }
      }
      renderTrendChart(exp, inc) {
        const ctx = document.getElementById('chartTrend');
        if (!ctx) return;
        const weeksExp = Aggregator.byWeek(exp);
        const weeksInc = Aggregator.byWeek(inc);
        const keys = Array.from(new Set([...Object.keys(weeksExp), ...Object.keys(weeksInc)])).sort();
        const labels = keys.map((k) => 'Mgg ' + U.fmtDateShort(k));
        const dataExp = keys.map((k) => weeksExp[k] || 0);
        const dataInc = keys.map((k) => weeksInc[k] || 0);
        if (this.charts.trend) this.charts.trend.destroy();
        this.charts.trend = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Pemasukan', data: dataInc, backgroundColor: '#2DD4BF', borderRadius: 6, maxBarThickness: 28 },
              { label: 'Pengeluaran', data: dataExp, backgroundColor: '#FB7185', borderRadius: 6, maxBarThickness: 28 },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: '#94A3B8' } } },
            scales: {
              y: { ticks: { callback: (v) => v / 1000 + 'k', font: { size: 10 }, color: '#94A3B8' }, grid: { color: '#1E293B' } },
              x: { ticks: { font: { size: 10 }, color: '#94A3B8' }, grid: { display: false } },
            },
          },
        });
      }
      renderDonut(canvasId, byCat, defs) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const keys = Object.keys(defs).filter((k) => byCat[k]);
        const labels = keys.map((k) => defs[k].label);
        const data = keys.map((k) => byCat[k] || 0);
        const colors = keys.map((k) => defs[k].color);
        if (this.charts[canvasId]) this.charts[canvasId].destroy();
        this.charts[canvasId] = new Chart(ctx, {
          type: 'doughnut',
          data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: '#94A3B8' } } },
          },
        });
      }
      renderExpenseList() {
        let items = this.expenses.inRange(this.range.start, this.range.end);
        if (this.expenseFilter !== 'all') items = items.filter((x) => x.category === this.expenseFilter);

        const searchVal = (document.getElementById('expenseSearch')?.value || '').trim().toLowerCase();
        if (searchVal) {
          items = items.filter((x) => (x.subcategory || '').toLowerCase().includes(searchVal) || (x.note || '').toLowerCase().includes(searchVal));
        }

        items = items.slice().sort((a, b) => b.date.localeCompare(a.date));

        const perPageVal = document.getElementById('expensePerPage')?.value || '20';
        if (perPageVal !== 'all') {
          const limit = parseInt(perPageVal, 10);
          if (!isNaN(limit) && limit > 0) {
            items = items.slice(0, limit);
          }
        }

        const actual = this.expenses.inRange(this.range.start, this.range.end).filter((x) => !x.isEstimate);
        document.getElementById('totTetap').textContent = U.fmtIDR(actual.filter((x) => x.category === 'tetap').reduce((s, x) => s + Number(x.amount), 0));
        document.getElementById('totBerkala').textContent = U.fmtIDR(actual.filter((x) => x.category === 'berkala').reduce((s, x) => s + Number(x.amount), 0));
        document.getElementById('totDinamis').textContent = U.fmtIDR(actual.filter((x) => x.category === 'dinamis').reduce((s, x) => s + Number(x.amount), 0));
        const list = document.getElementById('expenseList');
        if (!list) return;
        list.className = "block w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl";

        if (!items.length) {
          list.innerHTML = `<p class="text-sm text-slate-400 py-10 text-center">Belum ada data pengeluaran pada periode ini.</p>`;
          return;
        }

        list.innerHTML = `
          <table class="w-full text-left border-collapse min-w-[640px]">
            <thead class="bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-3.5 px-4">Tanggal</th>
                <th class="py-3.5 px-4">Subkategori & Kategori</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4 text-right">Jumlah (Nominal)</th>
                <th class="py-3.5 px-4 text-center">Bukti</th>
                <th class="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              ${items.map((x) => `
                <tr class="hover:bg-slate-800/50 transition">
                  <td class="py-3 px-4 text-slate-300 font-mono text-[12px] whitespace-nowrap">${U.fmtDateID(x.date)}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${EXPENSE_CATS[x.category]?.color || '#94A3B8'}"></span>
                      <span class="font-bold text-white">${x.subcategory}</span>
                      ${x.isEstimate ? '<span class="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-0.5">Estimasi</span>' : ''}
                      <span class="text-[11px] text-slate-400">(${EXPENSE_CATS[x.category]?.label || x.category})</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap">
                    ${x.category !== 'dinamis' ? (x.status === 'paid' ? '<span class="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">✓ Lunas</span>' : '<span class="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">Belum Bayar</span>') : '<span class="text-slate-500">-</span>'}
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm whitespace-nowrap">- ${U.fmtIDR(x.amount)}</td>
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    ${x.attachmentUrl ? `<button type="button" onclick="event.stopPropagation(); window.__cashApp.openAttachmentPreview('${x.attachmentUrl}')" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 rounded-lg px-2.5 py-1 hover:bg-teal-500/30 transition" title="Lihat bukti"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Bukti</button>` : '<span class="text-slate-500 text-[11px]">-</span>'}
                  </td>
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <button type="button" data-edit="${x.id}" class="text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-teal-500/50 hover:text-white rounded-lg px-2.5 py-1 transition">Edit / Detail</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        list.querySelectorAll('[data-edit]').forEach((el) => el.addEventListener('click', () => this.openEntryForm('expense', el.dataset.edit)));
      }
      renderIncomeList() {
        const actualIncomes = this.incomes.inRange(this.range.start, this.range.end);
        const elEarned = document.getElementById('totEarned');
        if (elEarned) elEarned.textContent = U.fmtIDR(actualIncomes.filter((x) => x.category === 'earned').reduce((s, x) => s + Number(x.amount), 0));
        const elPassive = document.getElementById('totPassive');
        if (elPassive) elPassive.textContent = U.fmtIDR(actualIncomes.filter((x) => x.category === 'passive').reduce((s, x) => s + Number(x.amount), 0));
        const elPortfolio = document.getElementById('totPortfolio');
        if (elPortfolio) elPortfolio.textContent = U.fmtIDR(actualIncomes.filter((x) => x.category === 'portfolio').reduce((s, x) => s + Number(x.amount), 0));

        let items = actualIncomes;
        if (this.incomeFilter !== 'all') items = items.filter((x) => x.category === this.incomeFilter);

        const searchVal = (document.getElementById('incomeSearch')?.value || '').trim().toLowerCase();
        if (searchVal) {
          items = items.filter((x) => (x.subcategory || '').toLowerCase().includes(searchVal) || (x.note || '').toLowerCase().includes(searchVal));
        }

        items = items.slice().sort((a, b) => b.date.localeCompare(a.date));

        const perPageVal = document.getElementById('incomePerPage')?.value || '20';
        if (perPageVal !== 'all') {
          const limit = parseInt(perPageVal, 10);
          if (!isNaN(limit) && limit > 0) {
            items = items.slice(0, limit);
          }
        }

        const list = document.getElementById('incomeList');
        if (!list) return;
        list.className = "block w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl";

        if (!items.length) {
          list.innerHTML = `<p class="text-sm text-slate-400 py-10 text-center">Belum ada data pemasukan pada periode ini.</p>`;
          return;
        }

        list.innerHTML = `
          <table class="w-full text-left border-collapse min-w-[640px]">
            <thead class="bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-3.5 px-4">Tanggal</th>
                <th class="py-3.5 px-4">Subkategori & Kategori</th>
                <th class="py-3.5 px-4">Catatan</th>
                <th class="py-3.5 px-4 text-right">Jumlah (Nominal)</th>
                <th class="py-3.5 px-4 text-center">Bukti</th>
                <th class="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              ${items.map((x) => `
                <tr class="hover:bg-slate-800/50 transition">
                  <td class="py-3 px-4 text-slate-300 font-mono text-[12px] whitespace-nowrap">${U.fmtDateID(x.date)}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${INCOME_CATS[x.category]?.color || '#94A3B8'}"></span>
                      <span class="font-bold text-white">${x.subcategory}</span>
                      <span class="text-[11px] text-slate-400">(${INCOME_CATS[x.category]?.label || x.category})</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-slate-400 max-w-[200px] truncate">${x.note || '-'}</td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">+ ${U.fmtIDR(x.amount)}</td>
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    ${x.attachmentUrl ? `<button type="button" onclick="event.stopPropagation(); window.__cashApp.openAttachmentPreview('${x.attachmentUrl}')" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 rounded-lg px-2.5 py-1 hover:bg-teal-500/30 transition" title="Lihat bukti"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Bukti</button>` : '<span class="text-slate-500 text-[11px]">-</span>'}
                  </td>
                  <td class="py-3 px-4 text-center whitespace-nowrap">
                    <button type="button" data-edit="${x.id}" class="text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-teal-500/50 hover:text-white rounded-lg px-2.5 py-1 transition">Edit / Detail</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        list.querySelectorAll('[data-edit]').forEach((el) => el.addEventListener('click', () => this.openEntryForm('income', el.dataset.edit)));
      }
      getConsolidatedAllocations(items) {
        const groups = {};
        items.forEach((x) => {
          const key = `${x.category}::${x.subcategory}`;
          if (!groups[key]) {
            groups[key] = {
              id: x.id,
              ids: [x.id],
              category: x.category,
              subcategory: x.subcategory,
              targetAmount: Number(x.targetAmount || 0),
              amount: Number(x.amount || 0),
              date: x.date,
              attachmentUrl: x.attachmentUrl || '',
              note: x.note || '',
            };
          } else {
            groups[key].ids.push(x.id);
            groups[key].amount += Number(x.amount || 0);
            if (Number(x.targetAmount || 0) > 0) {
              groups[key].targetAmount = Math.max(groups[key].targetAmount, Number(x.targetAmount || 0));
            }
            if (x.date > groups[key].date) {
              groups[key].date = x.date;
            }
            if (x.attachmentUrl && !groups[key].attachmentUrl) {
              groups[key].attachmentUrl = x.attachmentUrl;
            }
          }
        });
        return Object.values(groups);
      }
      renderAllocations() {
        let items = this.allocations.inRange(this.range.start, this.range.end);

        const searchVal = (document.getElementById('allocationSearch')?.value || '').trim().toLowerCase();
        if (searchVal) {
          items = items.filter((x) => (x.subcategory || '').toLowerCase().includes(searchVal) || (x.note || '').toLowerCase().includes(searchVal));
        }

        const consolidated = this.getConsolidatedAllocations(items);
        const byCat = Aggregator.byCategory(items);
        const cardsEl = document.getElementById('allocationCards');
        if (cardsEl) {
          cardsEl.innerHTML = Object.keys(ALLOCATION_CATS)
            .map(
              (k) => `
      <div class="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-4 shadow-lg space-y-1">
        <p class="text-[12px] text-slate-400 font-medium">${ALLOCATION_CATS[k].label}</p>
        <p class="font-mono font-extrabold text-xl" style="color:${ALLOCATION_CATS[k].color}">${U.fmtIDR(byCat[k] || 0)}</p>
      </div>`
            )
            .join('');
        }
        const list = document.getElementById('allocationList');
        if (!list) return;
        let sorted = consolidated.slice().sort((a, b) => b.date.localeCompare(a.date));

        const perPageVal = document.getElementById('allocationPerPage')?.value || '20';
        if (perPageVal !== 'all') {
          const limit = parseInt(perPageVal, 10);
          if (!isNaN(limit) && limit > 0) {
            sorted = sorted.slice(0, limit);
          }
        }
        list.className = "block w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl";

        if (!sorted.length) {
          list.innerHTML = `<p class="text-sm text-slate-400 py-10 text-center">Belum ada data dana alokasi pada periode ini.</p>`;
          return;
        }

        list.innerHTML = `
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead class="bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th class="py-3.5 px-4">Tanggal</th>
                <th class="py-3.5 px-4">Subkategori & Kategori</th>
                <th class="py-3.5 px-4">Target & Progress</th>
                <th class="py-3.5 px-4 text-right">Jumlah Alokasi</th>
                <th class="py-3.5 px-4 text-center">Bukti</th>
                <th class="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-xs font-medium text-slate-200">
              ${sorted.map((x) => {
                const targetVal = Number(x.targetAmount || 0);
                const amtVal = Number(x.amount || 0);
                const remVal = targetVal > 0 ? Math.max(0, targetVal - amtVal) : 0;
                const pctVal = targetVal > 0 ? Math.min(100, Math.round((amtVal / targetVal) * 100)) : 0;

                const progressHtml = targetVal > 0
                  ? `<div class="space-y-1 min-w-[180px]">
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400">Target: <strong class="text-white font-mono">${U.fmtIDR(targetVal)}</strong></span>
                        <span class="font-bold ${pctVal >= 100 ? 'text-emerald-400' : 'text-amber-400'}">${pctVal}%</span>
                      </div>
                      <div class="w-full bg-slate-950 border border-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500 ${pctVal >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-teal-500'}" style="width: ${pctVal}%"></div>
                      </div>
                    </div>`
                  : `<span class="text-slate-500 text-[11px]">-</span>`;

                return `
                  <tr class="hover:bg-slate-800/50 transition">
                    <td class="py-3 px-4 text-slate-300 font-mono text-[12px] whitespace-nowrap">${U.fmtDateID(x.date)}</td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${ALLOCATION_CATS[x.category]?.color || '#94A3B8'}"></span>
                        <span class="font-bold text-white">${x.subcategory}</span>
                        <span class="text-[11px] text-slate-400">(${ALLOCATION_CATS[x.category]?.label || x.category})</span>
                      </div>
                    </td>
                    <td class="py-3 px-4">${progressHtml}</td>
                    <td class="py-3 px-4 text-right font-mono font-bold text-amber-400 text-sm whitespace-nowrap">${U.fmtIDR(x.amount)}</td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${x.attachmentUrl ? `<button type="button" onclick="event.stopPropagation(); window.__cashApp.openAttachmentPreview('${x.attachmentUrl}')" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 rounded-lg px-2.5 py-1 hover:bg-teal-500/30 transition" title="Lihat bukti"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Bukti</button>` : '<span class="text-slate-500 text-[11px]">-</span>'}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <button type="button" data-edit="${x.id}" class="text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-teal-500/50 hover:text-white rounded-lg px-2.5 py-1 transition">Edit / Detail</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
        list.querySelectorAll('[data-edit]').forEach((el) => el.addEventListener('click', () => this.openEntryForm('allocation', el.dataset.edit)));
      }
      renderReports() {
        const exp = this.currentExpenses();
        const inc = this.currentIncomes();
        const alc = this.currentAllocations();
        const totalInc = Aggregator.total(inc);
        const totalExp = Aggregator.total(exp);
        const totalAlc = Aggregator.total(alc);
        const balance = totalInc - totalExp - totalAlc;
        document.getElementById('reportPeriod').innerHTML = `Periode Laporan<br>${U.fmtDateID(this.range.start)} – ${U.fmtDateID(this.range.end)}`;
        document.getElementById('repIncome').textContent = U.fmtIDR(totalInc);
        document.getElementById('repExpense').textContent = U.fmtIDR(totalExp);
        document.getElementById('repAllocation').textContent = U.fmtIDR(totalAlc);
        document.getElementById('repBalance').textContent = U.fmtIDR(balance);
        this.renderDonut('chartRepExpense', Aggregator.byCategory(exp), EXPENSE_CATS);
        this.renderDonut('chartRepIncome', Aggregator.byCategory(inc), INCOME_CATS);
        const endD = U.parseD(this.range.end);
        const monthKeys = [];
        for (let i = 5; i >= 0; i -= 1) {
          const d = new Date(endD.getFullYear(), endD.getMonth() - i, 1);
          monthKeys.push(U.iso(d).slice(0, 7));
        }
        const expByMonth = Aggregator.byMonth(this.expenses.items.filter((x) => !x.isEstimate));
        const incByMonth = Aggregator.byMonth(this.incomes.items);
        const ctx = document.getElementById('chartRepTrend');
        if (ctx) {
          if (this.charts.repTrend) this.charts.repTrend.destroy();
          this.charts.repTrend = new Chart(ctx, {
            type: 'line',
            data: {
              labels: monthKeys.map((k) => U.monthLabel(k)),
              datasets: [
                { label: 'Pemasukan', data: monthKeys.map((k) => incByMonth[k] || 0), borderColor: '#1F6F5C', backgroundColor: '#1F6F5C22', tension: 0.35, fill: true },
                { label: 'Pengeluaran', data: monthKeys.map((k) => expByMonth[k] || 0), borderColor: '#CE5A32', backgroundColor: '#CE5A3222', tension: 0.35, fill: true },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
              scales: { y: { ticks: { callback: (v) => (v / 1000) + 'k', font: { size: 10 } }, grid: { color: '#EEF2EF' } }, x: { ticks: { font: { size: 10 } }, grid: { display: false } } },
            },
          });
        }
        const rowsHtml = (defs, items) =>
          Object.keys(defs)
            .map((k) => {
              const sub = items.filter((x) => x.category === k);
              const tot = sub.reduce((s, x) => s + Number(x.amount), 0);
              if (!tot) return '';
              return `<tr class="border-b border-slate-800"><td class="py-1.5 pr-2 text-slate-300" style="color:${defs[k].color}">● ${defs[k].label}</td><td class="py-1.5 text-right font-mono font-bold text-white">${U.fmtIDR(tot)}</td></tr>`;
            })
            .join('') || `<tr><td class="py-3 text-slate-500 text-center" colspan="2">Tidak ada data</td></tr>`;
        document.getElementById('repExpenseTable').innerHTML = rowsHtml(EXPENSE_CATS, exp);
        document.getElementById('repIncomeTable').innerHTML = rowsHtml(INCOME_CATS, inc);
        document.getElementById('repAllocationTable').innerHTML = rowsHtml(ALLOCATION_CATS, alc);

        const health = this.generateFinancialInsights({ exp, inc, alc, totalInc, totalExp, totalAlc, balance });
        const healthContainer = document.getElementById('reportHealthContainer');
        if (healthContainer) {
          healthContainer.innerHTML = `
            <div class="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-xl">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-xl shadow-md">
                    ${health.score}
                  </div>
                  <div>
                    <h3 class="font-display font-bold text-base text-white flex items-center gap-2">
                      Skor Kesehatan Keuangan: <span class="text-teal-400 font-mono font-extrabold">${health.score}/100</span>
                    </h3>
                    <p class="text-xs text-slate-400">Analisis otomatis & rekomendasi pintar sistem untuk manajemen keuangan Anda.</p>
                  </div>
                </div>
                <div class="w-full sm:w-48 bg-slate-900 border border-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                  <div class="h-full rounded-full transition-all duration-700 ${health.score >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : health.score >= 60 ? 'bg-gradient-to-r from-amber-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'}" style="width:${health.score}%"></div>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${health.metrics.map((m) => `
                  <div class="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 space-y-1">
                    <p class="text-[11px] text-slate-400 font-medium">${m.label}</p>
                    <div class="flex items-baseline justify-between gap-1">
                      <span class="font-mono text-sm md:text-base font-extrabold text-white">${m.val}</span>
                      <span class="text-[10px] font-bold ${m.color}">${m.status}</span>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div class="space-y-2.5 pt-1">
                <h4 class="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Wawasan & Rekomendasi Pintar Perencana Keuangan
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  ${health.insights.map((ins) => {
                    const borderCol = ins.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' : ins.type === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : ins.type === 'danger' ? 'border-rose-500/30 bg-rose-500/10' : 'border-teal-500/30 bg-teal-500/10';
                    return `
                      <div class="p-3.5 rounded-xl border ${borderCol} space-y-1 shadow-sm">
                        <p class="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>${ins.icon}</span> ${ins.title}
                        </p>
                        <p class="text-[12px] text-slate-300 leading-relaxed">${ins.text}</p>
                      </div>`;
                  }).join('')}
                </div>
              </div>
            </div>`;
        }

        document.getElementById('repSuggestions').innerHTML = health.insights
          .map((ins) => `<li class="leading-relaxed"><strong class="text-white">${ins.icon} ${ins.title}:</strong> ${ins.text}</li>`)
          .join('');
      }
      generateFinancialInsights({ exp, inc, alc, totalInc, totalExp, totalAlc, balance }) {
        let score = 70;
        const metrics = [];
        const insights = [];

        const savingRatio = totalInc > 0 ? (totalAlc / totalInc) * 100 : 0;
        if (savingRatio >= 20) {
          score += 15;
          metrics.push({ label: 'Rasio Tabungan & Alokasi', val: `${Math.round(savingRatio)}%`, status: 'Sangat Sehat', color: 'text-emerald-400' });
          insights.push({ type: 'success', icon: '💡', title: 'Rasio Alokasi Finansial Prima', text: `Anda telah mengalokasikan ${Math.round(savingRatio)}% dari total pemasukan. Ini di atas standar sehat 20% yang direkomendasikan perencana keuangan.` });
        } else if (savingRatio > 0) {
          score += 5;
          metrics.push({ label: 'Rasio Tabungan & Alokasi', val: `${Math.round(savingRatio)}%`, status: 'Cukup Baik', color: 'text-amber-400' });
          insights.push({ type: 'warning', icon: '💡', title: 'Tingkatkan Alokasi Tabungan', text: `Rasio alokasi Anda saat ini ${Math.round(savingRatio)}%. Cobalah tingkatkan secara bertahap menuju target 20% dari total pemasukan.` });
        } else {
          score -= 10;
          metrics.push({ label: 'Rasio Tabungan & Alokasi', val: '0%', status: 'Perlu Perhatian', color: 'text-rose-400' });
          insights.push({ type: 'danger', icon: '⚠️', title: 'Belum Ada Alokasi Tabungan', text: 'Belum ada dana alokasi yang disisihkan pada periode ini. Sisihkan alokasi di awal bulan sebelum melakukan pengeluaran dinamis.' });
        }

        const expRatio = totalInc > 0 ? (totalExp / totalInc) * 100 : 0;
        if (totalInc > 0 && expRatio <= 60) {
          score += 15;
          metrics.push({ label: 'Rasio Pengeluaran', val: `${Math.round(expRatio)}%`, status: 'Efisien', color: 'text-emerald-400' });
          insights.push({ type: 'success', icon: '📊', title: 'Pengeluaran Sangat Efisien', text: `Pengeluaran Anda hanya ${Math.round(expRatio)}% dari total pemasukan. Anda memiliki ruang finansial yang sangat aman.` });
        } else if (totalInc > 0 && expRatio <= 85) {
          metrics.push({ label: 'Rasio Pengeluaran', val: `${Math.round(expRatio)}%`, status: 'Normal', color: 'text-amber-400' });
          insights.push({ type: 'info', icon: '📊', title: 'Pengeluaran Terkendali', text: `Pengeluaran berada di level ${Math.round(expRatio)}% dari pemasukan. Pantau pos pengeluaran dinamis agar tidak terus meningkat.` });
        } else if (balance < 0) {
          score -= 20;
          metrics.push({ label: 'Rasio Pengeluaran', val: `${totalInc > 0 ? Math.round(expRatio) : 100}%`, status: 'Defisit', color: 'text-rose-400' });
          insights.push({ type: 'danger', icon: '🚨', title: 'Peringatan Defisit Anggaran', text: `Pengeluaran melebihi pemasukan sebesar ${U.fmtIDR(Math.abs(balance))}. Evaluasi dan tekan segera pengeluaran non-esensial.` });
        }

        const dinamisTotal = exp.filter((x) => x.category === 'dinamis').reduce((s, x) => s + Number(x.amount || 0), 0);
        const dinamisRatio = totalInc > 0 ? (dinamisTotal / totalInc) * 100 : 0;
        if (totalInc > 0 && dinamisRatio > 30) {
          score -= 10;
          insights.push({ type: 'warning', icon: '🛍️', title: 'Evaluasi Gaya Hidup & Variabel', text: `Pengeluaran dinamis/variabel mencapai ${Math.round(dinamisRatio)}% (${U.fmtIDR(dinamisTotal)}). Batasi kebutuhan sekunder/rekreasi hingga di bawah 30%.` });
        }

        const daruratTotal = this.allocations.items.filter((x) => x.category === 'darurat').reduce((s, x) => s + Number(x.amount || 0), 0);
        const avgMonthlyExp = (Aggregator.total(this.expenses.items.filter((x) => !x.isEstimate)) / Math.max(1, new Set(this.expenses.items.map((x) => U.monthKey(x.date))).size)) || 0;
        const monthsCovered = avgMonthlyExp > 0 ? (daruratTotal / avgMonthlyExp).toFixed(1) : '0';

        if (avgMonthlyExp > 0 && daruratTotal >= avgMonthlyExp * 6) {
          score += 10;
          metrics.push({ label: 'Dana Darurat', val: `${monthsCovered} bln`, status: 'Sangat Aman', color: 'text-emerald-400' });
          insights.push({ type: 'success', icon: '🛡️', title: 'Fondasi Dana Darurat Kuat', text: `Dana darurat Anda mencukupi ${monthsCovered} bulan pengeluaran. Fondasi keamanan finansial Anda sangat tangguh.` });
        } else {
          metrics.push({ label: 'Dana Darurat', val: `${monthsCovered} bln`, status: 'Perlu Ditambah', color: 'text-amber-400' });
          insights.push({ type: 'warning', icon: '🛡️', title: 'Target Dana Darurat', text: `Dana darurat (${U.fmtIDR(daruratTotal)}) baru mencukupi ${monthsCovered} bulan pengeluaran bulanan (${U.fmtIDR(avgMonthlyExp)}). Idealnya minimal 3 hingga 6 bulan.` });
        }

        const unpaidBills = this.expenses.items.filter((x) => (x.category === 'tetap' || x.category === 'berkala') && x.status === 'unpaid');
        if (unpaidBills.length > 0) {
          score -= 15;
          insights.push({ type: 'danger', icon: '⏰', title: 'Tagihan Belum Terbayar', text: `Terdapat ${unpaidBills.length} tagihan tetap/berkala belum dibayar. Segera lunasi untuk menghindari denda keterlambatan.` });
        } else {
          score += 5;
        }

        score = U.clamp(score, 10, 100);

        return { score, metrics, insights };
      }
      async exportPdf() {
        const btn = document.getElementById('exportPdfBtn');
        if (!btn) return;
        const original = btn.innerHTML;
        btn.innerHTML = 'Menyiapkan PDF...';
        btn.disabled = true;
        try {
          this.renderReports();
          await new Promise((r) => setTimeout(r, 250));
          const el = document.getElementById('reportContent');
          if (!el) throw new Error('Report content tidak ditemukan');
          const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;
          const imgWidth = pageWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        pdf.save(`Laporan-CashMoney-${this.range.start}_${this.range.end}.pdf`);
          toast('PDF berhasil diunduh');
        } catch (err) {
          console.error(err);
          toast('Gagal membuat PDF', 'err');
        } finally {
          btn.innerHTML = original;
          btn.disabled = false;
        }
      }

      // ───────────────────────────────────────────────
      // ATTACHMENT PREVIEW
      // ───────────────────────────────────────────────
      openAttachmentPreview(url) {
        if (!url) return;
        const modal = document.getElementById('attachmentModal');
        const imgEl = document.getElementById('attachPreviewImg');
        const pdfEl = document.getElementById('attachPreviewPdf');
        const openBtn = document.getElementById('attachOpenTab');
        if (!modal) return;
        const isPdf = /\.pdf($|\?)/i.test(url) || url.includes('application/pdf');
        if (imgEl) imgEl.style.display = isPdf ? 'none' : 'block';
        if (pdfEl) pdfEl.style.display = isPdf ? 'block' : 'none';
        if (imgEl && !isPdf) imgEl.src = url;
        if (pdfEl && isPdf) pdfEl.src = url + '#toolbar=0&view=FitH';
        if (openBtn) openBtn.href = url;
        modal.classList.add('active');
      }
      closeAttachmentPreview() {
        const modal = document.getElementById('attachmentModal');
        if (modal) modal.classList.remove('active');
        const imgEl = document.getElementById('attachPreviewImg');
        const pdfEl = document.getElementById('attachPreviewPdf');
        if (imgEl) imgEl.src = '';
        if (pdfEl) pdfEl.src = '';
      }

      // Bind file input → show local preview; and show existing attachment for edit mode
      bindAttachmentPreviews() {
        const setupFileInput = (inputId, previewWrapperId) => {
          const input = document.getElementById(inputId);
          const wrap = document.getElementById(previewWrapperId);
          if (!input || !wrap) return;
          input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) { wrap.innerHTML = ''; wrap.classList.add('hidden'); return; }
            wrap.classList.remove('hidden');
            if (file.type === 'application/pdf') {
              wrap.innerHTML = `<div class="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B87511" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>
                <div class="min-w-0"><p class="text-xs font-semibold text-amber-700 truncate">${file.name}</p><p class="text-[11px] text-amber-600">${(file.size / 1024).toFixed(1)} KB • PDF</p></div>
              </div>`;
            } else {
              const reader = new FileReader();
              reader.onload = (e) => {
                wrap.innerHTML = `<div class="relative">
                  <img src="${e.target.result}" alt="preview" class="w-full max-h-48 object-contain rounded-xl border border-line bg-surface" />
                  <span class="absolute top-1.5 right-1.5 text-[10px] font-semibold bg-ink/60 text-white rounded-full px-2 py-0.5">${(file.size/1024).toFixed(0)}KB</span>
                </div>`;
              };
              reader.readAsDataURL(file);
            }
          });
        };
        setupFileInput('exp_attachment', 'expAttachPreview');
        setupFileInput('inc_attachment', 'incAttachPreview');
        setupFileInput('alc_attachment', 'alcAttachPreview');
      }

      // Show existing attachment when opening edit form
      showExistingAttachment(previewWrapperId, attachmentUrl) {
        const wrap = document.getElementById(previewWrapperId);
        if (!wrap) return;
        if (!attachmentUrl) { wrap.innerHTML = ''; wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        const isPdf = /\.pdf($|\?)/i.test(attachmentUrl);
        if (isPdf) {
          wrap.innerHTML = `<div class="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B87511" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div class="min-w-0 flex-1"><p class="text-xs font-semibold text-amber-700">Bukti PDF tersimpan</p></div>
            <button type="button" onclick="window.__cashApp.openAttachmentPreview('${attachmentUrl}')" class="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1 hover:bg-teal-100 transition">Lihat</button>
          </div>`;
        } else {
          wrap.innerHTML = `<div class="relative rounded-xl overflow-hidden border border-line cursor-pointer group" onclick="window.__cashApp.openAttachmentPreview('${attachmentUrl}')">
            <img src="${attachmentUrl}" alt="Bukti" class="w-full max-h-40 object-cover" onerror="this.closest('div').classList.add('hidden')" />
            <div class="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition flex items-center justify-center">
              <span class="opacity-0 group-hover:opacity-100 transition text-xs font-semibold text-white bg-ink/60 rounded-full px-3 py-1">Lihat bukti</span>
            </div>
          </div>`;
        }
      }
    }

    if (!window.__cashApp) {
      const app = new App(initialView);
      window.__cashApp = app;
      const startApp = async () => {
        await app.init();
        if (app.token && initialView !== 'landing') {
          setIsLandingVisible(false);
        }
      };
      startApp();
    }
  }, [initialView]);

  return (
    <div className="min-h-screen text-slate-100 bg-slate-950" suppressHydrationWarning>
      <div className={isLandingVisible ? "fixed inset-0 z-[90] overflow-y-auto bg-slate-950 block" : "hidden"}>
        <LandingPage
          onOpenLogin={() => {
            setIsLandingVisible(false);
            setTimeout(() => {
              if (window.__cashApp) {
                window.__cashApp.openModal('loginModal');
              }
            }, 50);
          }}
          onOpenRegister={() => {
            setIsLandingVisible(false);
            setTimeout(() => {
              if (window.__cashApp) {
                window.__cashApp.openModal('registerModal');
              }
            }, 50);
          }}
        />
      </div>

      <div id="loadingOverlay" className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-[3px] border-teal-500/30 border-t-teal-400 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-300 font-medium">Memuat data kamu...</p>
      </div>

      <div id="app" className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">

  {/* ============ TOP BAR ============ */}
  <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80">
    <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-16">
      <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition" onClick={() => setIsLandingVisible(true)}>
        <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="font-display font-bold text-[15px] bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            CashMoney<span className="text-teal-400 font-extrabold">.</span>
          </p>
          <p className="text-[11px] text-teal-400 font-medium -mt-0.5">← Beranda / Landing Page</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button id="rangeBtn" className="flex items-center gap-2 border border-slate-700/80 rounded-xl px-3 h-10 text-sm bg-slate-800/90 text-slate-200 hover:border-teal-500/50 transition backdrop-blur-md">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
          <span id="rangeLabel" className="font-mono text-[12.5px] text-slate-200 whitespace-nowrap"></span>
        </button>
        <input id="rangeInput" className="hidden" />

        <div className="relative">
          <button id="alertBell" className="relative w-10 h-10 rounded-xl border border-slate-700/80 bg-slate-800/90 text-slate-300 flex items-center justify-center hover:border-amber-400/80 transition backdrop-blur-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            <span id="alertDot" className="hidden absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold items-center justify-center shadow-md shadow-rose-600/30">0</span>
          </button>
          <div id="alertDropdown" className="hidden absolute right-0 top-[calc(100%+8px)] w-80 max-w-[88vw] bg-slate-900/95 border border-slate-700/80 shadow-2xl z-40 max-h-[70vh] overflow-hidden flex flex-col backdrop-blur-xl rounded-2xl text-slate-100">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
              <p className="font-display font-semibold text-[13.5px] text-white">Notifikasi Tagihan</p>
              <span id="alertDropdownCount" className="text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full px-2 py-0.5">0</span>
            </div>
            <div id="alertDropdownList" className="overflow-y-auto p-2 space-y-1.5"></div>
          </div>
        </div>

        <div className="relative">
          <div id="userTile" className="hidden flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/90 px-2 sm:px-3 py-1.5 text-xs text-slate-300 cursor-pointer hover:border-teal-500/50 transition shrink-0">
            <span className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-bold flex items-center justify-center text-[10px] shadow-sm">👤</span>
            <span id="userNameDisplay" className="hidden sm:block font-bold text-white text-xs truncate max-w-[100px]"></span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400 ml-0.5 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
          </div>

          <div id="userDropdown" className="hidden absolute right-0 top-[calc(100%+8px)] w-56 bg-slate-900/95 border border-slate-700/80 shadow-2xl z-40 overflow-hidden flex flex-col backdrop-blur-xl rounded-2xl text-slate-100 p-1.5 space-y-1">
            <div className="px-3 py-2 border-b border-slate-800">
              <p id="userDropdownName" className="font-bold text-xs text-white truncate"></p>
              <p id="userDropdownEmail" className="text-[11px] text-slate-400 truncate"></p>
            </div>
            <button type="button" id="userDropdownProfileBtn" className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition text-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Profil Saya
            </button>
            <button type="button" id="userDropdownLogoutBtn" className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition text-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar / Logout
            </button>
          </div>
        </div>

        <button id="authBtn" className="flex items-center gap-1.5 border border-slate-700 rounded-xl px-3 h-10 text-sm bg-slate-800 text-slate-200 hover:text-white transition">Masuk</button>

        <button id="quickAddBtn" className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 transition text-slate-950 rounded-xl px-3.5 h-10 text-sm font-bold shadow-lg shadow-teal-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <span className="hidden sm:inline">Tambah Data</span>
        </button>
      </div>
    </div>

    {/* alert banner */}
    <div id="alertBanner" className="hidden border-t border-amber-500/30 bg-amber-500/10 px-4 md:px-6 py-2 text-[13px] text-amber-300 flex items-center gap-2 cursor-pointer backdrop-blur-md">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.3"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
      <span id="alertBannerText"></span>
      <span className="ml-auto underline font-medium shrink-0">Lihat detail</span>
    </div>
  </header>

  <div className="flex">
    {/* ============ SIDEBAR (desktop) ============ */}
    <nav className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-800/80 bg-slate-900/95 min-h-[calc(100vh-64px)] px-3.5 py-5 gap-1.5">
      <a href="/dashboard" data-view="dashboard" className="nav-link active flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
        Dashboard
      </a>
      <a href="/expenses" data-view="expenses" className="nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h18M7 15h4"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
        Pengeluaran
      </a>
      <a href="/incomes" data-view="incomes" className="nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        Pemasukan
      </a>
      <a href="/allocations" data-view="allocations" className="nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2v10l7 7"/></svg>
        Dana Alokasi
      </a>
      <a href="/reports" data-view="reports" className="nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 17V9M13 17V5M18 17v-5"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        Laporan
      </a>

      <div className="mt-auto pt-4 border-t border-slate-800/80">
        <p className="text-[11px] text-slate-400 px-3.5 leading-relaxed">System Status: <span className="text-emerald-400 font-mono font-semibold">Online & Synchronized</span></p>
      </div>
    </nav>

    {/* ============ MAIN ============ */}
    <main className="flex-1 min-w-0 px-4 md:px-6 py-5 pb-28 md:pb-8 bg-slate-950">

      {/* ---------- DASHBOARD ---------- */}
      <section id="view-dashboard" className="view active space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">Dashboard Ringkasan</h1>
            <p id="dashPeriodLabel" className="text-[13px] text-slate-400"></p>
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5.5 md:p-6 shadow-xl hover:border-emerald-500/40 transition flex items-center justify-between min-h-[125px] md:min-h-[140px]">
            <div className="space-y-1.5 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-semibold tracking-wide text-slate-400">Total Pemasukan</p>
              <p id="sumIncome" className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-400 truncate">Rp 0</p>
            </div>
            <div className="w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 ml-3 shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5.5 md:p-6 shadow-xl hover:border-rose-500/40 transition flex items-center justify-between min-h-[125px] md:min-h-[140px]">
            <div className="space-y-1.5 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-semibold tracking-wide text-slate-400">Total Pengeluaran</p>
              <p id="sumExpense" className="font-mono font-extrabold text-2xl sm:text-3xl text-rose-400 truncate">Rp 0</p>
            </div>
            <div className="w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 ml-3 shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5.5 md:p-6 shadow-xl hover:border-amber-500/40 transition flex items-center justify-between min-h-[125px] md:min-h-[140px]">
            <div className="space-y-1.5 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-semibold tracking-wide text-slate-400">Dana Alokasi</p>
              <p id="sumAllocation" className="font-mono font-extrabold text-2xl sm:text-3xl text-amber-400 truncate">Rp 0</p>
            </div>
            <div className="w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 ml-3 shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
          </div>

          <div id="sumBalanceCard" className="bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-900 backdrop-blur-md rounded-2xl border border-teal-500/50 p-5.5 md:p-6 shadow-xl hover:border-teal-500/70 transition flex items-center justify-between min-h-[125px] md:min-h-[140px]">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 pr-2">
                <p className="text-xs md:text-sm font-semibold tracking-wide text-teal-300">Saldo Bersih</p>
                <span id="balanceBadge" className="text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full px-2.5 py-0.5 inline-flex items-center shrink-0">SURPLUS</span>
              </div>
              <p id="sumBalance" className="font-mono font-extrabold text-2xl sm:text-3xl text-white truncate">Rp 0</p>
            </div>
            <div className="w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 ml-3 shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
        </div>

        {/* cascade with group selector */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-4 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="font-display font-bold text-base md:text-lg text-white">Alur Arus Kas: Harian → Mingguan → Bulanan</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pilih kelompok transaksi untuk melihat alur arus kas & analisis grafiknya.</p>
            </div>
            <div id="dashGroupTabs" className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button type="button" data-dash-group="expense" className="dash-group-tab active px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-rose-500/20 text-rose-300 border border-rose-500/40">🔴 Pengeluaran</button>
              <button type="button" data-dash-group="income" className="dash-group-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white">🟢 Pemasukan</button>
              <button type="button" data-dash-group="allocation" className="dash-group-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-400 hover:text-white">🔵 Dana Alokasi</button>
            </div>
          </div>
          <div id="cascadeWrap" className="overflow-x-auto pb-1"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 lg:col-span-2 shadow-lg">
            <h2 id="chartTrendTitle" className="font-display font-bold text-base text-white mb-4">Tren Arus Kas Mingguan</h2>
            <div className="h-64 md:h-72"><canvas id="chartTrend"></canvas></div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 shadow-lg">
            <h2 id="chartDonutTitle" className="font-display font-bold text-base text-white mb-4">Komposisi Pengeluaran</h2>
            <div className="h-64 md:h-72"><canvas id="chartExpenseDonut"></canvas></div>
          </div>
        </div>

        {/* unpaid bills */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 shadow-lg space-y-3">
          <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.3"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
            Tagihan Belum Terbayar
          </h2>
          <div id="unpaidList" className="space-y-2"></div>
        </div>
      </section>

      {/* ---------- EXPENSES ---------- */}
      <section id="view-expenses" className="view space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Kelola Pengeluaran</h1>
            <p className="text-[13px] text-slate-400">Pengeluaran Tetap, Berkala, dan Dinamis / Variabel</p>
          </div>
          <button data-add="expense" className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-sm font-bold rounded-xl px-4.5 h-10 shadow-lg shadow-teal-500/20">+ Catat Pengeluaran</button>
        </div>

        {/* Panduan Kategori Pengeluaran */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </div>
              <h3 className="font-display font-bold text-xs sm:text-sm text-white">Panduan Pengelolaan Kategori Pengeluaran</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Penyusunan Arus Kas Ideal</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F6F5C]"></span>
                <strong className="text-teal-300 font-bold">1. Pengeluaran Tetap</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Tagihan rutin bulanan bernilai konstan &amp; wajib (Sewa/KPR, Listrik, Air, Wi-Fi, Cicilan, SPP). Memiliki sanksi/denda jika terlambat.</p>
              <p className="text-teal-400/90 text-[10.5px] font-semibold pt-0.5">💡 Porsi ideal: Maksimal 30–40% dari total penghasilan.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DE9518]"></span>
                <strong className="text-amber-300 font-bold">2. Pengeluaran Berkala</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Pengeluaran rutin dengan siklus terprediksi di luar bulanan (Pajak STNK, Servis Besar Kendaraan, PBB, Zakat Tahunan).</p>
              <p className="text-amber-400/90 text-[10.5px] font-semibold pt-0.5">💡 Tips: Cicil tabung tiap bulan agar tidak kaget.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8471F]"></span>
                <strong className="text-rose-300 font-bold">3. Pengeluaran Dinamis</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Pengeluaran harian/fleksibel (Makan luar, Hiburan, Transportasi, Belanja hobi/pakaian, Jajan). Sangat mudah dikontrol.</p>
              <p className="text-rose-400/90 text-[10.5px] font-semibold pt-0.5">💡 Pos terbaik dihemat jika ingin menaikkan tabungan!</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="expenseSearch" type="text" placeholder="Cari pengeluaran atau catatan..." className="w-full pl-9 pr-4 h-10 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400">Tampilkan:</span>
            <select id="expensePerPage" defaultValue="20" className="h-10 px-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-200 font-medium">
              <option value="10">10 data</option>
              <option value="20">20 data</option>
              <option value="50">50 data</option>
              <option value="all">Semua data</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" id="expenseCatTabs">
          <button data-cat="all" className="tab-pill active px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Semua</button>
          <button data-cat="tetap" className="tab-pill px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Tetap</button>
          <button data-cat="berkala" className="tab-pill px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Berkala</button>
          <button data-cat="dinamis" className="tab-pill px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Dinamis / Variabel</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/90 p-3.5"><p className="text-[11px] text-slate-400">Tetap</p><p id="totTetap" className="font-mono font-bold text-teal-400 text-base mt-0.5">Rp 0</p></div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/90 p-3.5"><p className="text-[11px] text-slate-400">Berkala</p><p id="totBerkala" className="font-mono font-bold text-amber-400 text-base mt-0.5">Rp 0</p></div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/90 p-3.5"><p className="text-[11px] text-slate-400">Dinamis</p><p id="totDinamis" className="font-mono font-bold text-rose-400 text-base mt-0.5">Rp 0</p></div>
        </div>

        <div id="expenseList" className="space-y-2"></div>
      </section>

      {/* ---------- INCOMES ---------- */}
      <section id="view-incomes" className="view space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Kelola Pemasukan</h1>
            <p className="text-[13px] text-slate-400">Earned, Passive, dan Portfolio / Investment Income</p>
          </div>
          <button data-add="income" className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-sm font-bold rounded-xl px-4.5 h-10 shadow-lg shadow-teal-500/20">+ Catat Pemasukan</button>
        </div>

        {/* Panduan 3 Pilar Pemasukan */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </div>
              <h3 className="font-display font-bold text-xs sm:text-sm text-white">Panduan 3 Pilar Sumber Pemasukan Keuangan</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Diversifikasi Portfolio Income</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F6F5C]"></span>
                <strong className="text-teal-300 font-bold">1. Earned / Active Income</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Penghasilan dari pertukaran waktu &amp; tenaga secara langsung (Gaji Bulanan, Upah Harian, Bonus Kinerja, Freelance, Komisi).</p>
              <p className="text-teal-400/90 text-[10.5px] font-semibold pt-0.5">💡 Sumber modal awal untuk biaya hidup &amp; investasi.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4FA88E]"></span>
                <strong className="text-emerald-300 font-bold">2. Passive Income</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Penghasilan dari aset/sistem tanpa kehadiran fisik harian (Sewa Kos/Kontrakan, Royalti Karya, Lisensi Software, Bisnis Auto-pilot).</p>
              <p className="text-emerald-400/90 text-[10.5px] font-semibold pt-0.5">💡 Target kebebasan finansial jangka panjang.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-400/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7EC2AC]"></span>
                <strong className="text-teal-200 font-bold">3. Portfolio / Investment</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Imbal hasil dari pertumbuhan aset modal (Dividen Saham, Bunga Deposito, Gain Reksadana/Saham, Kupon Obligasi/ORI).</p>
              <p className="text-teal-300/90 text-[10.5px] font-semibold pt-0.5">💡 Hasil dari membiarkan uang bekerja untuk Anda.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="incomeSearch" type="text" placeholder="Cari pemasukan atau catatan..." className="w-full pl-9 pr-4 h-10 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400">Tampilkan:</span>
            <select id="incomePerPage" defaultValue="20" className="h-10 px-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-200 font-medium">
              <option value="10">10 data</option>
              <option value="20">20 data</option>
              <option value="50">50 data</option>
              <option value="all">Semua data</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" id="incomeCatTabs">
          <button data-cat="all" className="tab-pill active px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Semua</button>
          <button data-cat="earned" className="tab-pill px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Earned / Active</button>
          <button data-cat="passive" className="tab-pill px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Passive</button>
          <button data-cat="portfolio" className="tab-pill px-3.5 h-9 rounded-full text-[13px] font-medium border border-slate-700/80 bg-slate-900 text-slate-300">Portfolio / Investment</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/90 p-3.5"><p className="text-[11px] text-slate-400">Earned / Active Income</p><p id="totEarned" className="font-mono font-bold text-teal-400 text-base mt-0.5">Rp 0</p></div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/90 p-3.5"><p className="text-[11px] text-slate-400">Passive Income</p><p id="totPassive" className="font-mono font-bold text-emerald-400 text-base mt-0.5">Rp 0</p></div>
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800/90 p-3.5"><p className="text-[11px] text-slate-400">Portfolio / Investment Income</p><p id="totPortfolio" className="font-mono font-bold text-cyan-400 text-base mt-0.5">Rp 0</p></div>
        </div>

        <div id="incomeList" className="space-y-2"></div>
      </section>

      {/* ---------- ALLOCATIONS ---------- */}
      <section id="view-allocations" className="view space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Dana Alokasi & Target Saving</h1>
            <p className="text-[13px] text-slate-400">Dana Darurat, Asuransi, Investasi, dan Cadangan Likuiditas</p>
          </div>
          <button data-add="allocation" className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-sm font-bold rounded-xl px-4.5 h-10 shadow-lg shadow-teal-500/20">+ Catat Alokasi</button>
        </div>

        {/* Panduan Alokasi & Piramida Perencanaan */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </div>
              <h3 className="font-display font-bold text-xs sm:text-sm text-white">Panduan Alokasi &amp; Piramida Perencanaan Finansial</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Fondasi Finansial Sehat</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F6F5C]"></span>
                <strong className="text-teal-300 font-bold">1. Dana Darurat</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Bantal pengaman cair untuk kondisi krisis (PHK, musibah). Simpan di Reksadana Pasar Uang / Rekening Khusus.</p>
              <p className="text-teal-400/90 text-[10.5px] font-semibold pt-0.5">💡 Target: 3–6 bulan pengeluaran rutin.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4FA88E]"></span>
                <strong className="text-emerald-300 font-bold">2. Asuransi &amp; Proteksi</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Pengaman risiko kesehatan/jiwa (BPJS, Asuransi Kesehatan/Jiwa) agar tabungan &amp; aset tidak ludes saat sakit.</p>
              <p className="text-emerald-400/90 text-[10.5px] font-semibold pt-0.5">💡 Wajib dipunya sebelum investasi tinggi.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DE9518]"></span>
                <strong className="text-amber-300 font-bold">3. Investasi (Growth)</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Alokasi jangka panjang lawan inflasi (Saham, Reksadana, Obligasi, Emas) untuk kebebasan finansial.</p>
              <p className="text-amber-400/90 text-[10.5px] font-semibold pt-0.5">💡 Lakukan rutin tiap bulan (DCA).</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8471F]"></span>
                <strong className="text-rose-300 font-bold">4. Cadangan &amp; Target</strong>
              </div>
              <p className="text-slate-400 text-[11px]">Tabungan target khusus jangka pendek/menengah (Dana Liburan, DP Rumah/Motor, Hari Raya, Gadget).</p>
              <p className="text-rose-400/90 text-[10.5px] font-semibold pt-0.5">💡 Pisahkan agar tak terpakai harian.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="allocationSearch" type="text" placeholder="Cari dana alokasi atau catatan..." className="w-full pl-9 pr-4 h-10 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400">Tampilkan:</span>
            <select id="allocationPerPage" defaultValue="20" className="h-10 px-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-200 font-medium">
              <option value="10">10 data</option>
              <option value="20">20 data</option>
              <option value="50">50 data</option>
              <option value="all">Semua data</option>
            </select>
          </div>
        </div>

        <div id="allocationCards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"></div>
        <div id="allocationList" className="space-y-2"></div>
      </section>

      {/* ---------- REPORTS ---------- */}
      <section id="view-reports" className="view space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Laporan Keuangan Rinci</h1>
            <p className="text-[13px] text-slate-400">Ringkasan interaktif untuk periode terpilih — dapat diekspor ke PDF.</p>
          </div>
          <button id="exportPdfBtn" className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-sm font-bold rounded-xl px-4.5 h-10 shadow-lg shadow-rose-600/30 transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3"><path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
            Export PDF
          </button>
        </div>

        <div id="reportContent" className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 md:p-7 space-y-6 text-slate-100 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div>
                <p className="font-display font-bold text-white text-base">CashMoneyManagement</p>
                <p className="text-[12px] text-slate-400">Laporan Finansial Pribadi & Keluarga</p>
              </div>
            </div>
            <p id="reportPeriod" className="font-mono text-[12.5px] text-slate-400 text-right"></p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"><p className="text-[11px] text-slate-400">Total Pemasukan</p><p id="repIncome" className="font-mono font-bold text-emerald-400 text-lg mt-0.5">Rp 0</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"><p className="text-[11px] text-slate-400">Total Pengeluaran</p><p id="repExpense" className="font-mono font-bold text-rose-400 text-lg mt-0.5">Rp 0</p></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"><p className="text-[11px] text-slate-400">Total Alokasi</p><p id="repAllocation" className="font-mono font-bold text-amber-400 text-lg mt-0.5">Rp 0</p></div>
            <div className="rounded-xl border border-teal-500/40 p-3.5 bg-gradient-to-r from-teal-900 to-slate-900"><p className="text-[11px] text-teal-300 font-medium">Saldo Akhir</p><p id="repBalance" className="font-mono font-bold text-white text-lg mt-0.5">Rp 0</p></div>
          </div>

          <div id="reportHealthContainer" className="space-y-4"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <h3 className="font-display font-bold text-[14px] text-white mb-3">Pengeluaran per Kategori</h3>
              <div className="h-56"><canvas id="chartRepExpense"></canvas></div>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <h3 className="font-display font-bold text-[14px] text-white mb-3">Pemasukan per Kategori</h3>
              <div className="h-56"><canvas id="chartRepIncome"></canvas></div>
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <h3 className="font-display font-bold text-[14px] text-white mb-3">Tren Bulanan (6 Bulan Terakhir)</h3>
            <div className="h-64"><canvas id="chartRepTrend"></canvas></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="overflow-x-auto">
              <h3 className="font-display font-bold text-[14px] text-white mb-2">Rincian Pengeluaran</h3>
              <table className="w-full text-[12.5px] min-w-[260px]"><tbody id="repExpenseTable"></tbody></table>
            </div>
            <div className="overflow-x-auto">
              <h3 className="font-display font-bold text-[14px] text-white mb-2">Rincian Pemasukan</h3>
              <table className="w-full text-[12.5px] min-w-[260px]"><tbody id="repIncomeTable"></tbody></table>
            </div>
            <div className="overflow-x-auto">
              <h3 className="font-display font-bold text-[14px] text-white mb-2">Rincian Alokasi Dana</h3>
              <table className="w-full text-[12.5px] min-w-[260px]"><tbody id="repAllocationTable"></tbody></table>
            </div>
          </div>

          <div className="rounded-xl bg-teal-950/40 border border-teal-500/30 p-4.5 space-y-2">
            <h3 className="font-display font-bold text-[14px] text-teal-300">Ringkasan & Saran Perencanaan Finansial</h3>
            <ul id="repSuggestions" className="space-y-1.5 text-[13px] text-slate-300 list-disc list-inside"></ul>
          </div>
        </div>
      </section>

    </main>
  </div>

  {/* ============ MOBILE BOTTOM NAV ============ */}
  <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex items-stretch h-16 px-1">
    <a href="/dashboard" data-view="dashboard" className="nav-link-mobile active flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
      <span className="text-[10px] font-medium">Dashboard</span>
    </a>
    <a href="/expenses" data-view="expenses" className="nav-link-mobile flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h18M7 15h4"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
      <span className="text-[10px] font-medium">Keluar</span>
    </a>
    <a href="/incomes" data-view="incomes" className="nav-link-mobile flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      <span className="text-[10px] font-medium">Masuk</span>
    </a>
    <a href="/allocations" data-view="allocations" className="nav-link-mobile flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2v10l7 7"/></svg>
      <span className="text-[10px] font-medium">Alokasi</span>
    </a>
    <a href="/reports" data-view="reports" className="nav-link-mobile flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 17V9M13 17V5M18 17v-5"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      <span className="text-[10px] font-medium">Laporan</span>
    </a>
  </nav>
</div>

{/* ============ QUICK ADD CHOOSER ============ */}
<div id="quickAddModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 items-end md:items-center justify-center">
  <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-t-2xl md:rounded-2xl w-full md:w-84 p-5 space-y-3 shadow-2xl">
    <p className="font-display font-bold text-base px-1">Mau catat transaksi apa?</p>
    <button data-add="expense" className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition">
      <span className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="2.5"><path d="M5 12h14"/></svg></span>
      <span><span className="block text-sm font-bold text-white">Catat Pengeluaran</span><span className="block text-[12px] text-slate-400">Tetap, berkala, atau dinamis</span></span>
    </button>
    <button data-add="income" className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition">
      <span className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span>
      <span><span className="block text-sm font-bold text-white">Catat Pemasukan</span><span className="block text-[12px] text-slate-400">Earned, passive, atau investment</span></span>
    </button>
    <button data-add="allocation" className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition">
      <span className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5"><path d="M12 2v20"/></svg></span>
      <span><span className="block text-sm font-bold text-white">Dana Alokasi & Target</span><span className="block text-[12px] text-slate-400">Darurat, asuransi, investasi, cadangan</span></span>
    </button>
    <button id="quickAddCancel" className="w-full text-center py-2.5 text-sm font-semibold text-slate-400 hover:text-white">Batal</button>
  </div>
</div>

{/* ============ LOGIN MODAL ============ */}
<div id="loginModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 items-center justify-center p-4">
  <form id="loginForm" className="bg-slate-900/95 border border-slate-700/80 text-slate-100 rounded-3xl w-full max-w-md p-7 md:p-8 space-y-5 shadow-2xl shadow-teal-950/50 relative overflow-hidden backdrop-blur-2xl">
    {/* Decorative background glow */}
    <div className="absolute -top-16 -right-16 w-44 h-44 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div className="flex items-start justify-between relative z-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/25 shrink-0 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        </div>
        <div>
          <h3 className="font-display font-extrabold text-xl text-white tracking-tight">Selamat Datang Kembali</h3>
          <p className="text-xs text-slate-400 mt-0.5">Kelola akun finansial pribadi &amp; keluarga</p>
        </div>
      </div>
      <button type="button" id="loginClose" className="modal-close w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition text-lg leading-none shrink-0 ml-2">×</button>
    </div>

    <div className="space-y-4 relative z-10 pt-1">
      <div>
        <label className="text-[12.5px] font-bold text-slate-300">Alamat Email</label>
        <div className="relative mt-1.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <input id="login_email" type="email" required className="w-full pl-10 pr-4 h-12 border border-slate-800 rounded-xl text-sm bg-slate-950/80 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" placeholder="nama@email.com" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[12.5px] font-bold text-slate-300">Kata Sandi</label>
        </div>
        <div className="relative mt-1.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <input id="login_password" type="password" required className="w-full pl-10 pr-10 h-12 border border-slate-800 rounded-xl text-sm bg-slate-950/80 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" placeholder="••••••••" />
          <button type="button" data-toggle-password="login_password" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition" title="Tampilkan/Sembunyikan password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11.5px] text-teal-300 font-medium relative z-10">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-teal-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
      <span>Enkripsi 256-bit standar industri &amp; data aman tersimpan.</span>
    </div>

    <div className="space-y-3 pt-1 relative z-10">
      <div className="flex items-center gap-3">
        <button type="button" id="loginCancel" className="text-slate-300 text-sm font-semibold px-4 h-12 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition">Batal</button>
        <button type="submit" className="flex-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2">
          <span>Masuk ke Akun</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center font-medium pt-1">
        Belum memiliki akun?{' '}
        <button type="button" id="registerLink" className="text-teal-400 font-bold hover:underline ml-0.5">Daftar Akun Baru</button>
      </p>
    </div>
  </form>
</div>

{/* ============ REGISTER MODAL ============ */}
<div id="registerModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 items-center justify-center p-4 overflow-y-auto">
  <form id="registerForm" className="bg-slate-900/95 border border-slate-700/80 text-slate-100 rounded-3xl w-full max-w-lg p-7 md:p-8 space-y-5 shadow-2xl shadow-teal-950/50 relative overflow-hidden backdrop-blur-2xl max-h-[92vh] overflow-y-auto">
    {/* Decorative background glow */}
    <div className="absolute -top-16 -left-16 w-44 h-44 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div className="flex items-start justify-between relative z-10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/25 shrink-0 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </div>
        </div>
        <div>
          <h3 className="font-display font-extrabold text-xl text-white tracking-tight">Daftar Akun Baru</h3>
          <p className="text-xs text-slate-400 mt-0.5">Bergabung gratis &amp; mulai atur target keuangan</p>
        </div>
      </div>
      <button type="button" id="registerClose" className="modal-close w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition text-lg leading-none shrink-0 ml-2">×</button>
    </div>

    <div className="space-y-3.5 relative z-10 pt-1">
      <div>
        <label className="text-[12.5px] font-bold text-slate-300">Nama Lengkap</label>
        <div className="relative mt-1.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </span>
          <input id="register_name" type="text" required className="w-full pl-10 pr-4 h-12 border border-slate-800 rounded-xl text-sm bg-slate-950/80 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" placeholder="Contoh: Ahmad Ariff" />
        </div>
      </div>

      <div>
        <label className="text-[12.5px] font-bold text-slate-300">Alamat Email</label>
        <div className="relative mt-1.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <input id="register_email" type="email" required className="w-full pl-10 pr-4 h-12 border border-slate-800 rounded-xl text-sm bg-slate-950/80 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" placeholder="nama@email.com" />
        </div>
      </div>

      <div>
        <label className="text-[12.5px] font-bold text-slate-300">Kata Sandi</label>
        <div className="relative mt-1.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <input id="register_password" type="password" required className="w-full pl-10 pr-10 h-12 border border-slate-800 rounded-xl text-sm bg-slate-950/80 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" placeholder="Minimal 8 karakter" />
          <button type="button" data-toggle-password="register_password" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition" title="Tampilkan/Sembunyikan password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <div>
        <label className="text-[12.5px] font-bold text-slate-300">Konfirmasi Kata Sandi</label>
        <div className="relative mt-1.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </span>
          <input id="register_password_confirmation" type="password" required className="w-full pl-10 pr-10 h-12 border border-slate-800 rounded-xl text-sm bg-slate-950/80 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all" placeholder="Ulangi kata sandi" />
          <button type="button" data-toggle-password="register_password_confirmation" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition" title="Tampilkan/Sembunyikan password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 py-1 relative z-10">
      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
        <span className="text-emerald-400 font-bold">✓</span> Budgeting 3 Cat
      </div>
      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
        <span className="text-emerald-400 font-bold">✓</span> Target Savings
      </div>
      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
        <span className="text-emerald-400 font-bold">✓</span> Cloud Sync
      </div>
    </div>

    <div className="space-y-3 pt-1 relative z-10">
      <div className="flex items-center gap-3">
        <button type="button" id="registerCancel" className="text-slate-300 text-sm font-semibold px-4 h-12 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 transition">Batal</button>
        <button type="submit" className="flex-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl h-12 shadow-lg shadow-teal-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2">
          <span>Daftar Akun Baru</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center font-medium pt-1">
        Sudah memiliki akun?{' '}
        <button type="button" id="registerSwitchLogin" className="text-teal-400 font-bold hover:underline ml-0.5">Masuk ke Akun</button>
      </p>
    </div>
  </form>
</div>

{/* ============ PROFILE MODAL ============ */}
<div id="profileModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[55] items-center justify-center overflow-y-auto py-6">
  <form id="profileForm" className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-white">Profil Pengguna</h3>
          <p className="text-xs text-slate-400">Kelola identitas dan preferensi akun Anda</p>
        </div>
      </div>
      <button type="button" id="profClose" className="modal-close text-slate-400 hover:text-white text-2xl leading-none">×</button>
    </div>

    <div id="profWarningBanner" className="hidden p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
      <p className="font-bold flex items-center gap-1.5 text-amber-200">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
        Profil Belum Lengkap!
      </p>
      <p>Lengkapi nomor telepon dan status pekerjaan terlebih dahulu untuk membuka akses penuh ke semua menu aplikasi.</p>
    </div>

    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[12.5px] font-medium text-slate-300">Nama Lengkap</label>
          <input id="prof_name" type="text" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="Nama lengkap" />
        </div>
        <div>
          <label className="text-[12.5px] font-medium text-slate-300">Email Akun</label>
          <input id="prof_email" type="email" disabled className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950/60 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[12.5px] font-medium text-slate-300">Nomor Telepon / WA <span className="text-rose-400">*</span></label>
          <input id="prof_phone" type="tel" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="081234567890" />
        </div>
        <div>
          <label className="text-[12.5px] font-medium text-slate-300">Status Pekerjaan <span className="text-rose-400">*</span></label>
          <select id="prof_employment" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950 text-white focus:border-teal-500">
            <option value="karyawan">Karyawan</option>
            <option value="wirausaha">Wirausaha / Business Owner</option>
            <option value="freelance">Freelancer / Professional</option>
            <option value="pelajar">Pelajar / Mahasiswa</option>
            <option value="lainnya">Lainnya</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[12.5px] font-medium text-slate-300">Jabatan / Profesi</label>
          <input id="prof_job" type="text" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="mis. Software Engineer" />
        </div>
        <div>
          <label className="text-[12.5px] font-medium text-slate-300">Nama Perusahaan / Usaha</label>
          <input id="prof_company" type="text" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="mis. PT Maju Bersama" />
        </div>
      </div>

      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Perkiraan Penghasilan Bulanan (Rp)</label>
        <input id="prof_income" type="number" min="0" step="100000" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3.5 text-sm bg-slate-950 text-white font-mono focus:border-teal-500" placeholder="0" />
      </div>
    </div>

    <div className="flex gap-3 pt-2">
      <button type="button" id="profCancel" className="px-5 h-11 rounded-xl border border-slate-700 bg-slate-800/80 text-sm font-medium text-slate-300 hover:text-white transition">Batal</button>
      <button type="submit" className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl h-11 transition shadow-lg shadow-teal-500/25">Simpan Profil</button>
    </div>
  </form>
</div>

{/* ============ EXPENSE FORM MODAL ============ */}
<div id="expenseModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 items-end md:items-center justify-center overflow-y-auto py-6">
  <form id="expenseForm" className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-t-2xl md:rounded-2xl w-full md:w-[440px] p-5 space-y-3.5 max-h-[92vh] overflow-y-auto shadow-2xl">
    <div className="flex items-center justify-between">
      <h3 className="font-display font-bold text-base text-white">Catat Pengeluaran</h3>
      <button type="button" className="modal-close text-slate-400 hover:text-white text-xl leading-none">×</button>
    </div>
    <input type="hidden" id="exp_id" />
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Jenis Pengeluaran</label>
      <select id="exp_category" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500">
        <option value="tetap">Tetap (rutin, jumlah konstan)</option>
        <option value="berkala">Berkala (di luar siklus bulanan)</option>
        <option value="dinamis">Dinamis / Variabel</option>
      </select>
      <div id="exp_cat_help" className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11.5px] text-slate-300"></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Kategori</label>
        <input id="exp_sub" list="exp_sub_list" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="Pilih / ketik" />
        <datalist id="exp_sub_list"></datalist>
      </div>
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Frekuensi</label>
        <select id="exp_freq" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500"></select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Jumlah (Rp)</label>
        <input id="exp_amount" type="text" inputMode="numeric" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm font-mono bg-slate-950 text-white focus:border-teal-500" placeholder="0" />
      </div>
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Tanggal</label>
        <input id="exp_date" type="date" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" />
      </div>
    </div>
    <div id="exp_status_wrap" className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Status Bayar</label>
        <select id="exp_status" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500">
          <option value="unpaid">Belum Dibayar</option>
          <option value="paid">Sudah Dibayar</option>
        </select>
      </div>
      <div className="flex items-end pb-2.5">
        <label className="flex items-center gap-2 text-[12.5px] text-slate-300 cursor-pointer">
          <input id="exp_estimate" type="checkbox" className="w-4 h-4 rounded border-slate-800 accent-teal-500 bg-slate-950" />
          Estimasi (belum aktual)
        </label>
      </div>
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Catatan (opsional)</label>
      <input id="exp_note" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="mis. bayar via transfer BCA" />
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Lampiran bukti (opsional)</label>
      <label className="mt-1 flex flex-col items-center gap-1.5 w-full cursor-pointer border-2 border-dashed border-slate-800 rounded-xl py-3 px-4 hover:border-teal-500/50 hover:bg-slate-950/60 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span className="text-[12px] text-slate-300">Pilih gambar atau PDF <span className="text-teal-400 font-semibold">Browse</span></span>
        <span className="text-[10.5px] text-slate-500">Maks 10 MB · JPG, PNG, WebP, PDF</span>
        <input id="exp_attachment" type="file" accept="image/*,application/pdf" className="sr-only" />
      </label>
      <div id="expAttachPreview" className="mt-2 hidden"></div>
    </div>
    <div className="flex gap-2 pt-1">
      <button type="button" id="exp_delete" className="hidden items-center gap-1.5 text-rose-400 text-sm font-semibold px-4 h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        Hapus
      </button>
      <button type="submit" className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-sm font-bold rounded-xl h-11 shadow-lg shadow-teal-500/25 transition">Simpan</button>
    </div>
  </form>
</div>

{/* ============ INCOME FORM MODAL ============ */}
<div id="incomeModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 items-end md:items-center justify-center overflow-y-auto py-6">
  <form id="incomeForm" className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-t-2xl md:rounded-2xl w-full md:w-[440px] p-5 space-y-3.5 max-h-[92vh] overflow-y-auto shadow-2xl">
    <div className="flex items-center justify-between">
      <h3 className="font-display font-bold text-base text-white">Catat Pemasukan</h3>
      <button type="button" className="modal-close text-slate-400 hover:text-white text-xl leading-none">×</button>
    </div>
    <input type="hidden" id="inc_id" />
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Jenis Pemasukan</label>
      <select id="inc_category" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500">
        <option value="earned">Earned / Active Income</option>
        <option value="passive">Passive Income</option>
        <option value="portfolio">Portfolio / Investment Income</option>
      </select>
      <div id="inc_cat_help" className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11.5px] text-slate-300"></div>
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Kategori</label>
      <input id="inc_sub" list="inc_sub_list" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="Pilih / ketik" />
      <datalist id="inc_sub_list"></datalist>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Jumlah (Rp)</label>
        <input id="inc_amount" type="text" inputMode="numeric" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm font-mono bg-slate-950 text-white focus:border-teal-500" placeholder="0" />
      </div>
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Tanggal</label>
        <input id="inc_date" type="date" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" />
      </div>
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Catatan (opsional)</label>
      <input id="inc_note" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" />
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Lampiran bukti (opsional)</label>
      <label className="mt-1 flex flex-col items-center gap-1.5 w-full cursor-pointer border-2 border-dashed border-slate-800 rounded-xl py-3 px-4 hover:border-teal-500/50 hover:bg-slate-950/60 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span className="text-[12px] text-slate-300">Pilih gambar atau PDF <span className="text-teal-400 font-semibold">Browse</span></span>
        <span className="text-[10.5px] text-slate-500">Maks 10 MB · JPG, PNG, WebP, PDF</span>
        <input id="inc_attachment" type="file" accept="image/*,application/pdf" className="sr-only" />
      </label>
      <div id="incAttachPreview" className="mt-2 hidden"></div>
    </div>
    <div className="flex gap-2 pt-1">
      <button type="button" id="inc_delete" className="hidden text-rose-400 text-sm font-semibold px-4 h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20">Hapus</button>
      <button type="submit" className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-sm font-bold rounded-xl h-11 shadow-lg shadow-teal-500/25 transition">Simpan</button>
    </div>
  </form>
</div>

{/* ============ ALLOCATION FORM MODAL ============ */}
<div id="allocationModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 items-end md:items-center justify-center overflow-y-auto py-6">
  <form id="allocationForm" className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-t-2xl md:rounded-2xl w-full md:w-[440px] p-5 space-y-3.5 max-h-[92vh] overflow-y-auto shadow-2xl">
    <div className="flex items-center justify-between">
      <h3 className="font-display font-bold text-base text-white">Catat Dana Alokasi</h3>
      <button type="button" className="modal-close text-slate-400 hover:text-white text-xl leading-none">×</button>
    </div>
    <input type="hidden" id="alc_id" />
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Jenis Alokasi</label>
      <select id="alc_category" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500">
        <option value="darurat">Dana Darurat (Emergency Fund)</option>
        <option value="asuransi">Asuransi (Insurance)</option>
        <option value="investasi">Investasi</option>
        <option value="cadangan">Dana Cadangan / Likuiditas Tambahan</option>
      </select>
      <div id="alc_cat_help" className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11.5px] text-slate-300"></div>
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Kategori</label>
      <input id="alc_sub" list="alc_sub_list" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" placeholder="Pilih / ketik" />
      <datalist id="alc_sub_list"></datalist>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Jumlah Terkumpul (Rp)</label>
        <input id="alc_amount" type="text" inputMode="numeric" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm font-mono bg-slate-950 text-white focus:border-teal-500" placeholder="0" />
      </div>
      <div>
        <label className="text-[12.5px] font-medium text-slate-300">Target Dana (Rp)</label>
        <input id="alc_target" type="text" inputMode="numeric" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm font-mono bg-slate-950 text-white focus:border-teal-500" placeholder="Target Rp (opsional)" />
      </div>
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Tanggal</label>
      <input id="alc_date" type="date" required className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" />
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Catatan (opsional)</label>
      <input id="alc_note" className="w-full mt-1 border border-slate-800 rounded-xl h-11 px-3 text-sm bg-slate-950 text-white focus:border-teal-500" />
    </div>
    <div>
      <label className="text-[12.5px] font-medium text-slate-300">Lampiran bukti (opsional)</label>
      <label className="mt-1 flex flex-col items-center gap-1.5 w-full cursor-pointer border-2 border-dashed border-slate-800 rounded-xl py-3 px-4 hover:border-teal-500/50 hover:bg-slate-950/60 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span className="text-[12px] text-slate-300">Pilih gambar atau PDF <span className="text-teal-400 font-semibold">Browse</span></span>
        <span className="text-[10.5px] text-slate-500">Maks 10 MB · JPG, PNG, WebP, PDF</span>
        <input id="alc_attachment" type="file" accept="image/*,application/pdf" className="sr-only" />
      </label>
      <div id="alcAttachPreview" className="mt-2 hidden"></div>
    </div>
    <div className="flex gap-2 pt-1">
      <button type="button" id="alc_delete" className="hidden text-rose-400 text-sm font-semibold px-4 h-11 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20">Hapus</button>
      <button type="submit" className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-sm font-bold rounded-xl h-11 shadow-lg shadow-teal-500/25 transition">Simpan</button>
    </div>
  </form>
</div>

{/* ============ ATTACHMENT LIGHTBOX MODAL ============ */}
<div id="attachmentModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] items-center justify-center p-4">
  <div className="bg-slate-900 border border-slate-700/80 text-slate-100 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
    {/* Header */}
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </div>
        <div>
          <p className="font-display font-bold text-[15px] text-white">Pratinjau Bukti Transaksi</p>
          <p className="text-[11.5px] text-slate-400">Klik untuk perbesar atau buka di tab baru</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a id="attachOpenTab" href="#" target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-teal-300 bg-teal-500/20 border border-teal-500/30 rounded-lg px-3 py-1.5 hover:bg-teal-500/30 transition">Buka Tab Baru ↗</a>
        <button type="button" onClick={() => window.__cashApp?.closeAttachmentPreview()} className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition text-lg leading-none">×</button>
      </div>
    </div>
    {/* Preview area */}
    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 min-h-[260px]">
      <img
        id="attachPreviewImg"
        src=""
        alt="Bukti"
        className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-xl"
        style={{display: 'none'}}
        onError={(e) => { e.target.style.display='none'; }}
      />
      <iframe
        id="attachPreviewPdf"
        src=""
        title="PDF Preview"
        className="w-full rounded-xl border border-slate-800 bg-slate-900"
        style={{display: 'none', height: '65vh'}}
      />
    </div>
  </div>
</div>

{/* ============ CONFIRM DELETE ============ */}
<div id="confirmModal" className="modal-backdrop fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center">
  <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-[320px] p-6 text-center space-y-4 shadow-2xl">
    <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4h6v2"/>
      </svg>
    </div>
    <div>
      <p className="font-display font-bold text-base text-white">Hapus data ini?</p>
      <p className="text-[12.5px] text-slate-400 mt-1">Data yang dihapus tidak dapat dikembalikan.</p>
    </div>
    <div className="flex gap-2.5">
      <button id="confirmCancel" className="flex-1 h-11 rounded-xl border border-slate-700 bg-slate-800/80 text-sm font-medium text-slate-300 hover:text-white transition">Batal</button>
      <button id="confirmOk" className="flex-1 h-11 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-sm font-bold transition shadow-lg shadow-rose-600/30">Ya, Hapus</button>
    </div>
  </div>
</div>

{/* toast */}
<div id="toastWrap" className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2"></div>

    </div>
  );
}
