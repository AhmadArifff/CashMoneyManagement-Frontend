'use client';

import React, { useState } from 'react';

export default function LandingPage({ onOpenLogin, onOpenRegister }) {
  // Live interactive calculator state for potential users
  const [incomeInput, setIncomeInput] = useState(10000000);

  // Financial splits
  const needs = Math.round(incomeInput * 0.5);
  const wants = Math.round(incomeInput * 0.3);
  const savings = Math.round(incomeInput * 0.2);
  const emergencyTarget = Math.round(needs * 6);

  const fmt = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Gradients & Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-[-100px] left-[10%] w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[140px]"></div>
        <div className="absolute top-[100px] right-[10%] w-[450px] h-[450px] bg-emerald-500/15 rounded-full blur-[130px]"></div>
        <div className="absolute top-[300px] left-[35%] w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[150px]"></div>
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                CashMoney<span className="text-teal-400 font-extrabold">.</span>
              </span>
              <span className="block text-[10px] text-teal-400 font-mono tracking-wider uppercase font-semibold">Smart Financial System</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-teal-400 transition-colors">Fitur Unggulan</a>
            <a href="#calculator" className="hover:text-teal-400 transition-colors">Simulasi Keuangan</a>
            <a href="#benefits" className="hover:text-teal-400 transition-colors">Keunggulan</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-700/60"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 hover:from-teal-300 hover:to-emerald-300 shadow-lg shadow-teal-500/25 transition-all transform hover:-translate-y-0.5"
            >
              Mulai Gratis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Aplikasi Manajemen Keuangan Masa Kini 2026
            </div>

            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              Kelola Keuangan Modern <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Cerdas, Terukur, & Bebas Cemas
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Kendalikan arus kas pribadi & keluarga Anda. Catat pengeluaran 3-kategori, alokasikan dana darurat dengan progress bar otomatis, dan dapatkan pengingat tagihan sebelum jatuh tempo.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-slate-900 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 hover:from-teal-300 hover:to-emerald-300 shadow-xl shadow-teal-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 text-base"
              >
                Coba Sekarang — Gratis
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <a
                href="#calculator"
                className="w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-center gap-2 text-base backdrop-blur-md"
              >
                Coba Simulasi Keuangan
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="pt-8 grid grid-cols-3 gap-4 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-teal-400">100%</p>
                <p className="text-xs text-slate-400 mt-0.5">Akurat & Terstruktur</p>
              </div>
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-emerald-400">3 Cat</p>
                <p className="text-xs text-slate-400 mt-0.5">Budgeting Otomatis</p>
              </div>
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-teal-300">Fast</p>
                <p className="text-xs text-slate-400 mt-0.5">Bukti Kwitansi Cloud</p>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl shadow-teal-950/50 space-y-5 transform hover:scale-[1.01] transition-all">
              {/* Card Top */}
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-bold text-slate-900">
                    AA
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Ringkasan Finansial</p>
                    <p className="text-xs text-slate-400">Juli 2026</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Surplus +35%
                </span>
              </div>

              {/* Total Balance Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900/40 to-slate-800/80 border border-teal-500/30">
                <p className="text-xs text-teal-300 font-medium">Total Saldo Bersih</p>
                <p className="font-mono text-2xl font-extrabold text-white mt-1">Rp 18.750.000</p>
                <div className="mt-3 flex items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-400">▲ Masuk: Rp 25jt</span>
                  <span className="text-rose-400">▼ Keluar: Rp 6.25jt</span>
                </div>
              </div>

              {/* Allocation Progress Mockup */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">Dana Darurat 6 Bulan</span>
                  <span className="text-teal-400 font-mono font-bold">75% (Rp 15jt / 20jt)</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/80">
                  <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full w-[75%] transition-all"></div>
                </div>
              </div>

              {/* Unpaid Bill Alert Preview */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Sewa Rumah & Utilitas</p>
                    <p className="text-[11px] text-amber-300 font-mono">Jatuh tempo 2 hari lagi · Rp 3.500.000</p>
                  </div>
                </div>
                <button type="button" onClick={onOpenLogin} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors">
                  ✓ Lunas
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="relative z-10 py-20 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-mono font-semibold text-teal-400 tracking-wider uppercase">Fitur Dirancang Untuk Hasil Nyata</h2>
            <p className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Semua Alat Manajemen Keuangan dalam Satu Tempat
            </p>
            <p className="text-slate-400 text-base">
              Tanpa rumus Excel yang rumit. Sistem kami mengotomatisasi pengkategorian, perhitungan target, dan pelaporan keuangan Anda.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xl font-bold">
                📊
              </div>
              <h3 className="text-lg font-bold text-white">Metode 3-Kategori Budgeting</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Pisahkan pengeluaran menjadi <strong>Tetap</strong>, <strong>Berkala</strong>, dan <strong>Dinamis</strong>. Menghindari kebocoran kas tanpa mengorbankan kenyamanan hidup.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
                🎯
              </div>
              <h3 className="text-lg font-bold text-white">Target Dana Alokasi & Progress Bar</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Set target tabungan dana darurat, premi asuransi, & investasi. Pantau persentase ketercapaian dan sisa target secara otomatis.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl font-bold">
                🔔
              </div>
              <h3 className="text-lg font-bold text-white">Notifikasi Tagihan & Akses Lunas 1-Klik</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Dapatkan notifikasi tagihan yang belum dibayar di header app. Tandai lunas langsung dari dropdown tanpa berpindah halaman.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl font-bold">
                📎
              </div>
              <h3 className="text-lg font-bold text-white">Bukti Kwitansi Gambar & PDF Cloud</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Unggah bukti pembayaran berupa gambar atau berkas PDF. Tersimpan aman di Supabase Storage dengan preview instan sekali klik.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl font-bold">
                🔍
              </div>
              <h3 className="text-lg font-bold text-white">Pencarian & Pagination Fleksibel</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cari transaksi berdasarkan kata kunci atau catatan. Atur tampilan data 10, 20, 50, atau tampilkan seluruh data sesuai keinginan Anda.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 transition-all hover:-translate-y-1 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xl font-bold">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-white">Profile Guard & Proteksi Keamanan</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Lengkapi profil finansial untuk kalkulasi rekomendasi yang presisi. Data tersimpan terenkripsi dengan proteksi otentikasi Sanctum.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Financial Calculator Section */}
      <section id="calculator" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800/90 to-teal-950/40 rounded-3xl border border-teal-500/30 p-8 sm:p-12 shadow-2xl space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-semibold">
              Kalkulator Keuangan Interaktif
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white">Simulasikan Pembagian Penghasilan Anda</h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Masukkan estimasi penghasilan bulanan Anda di bawah ini dan lihat rekomendasi alokasi ideal 50/30/20 & target dana darurat:
            </p>
          </div>

          <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <label htmlFor="landingIncomeSlider" className="text-slate-200">Penghasilan Bulanan (Rp)</label>
                <span className="font-mono text-lg font-bold text-teal-400">{fmt(incomeInput)}</span>
              </div>
              <input
                id="landingIncomeSlider"
                type="range"
                min="2000000"
                max="50000000"
                step="500000"
                value={incomeInput}
                onChange={(e) => setIncomeInput(Number(e.target.value))}
                className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-400 border border-slate-700"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Rp 2.000.000</span>
                <span>Rp 25.000.000</span>
                <span>Rp 50.000.000</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center space-y-1">
                <p className="text-xs text-slate-400 font-medium">Kebutuhan Pokok (50%)</p>
                <p className="font-mono text-lg font-bold text-emerald-400">{fmt(needs)}</p>
                <p className="text-[11px] text-slate-500">Sewa, Makan, Utilitas</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center space-y-1">
                <p className="text-xs text-slate-400 font-medium">Keinginan & Lifestyle (30%)</p>
                <p className="font-mono text-lg font-bold text-amber-400">{fmt(wants)}</p>
                <p className="text-[11px] text-slate-500">Hiburan & Hobbi</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center space-y-1">
                <p className="text-xs text-slate-400 font-medium">Tabungan & Alokasi (20%)</p>
                <p className="font-mono text-lg font-bold text-teal-300">{fmt(savings)}</p>
                <p className="text-[11px] text-slate-500">Investasi & Asuransi</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs sm:text-sm">
              <div className="space-y-0.5">
                <p className="text-white font-semibold">Rekomendasi Target Dana Darurat (6x Kebutuhan)</p>
                <p className="text-slate-400 text-xs">Aman untuk mengantisipasi kejadian tak terduga</p>
              </div>
              <span className="font-mono font-extrabold text-teal-300 text-base sm:text-lg">{fmt(emergencyTarget)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="relative z-10 py-16 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 border-t border-slate-800 text-center px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white">
            Siap Mengambil Kendali atas Keuangan Anda?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto">
            Bergabunglah sekarang. Kelola pengeluaran, pemasukan, dan target tabungan Anda dalam satu dasbor yang bersih dan mudah digunakan.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-9 py-4 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 shadow-xl shadow-teal-500/30 transition-all text-base transform hover:-translate-y-0.5"
            >
              Daftar Akun Baru — Gratis
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-slate-200 hover:text-white bg-slate-800/80 border border-slate-700 transition-all text-base"
            >
              Sudah Memiliki Akun? Masuk
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 bg-slate-950 border-t border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-bold text-teal-400 text-xs">
              C
            </div>
            <span className="text-slate-300 font-semibold">CashMoneyManagement</span>
            <span>© 2026. All Rights Reserved.</span>
          </div>
          <p className="text-slate-400">Dibuat dengan dedikasi untuk kebebasan finansial Anda.</p>
        </div>
      </footer>
    </div>
  );
}
