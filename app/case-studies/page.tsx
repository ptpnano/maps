import type { Metadata } from 'next';
import CaseStudiesContent from './CaseStudiesContent';

export const metadata: Metadata = {
  title: 'Case Study Thành Công',
  description:
    'Xem các dự án thực tế MapLocals đã triển khai. Chúng tôi giúp doanh nghiệp tăng từ 2.5 sao lên 4.8 sao và chiếm lĩnh vị trí Top 1 Google Maps.',
  openGraph: {
    title: 'Case Study Thành Công | MapLocals',
    description:
      'Xem các dự án thực tế MapLocals đã triển khai. Chúng tôi giúp doanh nghiệp tăng từ 2.5 sao lên 4.8 sao và chiếm lĩnh vị trí Top 1 Google Maps.',
  },
};

export default function CaseStudiesPage() {
  return <CaseStudiesContent />;
}
