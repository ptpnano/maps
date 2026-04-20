import type { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Bảng Giá Dịch Vụ Review Google Maps',
  description:
    'Khám phá các gói dịch vụ tối ưu Google Maps tại MapBoost Neon. Từ gói khởi nghiệp đến gói chuyên nghiệp, phù hợp với mọi quy mô doanh nghiệp.',
  openGraph: {
    title: 'Bảng Giá Dịch Vụ Review Google Maps | MapBoost Neon',
    description:
      'Khám phá các gói dịch vụ tối ưu Google Maps tại MapBoost Neon. Từ gói khởi nghiệp đến gói chuyên nghiệp, phù hợp với mọi quy mô doanh nghiệp.',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
