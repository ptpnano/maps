import type { Metadata } from 'next';
import RegisterContent from './RegisterContent';

export const metadata: Metadata = {
  title: 'Đăng ký tài khoản',
  description: 'Bắt đầu hành trình tối ưu Google Maps của bạn với MapBoost Neon. Đăng ký ngay để nhận ưu đãi.',
};

export default function RegisterPage() {
  return <RegisterContent />;
}
