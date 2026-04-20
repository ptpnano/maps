'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, ShieldCheck, Zap, BellOff, Users, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

const registerSchema = z.object({
  brandName: z.string().min(2, 'Tên Brand ít nhất 2 ký tự'),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterContent() {
  const router = useRouter();
  const [role, setRole] = React.useState<'client' | 'worker'>('client');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.brandName,
          role
        })
      });

      const responseData = await res.json();

      if (!res.ok) {
        toast.error(responseData.error || 'Có lỗi xảy ra khi đăng ký!');
        return;
      }

      if (role === 'worker') {
        toast.success('Đăng ký thành công! Tài khoản worker cần admin duyệt trước khi nhận job.');
      } else {
        toast.success('Đăng ký thành công! Đang đăng nhập...');
      }

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });

      if (!result?.error) {
        router.push(role === 'worker' ? '/worker/dashboard' : '/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast.error('Lỗi kết nối tới máy chủ!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-[-1] bg-[radial-gradient(circle_at_10%_20%,rgba(0,245,255,0.08)_0%,transparent_40%),radial-gradient(circle_at_90%_80%,rgba(96,1,209,0.12)_0%,transparent_40%)]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <Link href="/">
          <h2 className="text-primary-neon font-headline text-2xl font-black tracking-tighter drop-shadow-[0_0_8px_rgba(0,245,255,0.4)] mb-2 italic">
            MapBoost
          </h2>
        </Link>
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-neon animate-pulse"></span>
          <p className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-bold">The Neon Curator</p>
        </div>
      </motion.div>

      <div className="max-w-[480px] w-full text-center mb-8">
        <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface leading-tight mb-4">
          {role === 'client' ? 'Tạo tài khoản – Biến Map thành cỗ máy hút khách' : 'Đăng ký Cộng tác viên – Kiếm thu nhập từ Local Guide'}
        </h1>
        <p className="text-on-surface-variant leading-relaxed px-4">
          {role === 'client' ? 'Đăng ký để bắt đầu build trust, tăng sao và leo top Google Maps' : 'Sử dụng tài khoản Local Guide của bạn để nhận job và kiếm tiền'}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-[480px] w-full bg-surface-container-low/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-primary-neon/30 shadow-[0_0_50px_rgba(0,245,255,0.1)]"
      >
        {/* Role Selector */}
        <div className="flex rounded-xl bg-surface-container-lowest p-1 mb-6">
          <button
            type="button"
            onClick={() => setRole('client')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${role === 'client' ? 'bg-primary-neon text-surface shadow-[0_0_15px_rgba(0,245,255,0.3)]' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Khách hàng
          </button>
          <button
            type="button"
            onClick={() => setRole('worker')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${role === 'worker' ? 'bg-primary-neon text-surface shadow-[0_0_15px_rgba(0,245,255,0.3)]' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Cộng tác viên
          </button>
        </div>

        {role === 'worker' && (
          <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
            Tài khoản cộng tác viên cần được admin duyệt trước khi bạn có thể nhận job.
          </div>
        )}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest pl-1">{role === 'client' ? 'Tên / Brand' : 'Họ và tên'}</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
              <input 
                {...register('brandName')}
                className={`w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.brandName ? 'ring-2 ring-red-500/50' : ''}`} 
                placeholder="Ví dụ: Cafe Mộc, Shop ABC..." 
                type="text"
              />
            </div>
            {errors.brandName && <p className="text-red-400 text-xs mt-1 pl-1">{errors.brandName.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest pl-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
              <input 
                {...register('email')}
                className={`w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.email ? 'ring-2 ring-red-500/50' : ''}`} 
                placeholder="email@example.com" 
                type="email"
              />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1 pl-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest pl-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
              <input 
                {...register('password')}
                className={`w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.password ? 'ring-2 ring-red-500/50' : ''}`} 
                placeholder="Ít nhất 6 ký tự" 
                type="password"
              />
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1 pl-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest pl-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
              <input 
                {...register('confirmPassword')}
                className={`w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.confirmPassword ? 'ring-2 ring-red-500/50' : ''}`} 
                placeholder="Nhập lại mật khẩu" 
                type="password"
              />
            </div>
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 pl-1">{errors.confirmPassword.message}</p>}
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full bg-primary-neon text-surface font-headline font-black text-base py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(0,245,255,0.4)] mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-surface/20 border-t-surface rounded-full animate-spin"></div>
            ) : (
              <>
                <Zap size={18} fill="currentColor" />
                🔥 Tạo tài khoản ngay
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-on-surface-variant text-sm">
            Đã có tài khoản? 
            <Link href="/login" className="text-primary-neon font-bold hover:underline ml-1">Đăng nhập ngay</Link>
          </p>
        </div>
      </motion.div>

      <div className="max-w-[480px] w-full mt-10 grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon">
            <ShieldCheck size={20} />
          </div>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Bảo mật data</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon">
            <BellOff size={20} />
          </div>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Không làm phiền</span>
        </div>
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-primary-neon/10 flex items-center justify-center text-primary-neon">
            <Users size={20} />
          </div>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">Cộng đồng lớn</span>
        </div>
      </div>
    </div>
  );
}
