'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'motion/react';
import { MapPin, Search, Star, CreditCard, Check, Zap, Shield, CalendarDays, Image, Sparkles, MessageSquare, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

const LOCAL_GUIDE_MAP: Record<string, { label: string; desc: string; color: string }> = {
  basic: { label: 'Acc Thường', desc: 'Local Guide Level 1-3', color: 'text-on-surface-variant' },
  silver: { label: 'Acc Trung Cấp', desc: 'Local Guide Level 4-5', color: 'text-yellow-400' },
  vip: { label: 'Acc Cao Cấp', desc: 'Local Guide Level 6+', color: 'text-primary-neon' },
};

const TIMELINE_OPTIONS = [
  { days: 7, label: '7 ngày (Nhanh)' },
  { days: 14, label: '14 ngày (Khuyến nghị)' },
  { days: 30, label: '30 ngày (Tự nhiên)' },
  { days: 60, label: '60 ngày (An toàn nhất)' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [mapLocation, setMapLocation] = useState<any>(null);
  
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  // Multi-tier: { [tierId]: quantity }
  const [tierQuantities, setTierQuantities] = useState<Record<string, number>>({});
  
  const [completionDays, setCompletionDays] = useState<number>(14);
  const [starSplit, setStarSplit] = useState({ s5: 0, s4: 0, s3: 0 });

  // Content config
  const [contentMode, setContentMode] = useState<'ai' | 'custom'>('ai');
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [customContents, setCustomContents] = useState<string[]>([]);
  const [contentInput, setContentInput] = useState('');

  // Image config
  const [imageMode, setImageMode] = useState<'none' | 'manual' | 'ai'>('none');
  const [imageMinCount, setImageMinCount] = useState(1);
  const [imageMaxCount, setImageMaxCount] = useState(3);

  // Duplicate options
  const [allowDuplicateContent, setAllowDuplicateContent] = useState(true);
  const [allowDuplicateImages, setAllowDuplicateImages] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/campaigns/new');
    }
  }, [status, router]);

  useEffect(() => {
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.tiers && data.tiers.length > 0) {
          setPricingTiers(data.tiers);
        }
      });
  }, []);

  const handleValidateUrl = async () => {
    if (!url) return toast.error('Vui lòng nhập URL Google Maps');
    setLoading(true);
    try {
      const res = await fetch('/api/maps/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMapLocation({ ...data, googleMapsUrl: data.resolvedUrl || url, googlePlaceId: data.placeId });
      setStep(2);
      toast.success('Xác nhận địa điểm thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi kiểm tra bản đồ');
    } finally {
      setLoading(false);
    }
  };

  // Tier quantity helpers
  const updateTierQty = (tierId: string, delta: number) => {
    setTierQuantities(prev => {
      const current = prev[tierId] || 0;
      const newQty = Math.max(0, current + delta);
      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[tierId];
      } else {
        updated[tierId] = newQty;
      }
      return updated;
    });
  };

  const setTierQtyDirect = (tierId: string, value: number) => {
    setTierQuantities(prev => {
      const updated = { ...prev };
      if (value <= 0) {
        delete updated[tierId];
      } else {
        updated[tierId] = value;
      }
      return updated;
    });
  };

  const totalReviews = Object.values(tierQuantities).reduce((sum, q) => sum + q, 0);
  const reviewsPerDay = Math.max(1, Math.ceil(totalReviews / completionDays));

  // Calculate budget breakdown
  const tierBreakdown = Object.entries(tierQuantities)
    .filter(([, qty]) => qty > 0)
    .map(([tierId, qty]) => {
      const tier = pricingTiers.find(t => t.id === tierId);
      return {
        tierId,
        tier,
        qty,
        subtotal: tier ? Number(tier.pricePerReview) * qty : 0
      };
    });
  const totalBudget = tierBreakdown.reduce((sum, b) => sum + b.subtotal, 0);

  // Keep star split in sync
  useEffect(() => {
    setStarSplit({ s5: totalReviews, s4: 0, s3: 0 });
  }, [totalReviews]);

  // Keyword helpers
  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !aiKeywords.includes(kw)) {
      setAiKeywords([...aiKeywords, kw]);
      setKeywordInput('');
    }
  };
  const removeKeyword = (kw: string) => setAiKeywords(aiKeywords.filter(k => k !== kw));

  // Custom content helpers
  const addContent = () => {
    const c = contentInput.trim();
    if (c) {
      setCustomContents([...customContents, c]);
      setContentInput('');
    }
  };
  const removeContent = (idx: number) => setCustomContents(customContents.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (totalReviews === 0) return toast.error('Chọn ít nhất 1 loại tài khoản');
    if (!mapLocation) return;
    if (starSplit.s5 + starSplit.s4 + starSplit.s3 !== totalReviews) {
      return toast.error('Tổng sao mục tiêu phải bằng tổng review');
    }
    if (contentMode === 'ai' && aiKeywords.length === 0) {
      return toast.error('Vui lòng thêm ít nhất 1 keyword cho AI');
    }

    const tiers = Object.entries(tierQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([pricingTierId, quantity]) => ({ pricingTierId, quantity }));

    setLoading(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapLocation: {
            googlePlaceId: mapLocation.googlePlaceId,
            googleMapsUrl: mapLocation.googleMapsUrl,
            name: mapLocation.name,
            address: mapLocation.address
          },
          tiers,
          target5Star: starSplit.s5,
          target4Star: starSplit.s4,
          target3Star: starSplit.s3,
          contentMode,
          customContents: contentMode === 'custom' ? customContents : [],
          aiKeywords: contentMode === 'ai' ? aiKeywords : [],
          imageMode,
          imageMinCount: imageMode !== 'none' ? imageMinCount : 0,
          imageMaxCount: imageMode !== 'none' ? imageMaxCount : 0,
          allowDuplicateContent,
          allowDuplicateImages,
          maxReviewsPerDay: reviewsPerDay
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          const msgs = Object.entries(data.details)
            .filter(([, v]: [string, any]) => v?._errors?.length)
            .map(([k, v]: [string, any]) => `${k}: ${v._errors.join(', ')}`);
          toast.error(msgs.join('\n') || data.error || 'Dữ liệu không hợp lệ');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast.success('Chiến dịch đã được gửi! Vui lòng chờ admin duyệt.');
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tạo chiến dịch');
      if (error.message === 'Insufficient balance') {
        router.push('/dashboard/wallet');
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-neon border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto pb-32">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface mb-2">Tạo chiến dịch mới</h1>
        <p className="text-on-surface-variant">Thiết lập chiến dịch tăng đánh giá qua 4 bước.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-high -z-10 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 h-[2px] bg-primary-neon -z-10 -translate-y-1/2 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[
          { num: 1, label: 'Địa điểm', icon: MapPin },
          { num: 2, label: 'Tài khoản', icon: Shield },
          { num: 3, label: 'Nội dung', icon: MessageSquare },
          { num: 4, label: 'Thanh toán', icon: CreditCard }
        ].map(s => (
          <div key={s.num} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold relative transition-colors duration-300 ${step >= s.num ? 'bg-primary-neon text-surface shadow-[0_0_15px_rgba(0,245,255,0.4)]' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {step > s.num ? <Check size={20} /> : s.num}
            </div>
            <span className={`mt-3 text-xs font-bold uppercase tracking-wider ${step >= s.num ? 'text-primary-neon' : 'text-on-surface-variant'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-surface-container/50 rounded-[2rem] p-8 border border-white/5 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {/* STEP 1: Địa điểm */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-on-surface mb-6">1. Chọn địa điểm doanh nghiệp</h2>
              <div className="space-y-4">
                <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider">URL Google Maps / Place Info</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    type="url"
                    placeholder="Dán link Google Maps của bạn vào đây..."
                    className="w-full bg-surface-container-lowest border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary-neon focus:border-transparent outline-none text-on-surface transition-all"
                  />
                </div>
                <div className="bg-primary-neon/10 border border-primary-neon/20 rounded-xl p-4 text-sm text-primary-neon flex gap-3">
                  <MapPin className="shrink-0 mt-0.5" size={18} />
                  <p>Hệ thống hỗ trợ dạng link ngắn (maps.app.goo.gl/...) và link đầy đủ (google.com/maps/place/...).</p>
                </div>
                
                <button
                  onClick={handleValidateUrl}
                  disabled={loading || !url}
                  className="w-full mt-6 bg-primary-neon text-surface font-bold py-4 rounded-xl hover:scale-[1.01] transition-transform disabled:opacity-50"
                >
                  {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Chọn loại tài khoản + số lượng */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-on-surface mb-6">2. Chọn loại tài khoản & Số lượng</h2>
              
              {/* Location summary */}
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-white/5 mb-8 flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-neon/20 rounded-lg flex items-center justify-center text-primary-neon">
                  <MapPin />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-lg">{mapLocation?.name}</h3>
                  <p className="text-sm text-on-surface-variant">{mapLocation?.address}</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Multi-tier selection */}
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Chọn loại tài khoản Google (có thể chọn nhiều)</label>
                  <div className="space-y-3">
                    {pricingTiers.map(tier => {
                      const guide = LOCAL_GUIDE_MAP[tier.level] || LOCAL_GUIDE_MAP.basic;
                      const qty = tierQuantities[tier.id] || 0;
                      return (
                        <div 
                          key={tier.id}
                          className={`p-4 rounded-xl border-2 transition-all ${qty > 0 ? 'border-primary-neon bg-primary-neon/5 shadow-[0_0_15px_rgba(0,245,255,0.15)]' : 'border-white/5 bg-surface-container'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Shield size={16} className={guide.color} />
                                <span className={`text-xs font-bold uppercase tracking-wider ${guide.color}`}>{guide.label}</span>
                              </div>
                              <h4 className="font-bold text-on-surface">{tier.name}</h4>
                              <p className="text-primary-neon font-bold text-lg">
                                {Number(tier.pricePerReview).toLocaleString()}đ 
                                <span className="text-xs text-on-surface-variant font-normal"> / review</span>
                              </p>
                              <p className="text-[11px] text-on-surface-variant">{guide.desc} • Bảo hành {tier.warrantyDays} ngày</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateTierQty(tier.id, -5)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-red-500/20 transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={qty}
                                onChange={(e) => setTierQtyDirect(tier.id, parseInt(e.target.value) || 0)}
                                className="w-16 text-center bg-surface-container-lowest border border-white/10 rounded-lg py-2 text-lg font-bold text-primary-neon focus:ring-2 focus:ring-primary-neon outline-none"
                              />
                              <button
                                onClick={() => updateTierQty(tier.id, 5)}
                                className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary-neon/20 transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          {qty > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between text-sm">
                              <span className="text-on-surface-variant">{qty} review × {Number(tier.pricePerReview).toLocaleString()}đ</span>
                              <span className="font-bold text-primary-neon">{(Number(tier.pricePerReview) * qty).toLocaleString()}đ</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline */}
                {totalReviews > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                      <CalendarDays size={14} className="inline mr-1" />
                      Thời gian hoàn thành ({totalReviews} review)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TIMELINE_OPTIONS.map(opt => (
                        <div
                          key={opt.days}
                          onClick={() => setCompletionDays(opt.days)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                            completionDays === opt.days 
                              ? 'border-primary-neon bg-primary-neon/5 text-primary-neon' 
                              : 'border-white/5 text-on-surface-variant hover:border-white/20'
                          }`}
                        >
                          <span className="text-sm font-bold">{opt.label}</span>
                          <span className="text-xs font-mono">{Math.max(1, Math.ceil(totalReviews / opt.days))}/ngày</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Star split */}
                {totalReviews > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">Phân bổ sao</label>
                    <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1 text-on-surface font-bold"><Star className="text-yellow-400 fill-yellow-400" size={16}/> 5 Sao</div>
                      <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      <span className="font-bold text-on-surface w-12 text-right">{starSplit.s5}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2 italic">Mặc định 100% 5 sao. Liên hệ admin để tuỳ chỉnh tỉ lệ sao.</p>
                  </div>
                )}

                {/* Speed info */}
                {totalReviews > 0 && (
                  <div className="bg-surface-container-lowest rounded-xl p-4 border border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center text-green-400">
                      <Zap size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-on-surface font-bold">Tốc độ: <span className="text-primary-neon">{reviewsPerDay} review/ngày</span></p>
                      <p className="text-xs text-on-surface-variant">Tổng: {totalReviews} review • {tierBreakdown.length} loại tài khoản • ~{completionDays} ngày</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-primary-neon">{totalBudget.toLocaleString()}đ</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(1)} className="flex-1 bg-surface-container text-on-surface font-bold py-4 rounded-xl hover:bg-surface-container-high transition-colors">
                  Quay lại
                </button>
                <button 
                  onClick={() => totalReviews > 0 ? setStep(3) : toast.error('Chọn ít nhất 1 loại tài khoản')} 
                  className="flex-1 bg-primary-neon text-surface font-bold py-4 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
                  disabled={totalReviews === 0}
                >
                  Tiếp tục cấu hình
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Nội dung & Hình ảnh */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-on-surface mb-6">3. Cấu hình Nội dung & Hình ảnh</h2>

              <div className="space-y-8">
                {/* Content Mode */}
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">
                    <MessageSquare size={14} className="inline mr-1" />
                    Nội dung review
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div
                      onClick={() => setContentMode('ai')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${contentMode === 'ai' ? 'border-primary-neon bg-primary-neon/5' : 'border-white/5 bg-surface-container hover:border-white/20'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={18} className="text-primary-neon" />
                        <span className="font-bold text-on-surface">AI tự tạo</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">AI tự động tạo nội dung từ keywords bạn cung cấp</p>
                    </div>
                    <div
                      onClick={() => setContentMode('custom')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${contentMode === 'custom' ? 'border-primary-neon bg-primary-neon/5' : 'border-white/5 bg-surface-container hover:border-white/20'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={18} className="text-yellow-400" />
                        <span className="font-bold text-on-surface">Tự viết</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">Cung cấp danh sách nội dung, hệ thống sẽ chọn ngẫu nhiên</p>
                    </div>
                  </div>

                  {contentMode === 'ai' && (
                    <div className="space-y-3">
                      <p className="text-sm text-on-surface-variant">Nhập các keyword để AI tạo nội dung (VD: &quot;phở ngon&quot;, &quot;nhân viên thân thiện&quot;):</p>
                      <div className="flex gap-2">
                        <input
                          value={keywordInput}
                          onChange={e => setKeywordInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                          placeholder="Thêm keyword..."
                          className="flex-1 bg-surface-container-lowest border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary-neon outline-none text-on-surface text-sm"
                        />
                        <button onClick={addKeyword} className="px-4 bg-primary-neon text-surface font-bold rounded-xl text-sm">Thêm</button>
                      </div>
                      {aiKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {aiKeywords.map(kw => (
                            <span key={kw} className="bg-primary-neon/10 text-primary-neon px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5">
                              {kw}
                              <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 text-xs font-bold">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {contentMode === 'custom' && (
                    <div className="space-y-3">
                      <p className="text-sm text-on-surface-variant">Nhập các nội dung review mẫu (hệ thống sẽ chọn ngẫu nhiên cho từng review):</p>
                      <div className="flex gap-2">
                        <textarea
                          value={contentInput}
                          onChange={e => setContentInput(e.target.value)}
                          placeholder="Viết nội dung review mẫu..."
                          rows={2}
                          className="flex-1 bg-surface-container-lowest border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary-neon outline-none text-on-surface text-sm resize-none"
                        />
                        <button onClick={addContent} className="px-4 bg-primary-neon text-surface font-bold rounded-xl text-sm self-end">Thêm</button>
                      </div>
                      {customContents.length > 0 && (
                        <div className="space-y-2">
                          {customContents.map((c, i) => (
                            <div key={i} className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 flex justify-between items-start gap-2">
                              <p className="text-sm text-on-surface flex-1">{c}</p>
                              <button onClick={() => removeContent(i)} className="text-red-400 hover:text-red-300 text-xs font-bold shrink-0">Xóa</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Image Mode */}
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">
                    <Image size={14} className="inline mr-1" />
                    Hình ảnh review
                  </label>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { mode: 'none' as const, label: 'Không ảnh', desc: 'Review chỉ có text' },
                      { mode: 'ai' as const, label: 'AI tạo ảnh', desc: 'Tự động tạo ảnh liên quan' },
                      { mode: 'manual' as const, label: 'Tự upload', desc: 'Tải lên ảnh thủ công' },
                    ].map(opt => (
                      <div
                        key={opt.mode}
                        onClick={() => setImageMode(opt.mode)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${imageMode === opt.mode ? 'border-primary-neon bg-primary-neon/5' : 'border-white/5 bg-surface-container hover:border-white/20'}`}
                      >
                        <span className="font-bold text-on-surface text-sm">{opt.label}</span>
                        <p className="text-[11px] text-on-surface-variant mt-1">{opt.desc}</p>
                      </div>
                    ))}
                  </div>

                  {imageMode !== 'none' && (
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-white/5">
                      <p className="text-sm text-on-surface-variant mb-3">Số lượng ảnh mỗi review (hệ thống sẽ random trong khoảng):</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-on-surface-variant mb-1 block">Tối thiểu</label>
                          <input
                            type="number" min={1} max={10}
                            value={imageMinCount}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 1;
                              setImageMinCount(v);
                              if (v > imageMaxCount) setImageMaxCount(v);
                            }}
                            className="w-full bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-center font-bold text-on-surface focus:ring-2 focus:ring-primary-neon outline-none"
                          />
                        </div>
                        <span className="text-on-surface-variant font-bold mt-4">—</span>
                        <div className="flex-1">
                          <label className="text-xs text-on-surface-variant mb-1 block">Tối đa</label>
                          <input
                            type="number" min={1} max={10}
                            value={imageMaxCount}
                            onChange={e => {
                              const v = parseInt(e.target.value) || 1;
                              setImageMaxCount(v);
                              if (v < imageMinCount) setImageMinCount(v);
                            }}
                            className="w-full bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-center font-bold text-on-surface focus:ring-2 focus:ring-primary-neon outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

                  {/* Duplicate options */}
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-white/5 space-y-3">
                    <p className="text-sm font-bold text-on-surface-variant mb-2">Tùy chọn trùng lặp</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={allowDuplicateContent} onChange={e => setAllowDuplicateContent(e.target.checked)} className="w-4 h-4 accent-primary-neon" />
                      <span className="text-sm text-on-surface">Cho phép trùng nội dung giữa các review?</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={allowDuplicateImages} onChange={e => setAllowDuplicateImages(e.target.checked)} className="w-4 h-4 accent-primary-neon" />
                      <span className="text-sm text-on-surface">Cho phép trùng hình ảnh giữa các review?</span>
                    </label>
                  </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(2)} className="flex-1 bg-surface-container text-on-surface font-bold py-4 rounded-xl hover:bg-surface-container-high transition-colors">
                  Quay lại
                </button>
                <button onClick={() => setStep(4)} className="flex-1 bg-primary-neon text-surface font-bold py-4 rounded-xl hover:scale-[1.02] transition-transform">
                  Tới bước thanh toán
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Thanh toán */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <h2 className="text-xl font-bold text-on-surface mb-6">4. Xác nhận và Thanh toán</h2>
               
               <div className="bg-surface-container-lowest rounded-xl p-6 border border-white/5 mb-8">
                 <h3 className="text-on-surface-variant text-sm uppercase tracking-widest font-bold mb-4 border-b border-white/5 pb-4">Hóa Đơn Của Bạn</h3>
                 
                 <div className="space-y-4">
                   {/* Tier breakdown */}
                   {tierBreakdown.map(b => {
                     const guide = b.tier ? LOCAL_GUIDE_MAP[b.tier.level] || LOCAL_GUIDE_MAP.basic : LOCAL_GUIDE_MAP.basic;
                     return (
                       <div key={b.tierId} className="flex justify-between items-center text-on-surface bg-surface-container p-3 rounded-lg">
                         <div>
                           <span className={`text-xs font-bold ${guide.color}`}>{guide.label}</span>
                           <span className="text-sm ml-2">{b.tier?.name}</span>
                           <span className="text-xs text-on-surface-variant ml-2">× {b.qty}</span>
                         </div>
                         <span className="font-bold text-primary-neon">{b.subtotal.toLocaleString()}đ</span>
                       </div>
                     );
                   })}

                   <div className="flex justify-between items-center text-on-surface text-sm">
                     <span>Tổng review:</span>
                     <span className="font-bold">{totalReviews}</span>
                   </div>
                   <div className="flex justify-between items-center text-on-surface text-sm">
                     <span>Thời gian:</span>
                     <span className="font-bold">{completionDays} ngày (~{reviewsPerDay}/ngày)</span>
                   </div>
                   <div className="flex justify-between items-center text-on-surface text-sm">
                     <span>Nội dung:</span>
                     <span className="font-bold">{contentMode === 'ai' ? `AI (${aiKeywords.length} keywords)` : `Tự viết (${customContents.length} mẫu)`}</span>
                   </div>
                   <div className="flex justify-between items-center text-on-surface text-sm">
                     <span>Hình ảnh:</span>
                     <span className="font-bold">{imageMode === 'none' ? 'Không' : imageMode === 'ai' ? `AI (${imageMinCount}-${imageMaxCount} ảnh)` : `Upload (${imageMinCount}-${imageMaxCount} ảnh)`}</span>
                   </div>
                 </div>

                 <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                   <span className="text-lg font-bold text-on-surface-variant">Tổng tạm giữ:</span>
                   <span className="text-3xl font-extrabold text-primary-neon">{totalBudget.toLocaleString()}đ</span>
                 </div>
                 
                 <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4 text-sm text-yellow-400 flex gap-3">
                   <Shield className="shrink-0 mt-0.5" size={18} />
                   <div>
                     <p className="font-bold mb-1">Chiến dịch sẽ chờ Admin duyệt</p>
                     <p className="text-yellow-400/70">Số tiền sẽ được tạm giữ (Escrow) ngay lập tức. Admin sẽ duyệt chiến dịch trong thời gian sớm nhất. Nếu bị từ chối, tiền sẽ được hoàn lại tự động.</p>
                   </div>
                 </div>
               </div>

               <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 bg-surface-container text-on-surface font-bold py-4 rounded-xl hover:bg-surface-container-high transition-colors disabled:opacity-50" disabled={loading}>
                  Quay lại
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex-[2] bg-primary-neon text-surface font-bold py-4 rounded-xl hover:scale-[1.01] transition-transform flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,245,255,0.3)] disabled:opacity-50">
                  {loading ? 'Đang xử lý...' : 'Gửi chiến dịch chờ duyệt'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
