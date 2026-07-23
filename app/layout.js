import './globals.css';

export const metadata = {
  title: 'CashMoneyManagement — Kelola Uangmu',
  description: 'CashMoneyManagement - kelola keuangan harian kamu dengan mudah',
  themeColor: '#0f766e',
  icons: [
    { rel: 'icon', url: '/icons/icon-192.svg' },
    { rel: 'apple-touch-icon', url: '/icons/icon-192.svg' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f766e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/asset/image/logo.png" />
        <link rel="apple-touch-icon" href="/asset/image/logo.png" />
      </head>
      <body>
        <div id="splashOverlay" className="splash-overlay">
          <div className="splash-inner">
            <img src="/asset/image/logo%20splash%20screen.png" alt="CashMoney Management" className="splash-logo" />
            <div className="splash-progress-container">
              <div className="splash-progress-bar"></div>
              <p className="splash-progress-text"><span id="progressPercent">0</span>%</p>
            </div>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
