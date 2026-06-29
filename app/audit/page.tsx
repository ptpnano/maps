import type { Metadata } from 'next';
import AuditContent from './AuditContent';

export const metadata: Metadata = {
  title: 'Audit Google Maps Miễn Phí',
  description:
    'Nhận báo cáo phân tích Google Maps miễn phí từ MapLocals. Chúng tôi giúp bạn tìm ra lỗi và tối ưu hóa hiển thị.',
  openGraph: {
    title: 'Audit Google Maps Miễn Phí | MapLocals',
    description:
      'Nhận báo cáo phân tích Google Maps miễn phí từ MapLocals. Chúng tôi giúp bạn tìm ra lỗi và tối ưu hóa hiển thị.',
  },
};

export default function AuditPage() {
  return <AuditContent />;
}
