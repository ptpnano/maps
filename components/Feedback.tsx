'use client';

import * as React from 'react';
import { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-6 text-center">
          <div className="glass-card p-10 rounded-2xl max-w-md border border-red-500/30">
            <h2 className="text-3xl font-headline font-black text-red-500 mb-4">Ối! Có lỗi xảy ra.</h2>
            <p className="text-on-surface-variant mb-8">
              Chúng tôi rất tiếc vì sự cố này. Vui lòng thử tải lại trang hoặc quay lại sau.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary-neon text-surface font-bold px-8 py-3 rounded-xl hover:scale-105 transition-all"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-neon/20 border-t-primary-neon rounded-full animate-spin shadow-[0_0_15px_rgba(0,245,255,0.3)]"></div>
      <p className="text-primary-neon font-bold animate-pulse tracking-widest uppercase text-xs">Đang tải dữ liệu...</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-surface-container-highest/50 animate-pulse rounded-lg ${className}`}></div>
  );
}
