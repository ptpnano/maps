'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutGrid, Megaphone, BarChart3, Image, Settings, Wallet, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && session?.user?.role !== 'client') {
      if (session?.user?.role === 'worker') router.push('/worker/dashboard');
      else if (session?.user?.role === 'admin') router.push('/admin');
    }
  }, [status, session, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin w-12 h-12 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'client') return null;

  const user = session.user;
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const sidebarLinks = [
    { name: 'Trang chủ', icon: LayoutGrid, href: '/dashboard' },
    { name: 'Chiến dịch', icon: Megaphone, href: '/dashboard/campaigns' },
    { name: 'Ví', icon: Wallet, href: '/dashboard/wallet' },
    { name: 'Báo cáo', icon: BarChart3, href: '/dashboard/reports' },
    { name: 'Kho ảnh', icon: Image, href: '/dashboard/media' },
    { name: 'Cài đặt', icon: Settings, href: '/dashboard/settings' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-surface flex-col gap-4 p-6 shadow-2xl z-[60] pt-24 border-r border-white/5">
        <div className="flex flex-col gap-2 mb-6">
          <div className="bg-primary-neon/10 p-4 rounded-2xl border-l-4 border-primary-neon">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-neon mb-1">Active Account</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-neon/20 flex items-center justify-center border border-primary-neon text-primary-neon font-bold text-sm">
                {initials}
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">{user?.name || 'Người dùng'}</h4>
                <p className="text-[10px] text-on-surface-variant truncate max-w-[140px]">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group border-l-4 ${
                  isActive
                    ? 'bg-primary-neon/10 text-primary-neon border-primary-neon'
                    : 'text-on-surface-variant hover:bg-surface-container border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? '' : 'group-hover:text-primary-neon'} />
                <span className={`font-medium ${isActive ? '' : 'group-hover:text-primary-neon'}`}>{link.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={() => signOut({ redirect: false }).then(() => { window.location.href = '/login'; })}
            className="flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-72">
        {children}
      </div>
    </div>
  );
}
