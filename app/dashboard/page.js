'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEYS = {
  expenses: 'cashmoney:expenses',
  incomes: 'cashmoney:incomes',
  allocations: 'cashmoney:allocations',
};

const parseStoredItems = (key) => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatRupiah = (value) => {
  const amount = Number(value || 0);
  return 'Rp ' + amount.toLocaleString('id-ID');
};

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
};

export default function DashboardPage() {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setExpenses(parseStoredItems(STORAGE_KEYS.expenses));
    setIncomes(parseStoredItems(STORAGE_KEYS.incomes));
    setAllocations(parseStoredItems(STORAGE_KEYS.allocations));
  }, []);

  const totalIncome = useMemo(
    () => incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [incomes]
  );

  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  const totalAllocation = useMemo(
    () => allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [allocations]
  );

  const netBalance = totalIncome - totalExpense - totalAllocation;

  const handleDeleteExpense = (id) => {
    if (!window.confirm('Hapus pengeluaran ini?')) return;
    const nextExpenses = expenses.filter((item) => item.id !== id);
    setExpenses(nextExpenses);
    window.localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(nextExpenses));
    setToast('Pengeluaran berhasil dihapus.');
    setTimeout(() => setToast(''), 2600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Ringkasan Keuangan</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Pantau pemasukan, pengeluaran, alokasi dana, dan saldo bersih dalam satu tampilan yang bersih.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-teal-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-teal-600">Periode</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Bulan ini</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              onClick={() => window.location.assign('/expenses')}
            >
              + Tambah Pengeluaran
            </button>
          </div>
        </div>

        {toast ? (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 shadow-sm">
            {toast}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pemasukan</p>
            <p className="mt-3 text-2xl font-semibold text-teal-700">{formatRupiah(totalIncome)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pengeluaran</p>
            <p className="mt-3 text-2xl font-semibold text-rust-600 text-rust-700">{formatRupiah(totalExpense)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Alokasi Dana</p>
            <p className="mt-3 text-2xl font-semibold text-amber-600">{formatRupiah(totalAllocation)}</p>
          </div>
          <div className="rounded-3xl border border-teal-700 bg-teal-700 p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-teal-100">Saldo Bersih</p>
            <p className="mt-3 text-2xl font-semibold">{formatRupiah(netBalance)}</p>
            <p className="mt-2 text-xs text-teal-100/80">
              {netBalance >= 0 ? 'Surplus' : 'Defisit'}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Ringkasan Pengeluaran</h2>
                <p className="mt-1 text-sm text-slate-500">Pengeluaran terbaru dan kontrol hapus langsung dari dashboard.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-600">
                {expenses.length} item
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {expenses.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  Belum ada pengeluaran tercatat untuk periode ini.
                </div>
              ) : (
                expenses.slice(0, 6).map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.subcategory || 'Pengeluaran tanpa nama'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.category ? `${item.category.charAt(0).toUpperCase() + item.category.slice(1)}` : 'Kategori tidak diketahui'} · {formatDate(item.date)}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <p className="text-base font-semibold text-rust-700">- {formatRupiah(item.amount)}</p>
                      <button
                        type="button"
                        className="rounded-2xl border border-rust-200 bg-white px-3 py-2 text-sm font-semibold text-rust-700 transition hover:bg-rust-50"
                        onClick={() => handleDeleteExpense(item.id)}
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Detail Ringkas</h2>
              <p className="mt-1 text-sm text-slate-500">Visualisasi jumlah berdasarkan kategori pengeluaran.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Pengeluaran Tetap</span>
                  <strong>{formatRupiah(expenses.filter((item) => item.category === 'tetap').reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Pengeluaran Berkala</span>
                  <strong>{formatRupiah(expenses.filter((item) => item.category === 'berkala').reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Pengeluaran Dinamis</span>
                  <strong>{formatRupiah(expenses.filter((item) => item.category === 'dinamis').reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
