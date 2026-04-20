'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { CloudUpload, Image as ImageIcon, Plus } from 'lucide-react';

export default function MediaPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl w-full h-16 flex items-center justify-between px-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h1 className="font-headline font-bold tracking-tight text-xl text-on-surface">Kho ảnh của bạn</h1>
        </div>
        <button className="bg-primary-neon text-surface p-2 rounded-full hover:scale-105 transition-transform">
          <Plus size={24} />
        </button>
      </header>

      <main className="pt-8 px-6 space-y-8 max-w-7xl mx-auto">
        {/* Upload Area */}
        <section>
          <div className="relative group">
            <div className="w-full h-44 rounded-lg border-2 border-dashed border-white/10 bg-surface-container-low flex flex-col items-center justify-center text-center p-6 transition-all group-hover:border-primary-neon/50 group-hover:bg-surface-container cursor-pointer">
              <div className="mb-3 bg-primary-neon/10 p-3 rounded-full">
                <CloudUpload className="text-primary-neon" size={32} />
              </div>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                Kéo thả ảnh hoặc <span className="text-primary-neon">Bấm để tải lên</span> ảnh món ăn/không gian quán
              </p>
            </div>
          </div>
        </section>

        {/* Empty State */}
        <section className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="text-on-surface-variant" size={36} />
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-3">Chưa có ảnh nào</h3>
          <p className="text-on-surface-variant max-w-md mx-auto mb-6">
            Tải ảnh lên để sử dụng trong các chiến dịch review. Ảnh chất lượng cao giúp review đáng tin cậy hơn 40%.
          </p>
          <p className="text-xs text-on-surface-variant/50">
            Hỗ trợ: JPG, PNG, WebP • Tối đa 10MB/ảnh
          </p>
        </section>
      </main>
    </div>
  );
}
