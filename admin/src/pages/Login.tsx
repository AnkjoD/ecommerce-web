import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import authApi from '../apis/auth.api';
import { useAuth } from '@/hooks/use-auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      login(response as any);
      toast.success('Đăng nhập thành công!');
      
      // 🚀 REDIRECT BACK LOGIC
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-display gradient-text">Homura Shop</h1>
            <p className="text-muted-foreground mt-2 font-medium">Bảng điều khiển Quản trị viên</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Email quản trị</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="admin@homura.shop" 
                className="h-12 bg-white/5 border-white/10 focus:border-primary/50 transition-all" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground ml-1">Mật khẩu</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="h-12 bg-white/5 border-white/10 focus:border-primary/50 transition-all" 
                required 
                minLength={6} 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 gap-2 text-base font-bold shadow-lg shadow-primary/20 mt-4" 
              disabled={loading}
            >
              {loading ? 'Đang xác thực...' : <><LogIn size={20} /> Đăng nhập</>}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Hệ thống quản lý nội bộ. Truy cập trái phép sẽ bị ghi lại.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
