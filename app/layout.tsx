import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Navbar, Footer, BottomNav } from '@/components/Layout';
import ErrorBoundary from '@/components/Feedback';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['700', '800'],
  variable: '--font-headline',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MapLocals - Dịch vụ review google maps hàng đầu',
    template: '%s | MapLocals',
  },
  description:
    'MapLocals cung cấp giải pháp tối ưu Google Maps, tăng đánh giá 5 sao, cải thiện uy tín và bứt phá doanh thu cho doanh nghiệp của bạn.',
  keywords:
    'Dịch vụ review google maps, tăng đánh giá google maps, tối ưu seo google maps, maplocals',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://maplocals.net',
    siteName: 'MapLocals',
    title: 'MapLocals - Dịch vụ review google maps hàng đầu',
    description:
      'MapLocals cung cấp giải pháp tối ưu Google Maps, tăng đánh giá 5 sao, cải thiện uy tín và bứt phá doanh thu cho doanh nghiệp của bạn.',
    images: [
      {
        url: 'https://maplocals.net/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MapLocals - Dịch vụ review google maps hàng đầu',
    description:
      'MapLocals cung cấp giải pháp tối ưu Google Maps, tăng đánh giá 5 sao, cải thiện uy tín và bứt phá doanh thu cho doanh nghiệp của bạn.',
    images: ['https://maplocals.net/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} ${inter.variable}`}>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <Toaster position="top-center" richColors />
            <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
            <BottomNav />
          </div>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
