import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-destructive/20 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display text-foreground">Ối! Đã xảy ra lỗi</h2>
              <p className="text-muted-foreground text-sm">
                Ứng dụng gặp sự cố ngoài ý muốn. Đừng lo lắng, dữ liệu của bạn vẫn an toàn.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-destructive/80 font-bold uppercase mb-1">Error Message</p>
                <p className="text-xs font-mono text-destructive break-words">{this.state.error.message}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="gap-2"
              >
                <Home size={16} /> Trang chủ
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                <RefreshCw size={16} /> Thử lại
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
