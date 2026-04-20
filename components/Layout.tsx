'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Star, Menu, X, Home, CreditCard, LayoutGrid, Mail, User, Megaphone, BarChart3, Image, Settings, Wallet } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAppRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/worker');
  const isLoggedIn = status === 'authenticated';

  if (isAppRoute) return null;

  const navLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Bảng giá', href: '/pricing' },
    { name: 'Dự án thực tế', href: '/case-studies' },
    { name: 'Liên hệ', href: '/audit' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/40 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Star className="text-primary-neon fill-primary-neon" size={24} />
          <span className="text-2xl font-black italic tracking-tighter text-primary-neon font-headline">MapBoost</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-sm font-bold uppercase tracking-wider transition-colors ${
                pathname === link.href ? 'text-primary-neon' : 'text-on-surface-variant hover:text-primary-neon'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface font-bold px-6 py-2 rounded-full hover:scale-105 transition-all neon-glow-cyan"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-primary-neon/80 to-primary-neon text-surface font-bold px-6 py-2 rounded-full hover:scale-105 transition-all neon-glow-cyan"
            >
              Bắt đầu ngay
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-primary-neon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-surface-container border-b border-white/10 p-6 flex flex-col gap-4"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-lg font-bold text-on-surface hover:text-primary-neon"
              >
                {link.name}
              </Link>
            ))}
            <Link
              href={isLoggedIn ? '/dashboard' : '/login'}
              onClick={() => setIsOpen(false)}
              className="bg-primary-neon text-surface font-bold py-3 rounded-xl text-center"
            >
              {isLoggedIn ? 'Dashboard' : 'Bắt đầu ngay'}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/worker')) return null;

  return (
    <footer className="bg-surface-container-low border-t border-white/5 py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="text-2xl font-black text-primary-neon italic mb-6">MapBoost Neon</div>
          <p className="text-on-surface-variant max-w-sm mb-8">
            Giải pháp tối ưu Google Maps hàng đầu, giúp doanh nghiệp bứt phá doanh thu nhờ niềm tin từ khách hàng.
          </p>
          <div className="text-xs uppercase tracking-widest text-on-surface-variant/50">
            © 2024 MapBoost Neon. Elevating local authority.
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          <div>
            <h4 className="text-on-surface font-bold mb-4">Khám phá</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><Link href="/case-studies" className="hover:text-primary-neon transition-colors">Case Studies</Link></li>
              <li><Link href="/pricing" className="hover:text-primary-neon transition-colors">Bảng giá</Link></li>
              <li><Link href="/audit" className="hover:text-primary-neon transition-colors">Audit Free</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-bold mb-4">Pháp lý</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary-neon transition-colors">Chính sách</a></li>
              <li><a href="#" className="hover:text-primary-neon transition-colors">Bảo mật</a></li>
              <li><a href="#" className="hover:text-primary-neon transition-colors">Điều khoản</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-on-surface font-bold mb-4">Kết nối</h4>
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li><a href="#" className="hover:text-primary-neon transition-colors">Facebook</a></li>
              <li><a href="#" className="hover:text-primary-neon transition-colors">TikTok</a></li>
              <li><a href="#" className="hover:text-primary-neon transition-colors">Zalo</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');
  const isWorker = pathname.startsWith('/worker');
  const isAdmin = pathname.startsWith('/admin');

  // Hide on admin and worker — they use their own sidebar
  if (isAdmin || isWorker) return null;

  const links = isDashboard 
    ? [
        { name: 'Trang chủ', icon: LayoutGrid, href: '/dashboard' },
        { name: 'Chiến dịch', icon: Megaphone, href: '/dashboard/campaigns' },
        { name: 'Ví', icon: Wallet, href: '/dashboard/wallet' },
        { name: 'Báo cáo', icon: BarChart3, href: '/dashboard/reports' },
        { name: 'Cài đặt', icon: Settings, href: '/dashboard/settings' },
      ]
    : [
        { name: 'Trang chủ', icon: Home, href: '/' },
        { name: 'Bảng giá', icon: CreditCard, href: '/pricing' },
        { name: 'Dự án', icon: LayoutGrid, href: '/case-studies' },
        { name: 'Liên hệ', icon: Mail, href: '/audit' },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-surface/60 backdrop-blur-xl rounded-t-[2.5rem] border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 transition-all",
              isActive ? "text-primary-neon scale-110" : "text-on-surface-variant"
            )}
          >
            <div className={cn(
              "p-2 rounded-full transition-all",
              isActive && "bg-primary-neon/10 shadow-[0_0_15px_rgba(0,245,255,0.2)]"
            )}>
              <Icon size={20} fill={isActive ? "currentColor" : "none"} />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold mt-1">{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
