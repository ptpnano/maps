import type { Metadata } from 'next';
import HomeContent from './HomeContent';

export const metadata: Metadata = {
  title: 'MapBoost Neon - Dịch vụ review google maps hàng đầu Việt Nam',
  description:
    'Tăng đánh giá 5 sao Google Maps, tối ưu SEO Local, cải thiện uy tín doanh nghiệp. Giải pháp bứt phá doanh thu từ Google Maps.',
  openGraph: {
    title: 'MapBoost Neon - Dịch vụ review google maps hàng đầu Việt Nam',
    description:
      'Tăng đánh giá 5 sao Google Maps, tối ưu SEO Local, cải thiện uy tín doanh nghiệp. Giải pháp bứt phá doanh thu từ Google Maps.',
  },
};

export default function HomePage() {
  return <HomeContent />;
}
