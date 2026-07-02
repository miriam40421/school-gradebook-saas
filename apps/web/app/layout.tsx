import type { Metadata } from 'next';
import { Noto_Sans_Hebrew } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-hebrew',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ניהול בית ספר',
  description: 'הגדרת בית ספר רב-משתמשים',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={notoSansHebrew.variable}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
