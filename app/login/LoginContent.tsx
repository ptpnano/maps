'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, Chrome } from 'lucide-react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { signIn, getSession } from 'next-auth/react';

const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginContent() {
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });

      if (!result?.error) {
        toast.success('Đăng nhập thành công!');
        const session = await getSession();
        const role = session?.user?.role;
        if (role === 'admin') router.push('/admin');
        else if (role === 'worker') router.push('/worker/dashboard');
        else router.push('/dashboard');
      } else {
        toast.error('Email hoặc mật khẩu không chính xác!');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-[-1] bg-[radial-gradient(circle_at_20%_30%,rgba(0,245,255,0.1)_0%,transparent_40%),radial-gradient(circle_at_80%_70%,rgba(96,1,209,0.15)_0%,transparent_40%)]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <Link href="/" className="inline-block">
          <h2 className="text-primary-neon font-headline text-3xl font-black tracking-tighter drop-shadow-[0_0_10px_rgba(0,245,255,0.5)] mb-2 italic">
            MapLocals
          </h2>
        </Link>
        <p className="text-on-surface-variant text-xs uppercase tracking-[0.3em] font-bold">Authority Booster</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="max-w-[440px] w-full bg-surface-container-low/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-primary-neon/20 shadow-[0_0_50px_rgba(0,245,255,0.1)]"
      >
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">Chào mừng trở lại! 👋</h1>
        <p className="text-on-surface-variant text-sm mb-8">Đăng nhập để tiếp tục tối ưu Map của bạn.</p>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
            <div className="flex justify-between items-center px-1">
              <label className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Mật khẩu</label>
              <a href="#" className="text-primary-neon text-[10px] font-bold hover:underline">Quên mật khẩu?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
              <input 
                {...register('password')}
                className={`w-full bg-surface-container-lowest border-none rounded-xl py-4 pl-12 pr-12 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.password ? 'ring-2 ring-red-500/50' : ''}`} 
                placeholder="••••••••" 
                type={showPassword ? 'text' : 'password'}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-primary-neon transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1 pl-1">{errors.password.message}</p>}
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full bg-primary-neon text-surface font-headline font-black text-base py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(0,245,255,0.4)] mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-surface/20 border-t-surface rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={18} />
                Đăng nhập ngay
              </>
            )}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface-container-low px-4 text-on-surface-variant font-bold tracking-widest">Hoặc</span>
          </div>
        </div>

        <button className="w-full mt-6 bg-white/5 border border-white/10 text-on-surface font-bold py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 group">
          <Chrome size={20} className="group-hover:text-primary-neon transition-colors" />
          Tiếp tục với Google
        </button>

        <div className="mt-8 text-center">
          <p className="text-on-surface-variant text-sm">
            Chưa có tài khoản? 
            <Link href="/register" className="text-primary-neon font-bold hover:underline ml-1">Đăng ký ngay</Link>
          </p>
        </div>
      </motion.div>

      <div className="mt-12 text-center">
        <p className="text-on-surface-variant text-xs font-medium">
          Được tin dùng bởi <span className="text-primary-neon font-bold">1,200+</span> chủ doanh nghiệp tại Việt Nam.
        </p>
      </div>
    </div>
  );
}
