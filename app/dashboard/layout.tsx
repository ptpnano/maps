'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BarChart3,
  Eye,
  History,
  Image,
  LayoutGrid,
  LogOut,
  Menu,
  Megaphone,
  MessageSquare,
  Settings,
  ThumbsUp,
  UserPlus,
  Wallet,
  X,
  Youtube,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user?.role !== 'client') {
      if (session?.user?.role === 'worker') router.push('/worker/dashboard');
      else if (session?.user?.role === 'admin') router.push('/admin');
    }
  }, [status, session, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin w-12 h-12 border-4 border-primary-neon border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== 'client') return null;

  const user = session.user;
  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const sidebarGroups = [
    {
      name: 'Review Maps',
      links: [
        { name: 'Tổng quan', icon: LayoutGrid, href: '/dashboard' },
        { name: 'Chiến dịch', icon: Megaphone, href: '/dashboard/campaigns' },
        { name: 'Báo cáo', icon: BarChart3, href: '/dashboard/reports' },
        { name: 'Kho ảnh', icon: Image, href: '/dashboard/media' },
      ],
    },
    {
      name: 'YouTube',
      links: [
        { name: 'Tăng Like', icon: ThumbsUp, href: '/dashboard/youtube/like' },
        { name: 'Tăng View', icon: Eye, href: '/dashboard/youtube/view' },
        { name: 'Tăng Comment', icon: MessageSquare, href: '/dashboard/youtube/comment' },
        { name: 'Tăng Sub', icon: UserPlus, href: '/dashboard/youtube/sub' },
        { name: 'Lịch sử', icon: History, href: '/dashboard/youtube/history' },
      ],
    },
    {
      name: 'Tài khoản',
      links: [
        { name: 'Ví', icon: Wallet, href: '/dashboard/wallet' },
        { name: 'Cài đặt', icon: Settings, href: '/dashboard/settings' },
      ],
    },
  ];

  const renderMenuGroups = (onNavigate?: () => void) => (
    <div className="space-y-5 overflow-y-auto pr-1">
      {sidebarGroups.map((group) => (
        <div key={group.name}>
          <div className="flex items-center gap-2 px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {group.name === 'YouTube' && <Youtube size={13} className="text-red-400" />}
            <span>{group.name}</span>
          </div>
          <div className="space-y-1">
            {group.links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={onNavigate}
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
        </div>
      ))}
    </div>
  );

  const logout = () => signOut({ redirect: false }).then(() => { window.location.href = '/login'; });

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-surface flex-col gap-4 p-6 shadow-2xl z-[60] pt-24 border-r border-white/5">
        <div className="flex flex-col gap-2 mb-2">
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

        {renderMenuGroups()}

        <div className="mt-auto pt-4 border-t border-white/5">
          <button onClick={logout} className="flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full">
            <LogOut size={20} />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[70] h-11 w-11 rounded-xl bg-surface-container border border-white/10 text-primary-neon flex items-center justify-center shadow-xl"
        aria-label="Mở menu"
      >
        <Menu size={22} />
      </button>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[80]">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Đóng menu" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[360px] bg-surface border-r border-white/10 p-5 pt-8 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-neon">Menu khách hàng</p>
                <p className="text-sm text-on-surface-variant truncate max-w-[240px]">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 rounded-xl bg-surface-container border border-white/10 text-on-surface flex items-center justify-center"
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            {renderMenuGroups(() => setMobileMenuOpen(false))}

            <button onClick={logout} className="mt-auto flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full">
              <LogOut size={20} />
              <span className="font-medium">Đăng xuất</span>
            </button>
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-72">{children}</div>
    </div>
  );
}
