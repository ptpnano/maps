'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle2, ShieldCheck, MapPin, Phone, MessageSquare, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const auditSchema = z.object({
  businessName: z.string().min(2, 'Tên doanh nghiệp ít nhất 2 ký tự'),
  mapsLink: z.string().url('Vui lòng nhập link Google Maps hợp lệ'),
  zaloNumber: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ (10-11 số)'),
  issue: z.string().min(10, 'Vui lòng mô tả chi tiết hơn (ít nhất 10 ký tự)'),
});

type AuditFormData = z.infer<typeof auditSchema>;

export default function AuditContent() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AuditFormData>({
    resolver: zodResolver(auditSchema)
  });

  const onSubmit = async (data: AuditFormData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Audit Data:', data);
    toast.success('Gửi yêu cầu thành công! Chúng tôi sẽ liên hệ bạn qua Zalo sớm nhất.');
    reset();
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-[-1] bg-[radial-gradient(circle_at_50%_-20%,rgba(0,245,255,0.15)_0%,transparent_50%)]"></div>

      <div className="max-w-4xl mx-auto text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-headline text-4xl md:text-6xl font-black text-on-surface mb-6 tracking-tight"
        >
          Audit Map <span className="text-primary-neon">Miễn Phí</span> 🔍
        </motion.h1>
        <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Để lại thông tin, chuyên gia của chúng tôi sẽ soi lỗi và gửi bản kế hoạch tối ưu Google Maps cho bạn trong 24h.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Form Section */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-8 md:p-10 rounded-[2rem] border border-primary-neon/20 relative"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-widest pl-1">Tên doanh nghiệp</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
                <input 
                  {...register('businessName')}
                  className={`w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.businessName ? 'ring-2 ring-red-500/50' : ''}`} 
                  placeholder="Ví dụ: Nhà hàng Sen Vàng" 
                  type="text"
                />
              </div>
              {errors.businessName && <p className="text-red-400 text-xs mt-1 pl-1">{errors.businessName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-widest pl-1">Link Google Maps</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
                <input 
                  {...register('mapsLink')}
                  className={`w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.mapsLink ? 'ring-2 ring-red-500/50' : ''}`} 
                  placeholder="https://maps.app.goo.gl/..." 
                  type="text"
                />
              </div>
              {errors.mapsLink && <p className="text-red-400 text-xs mt-1 pl-1">{errors.mapsLink.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-widest pl-1">Số Zalo liên hệ</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={20} />
                <input 
                  {...register('zaloNumber')}
                  className={`w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none ${errors.zaloNumber ? 'ring-2 ring-red-500/50' : ''}`} 
                  placeholder="090xxxxxxx" 
                  type="tel"
                />
              </div>
              {errors.zaloNumber && <p className="text-red-400 text-xs mt-1 pl-1">{errors.zaloNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-on-surface-variant text-xs font-bold uppercase tracking-widest pl-1">Vấn đề đang gặp phải</label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 text-on-surface-variant/50" size={20} />
                <textarea 
                  {...register('issue')}
                  rows={4}
                  className={`w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary-neon transition-all outline-none resize-none ${errors.issue ? 'ring-2 ring-red-500/50' : ''}`} 
                  placeholder="Ví dụ: Bị đối thủ spam 1 sao, không hiện lên top tìm kiếm..."
                ></textarea>
              </div>
              {errors.issue && <p className="text-red-400 text-xs mt-1 pl-1">{errors.issue.message}</p>}
            </div>

            <button 
              disabled={isSubmitting}
              className="w-full bg-primary-neon text-surface font-headline font-black text-lg py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_30px_rgba(0,245,255,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-surface/20 border-t-surface rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={20} />
                  GỬI YÊU CẦU AUDIT NGAY
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Info Section */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="space-y-6">
            <h3 className="text-2xl font-headline font-bold text-on-surface">Bạn sẽ nhận được gì?</h3>
            <div className="space-y-4">
              {[
                'Phân tích đối thủ cạnh tranh trong khu vực.',
                'Kiểm tra các lỗi kỹ thuật khiến Map bị ẩn.',
                'Đánh giá chất lượng review hiện tại.',
                'Gợi ý bộ từ khóa SEO Map hiệu quả nhất.',
                'Kế hoạch hành động chi tiết để lên Top 3.'
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="text-primary-neon mt-1 shrink-0" size={20} />
                  <p className="text-on-surface-variant leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-surface-container-low rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-primary-neon">
              <ShieldCheck size={24} />
              <h4 className="font-bold">Cam kết bảo mật</h4>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Chúng tôi cam kết không spam, không bán dữ liệu. Thông tin của bạn chỉ được dùng để gửi bản Audit và tư vấn giải pháp.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl">
            <img 
              src="https://picsum.photos/seed/audit/800/450" 
              alt="Google Maps Audit Preview" 
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
            <div className="absolute bottom-4 left-6">
              <p className="text-primary-neon font-black text-xl italic tracking-tighter">#MapLocalsExpert</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
