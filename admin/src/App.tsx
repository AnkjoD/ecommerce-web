import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ui/ErrorBoundary";

const queryClient = new QueryClient();

function AuthGate() {
  const { user, status } = useAuth();
  const location = useLocation();

  console.log('[AuthGate] Current status:', status, '| User:', user?.email || 'null');

  // Đợi cho đến khi kết thúc quá trình khởi tạo (check session lần đầu)
  if (status === 'initializing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-display gradient-text animate-pulse">Homura Shop</h1>
          <p className="text-muted-foreground mt-2">Đang xác thực phiên làm việc...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={status === 'authenticated' ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={status === 'authenticated' ? <Index /> : <Navigate to="/login" state={{ from: location }} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ErrorBoundary>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthGate />
          </BrowserRouter>
        </TooltipProvider>
      </ErrorBoundary>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
