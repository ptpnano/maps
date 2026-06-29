import type { Metadata } from 'next';
import LoginContent from './LoginContent';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào hệ thống MapLocals để quản lý chiến dịch Google Maps của bạn.',
};

export default function LoginPage() {
  return <LoginContent />;
}
