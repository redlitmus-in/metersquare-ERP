import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  ArrowRight,
  Lock,
  Mail,
  CheckCircle,
  Activity,
  ShieldCheck,
  Building2,
  Users,
  FileText,
  Package,
  TrendingUp,
  Clock,
  CheckSquare,
  BarChart3,
  Truck,
  ClipboardList,
  Settings,
  Layers,
  Shield,
  TrendingUp as LineChart,
  PieChart,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/authStore';
import { LoginRequest } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Credential Card Component
const CredentialCard: React.FC<{
  role: string;
  email: string;
  password: string;
  delay: number;
  onClick: () => void;
}> = ({ role, email, password, delay, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{role}</span>
        <div className="flex flex-col items-end gap-1">
          <code className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-mono group-hover:bg-blue-100">
            {email}
          </code>
          <code className="text-xs text-gray-500">Pass: {password}</code>
        </div>
      </div>
    </motion.div>
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  
  // Demo credentials
  const demoCredentials = [
    { role: 'Technical Director', email: 'td@demo.com', password: 'demo123' },
    { role: 'Project Manager', email: 'pm@demo.com', password: 'demo123' },
    { role: 'Procurement Lead', email: 'proc@demo.com', password: 'demo123' }
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  
  // Handle demo credential click
  const handleDemoClick = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    // Auto-submit the form
    setTimeout(() => {
      handleSubmit(onSubmit)();
    }, 100);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Check if this is a demo credential
      const isDemoUser = demoCredentials.some(cred => cred.email === data.email);
      
      if (isDemoUser) {
        // For demo users, create a mock successful login
        const demoUser = demoCredentials.find(cred => cred.email === data.email);
        if (demoUser && data.password === demoUser.password) {
          // Simulate successful login
          localStorage.setItem('access_token', 'demo-token');
          localStorage.setItem('demo_user', JSON.stringify({
            email: demoUser.email,
            role: demoUser.role,
            name: demoUser.role
          }));
          
          // Update auth store to trigger re-render
          await useAuthStore.getState().getCurrentUser();
          
          toast.success('Welcome to MeterSquare ERP', {
            description: `Logged in as ${demoUser.role}`,
            icon: <CheckCircle className="w-5 h-5 text-green-500" />
          });
          
          // Navigate to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 500);
          return;
        } else {
          throw new Error('Invalid demo password');
        }
      }
      
      // For non-demo users, use the regular login
      const loginRequest: LoginRequest = {
        email: data.email,
        password: data.password,
      };
      
      await login(loginRequest);
      toast.success('Welcome to MeterSquare ERP', {
        description: 'Login successful. Redirecting to dashboard...',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Login failed', {
        description: error.message || 'Invalid credentials. Please try again.'
      });
    }
  };

  return (
    <>
      <style>{`
        @keyframes sparkle {
          0% { 
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% { 
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          100% { 
            opacity: 0;
            transform: scale(0) rotate(360deg);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
        
        .shine-effect {
          position: relative;
          overflow: hidden;
        }
        
        .shine-effect::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 20%,
            rgba(255, 255, 255, 0.7) 50%,
            rgba(255, 255, 255, 0.3) 80%,
            transparent 100%
          );
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .shine-active::before {
          animation: shineSwipe 0.8s ease-out;
        }
        
        @keyframes shineSwipe {
          0% {
            left: -100%;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }
        
        @keyframes sineWave1 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 8px 25px rgba(192, 192, 192, 0.4), 0 0 15px rgba(255, 255, 255, 0.6);
            background: linear-gradient(135deg, #f8fafc, #fff, #f1f5f9);
          }
          25% { 
            transform: translateY(-4px) rotate(calc(var(--rotation) + 1deg)) scale(1.02);
            box-shadow: 0 12px 35px rgba(192, 192, 192, 0.6), 0 0 20px rgba(255, 255, 255, 0.8);
            background: linear-gradient(135deg, #e2e8f0, #f8fafc, #cbd5e1);
          }
          75% { 
            transform: translateY(2px) rotate(calc(var(--rotation) - 1deg)) scale(0.98);
            box-shadow: 0 6px 20px rgba(192, 192, 192, 0.3), 0 0 12px rgba(255, 255, 255, 0.5);
            background: linear-gradient(135deg, #f1f5f9, #fff, #e2e8f0);
          }
        }
        
        @keyframes sineWave2 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15);
            background: linear-gradient(135deg, #f0f9ff, #fff);
          }
          35% { 
            transform: translateY(-6px) rotate(calc(var(--rotation) + 1deg)) scale(1.03);
            box-shadow: 0 10px 35px rgba(59, 130, 246, 0.3);
            background: linear-gradient(135deg, #dbeafe, #f0f9ff);
          }
          85% { 
            transform: translateY(3px) rotate(calc(var(--rotation) - 2deg)) scale(0.97);
            box-shadow: 0 2px 15px rgba(59, 130, 246, 0.2);
            background: linear-gradient(135deg, #eff6ff, #fff);
          }
        }
        
        @keyframes sineWave3 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
            background: linear-gradient(135deg, #f0fdf4, #fff);
          }
          45% { 
            transform: translateY(-10px) rotate(calc(var(--rotation) + 3deg)) scale(1.04);
            box-shadow: 0 12px 40px rgba(16, 185, 129, 0.35);
            background: linear-gradient(135deg, #dcfce7, #f0fdf4);
          }
          80% { 
            transform: translateY(2px) rotate(calc(var(--rotation) - 1deg)) scale(0.99);
            box-shadow: 0 3px 18px rgba(16, 185, 129, 0.25);
            background: linear-gradient(135deg, #f7fee7, #fff);
          }
        }
        
        @keyframes sineWave4 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 4px 20px rgba(168, 85, 247, 0.15);
            background: linear-gradient(135deg, #faf5ff, #fff);
          }
          55% { 
            transform: translateY(-7px) rotate(calc(var(--rotation) + 2deg)) scale(1.02);
            box-shadow: 0 9px 32px rgba(168, 85, 247, 0.3);
            background: linear-gradient(135deg, #e9d5ff, #faf5ff);
          }
          90% { 
            transform: translateY(5px) rotate(calc(var(--rotation) - 3deg)) scale(0.98);
            box-shadow: 0 2px 16px rgba(168, 85, 247, 0.2);
            background: linear-gradient(135deg, #f3e8ff, #fff);
          }
        }
        
        @keyframes sineWave5 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 4px 20px rgba(245, 101, 101, 0.15);
            background: linear-gradient(135deg, #fef2f2, #fff);
          }
          30% { 
            transform: translateY(-9px) rotate(calc(var(--rotation) + 1deg)) scale(1.03);
            box-shadow: 0 11px 36px rgba(245, 101, 101, 0.32);
            background: linear-gradient(135deg, #fee2e2, #fef2f2);
          }
          70% { 
            transform: translateY(4px) rotate(calc(var(--rotation) - 2deg)) scale(0.97);
            box-shadow: 0 3px 17px rgba(245, 101, 101, 0.22);
            background: linear-gradient(135deg, #fef7f7, #fff);
          }
        }
        
        @keyframes sineWave6 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 4px 20px rgba(34, 197, 94, 0.15);
            background: linear-gradient(135deg, #f0fdf4, #fff);
          }
          40% { 
            transform: translateY(-5px) rotate(calc(var(--rotation) + 4deg)) scale(1.01);
            box-shadow: 0 8px 28px rgba(34, 197, 94, 0.28);
            background: linear-gradient(135deg, #dcfce7, #f0fdf4);
          }
          85% { 
            transform: translateY(6px) rotate(calc(var(--rotation) - 1deg)) scale(0.99);
            box-shadow: 0 2px 14px rgba(34, 197, 94, 0.18);
            background: linear-gradient(135deg, #f7fee7, #fff);
          }
        }
        
        @keyframes sineWave7 {
          0%, 100% { 
            transform: translateY(0) rotate(var(--rotation)) scale(1);
            box-shadow: 0 6px 22px rgba(192, 192, 192, 0.25), 0 0 12px rgba(255, 255, 255, 0.6);
            background: linear-gradient(135deg, #f8fafc, #fff, #f1f5f9);
          }
          35% { 
            transform: translateY(-4px) rotate(calc(var(--rotation) + 1deg)) scale(1.02);
            box-shadow: 0 10px 30px rgba(192, 192, 192, 0.45), 0 0 18px rgba(255, 255, 255, 0.8);
            background: linear-gradient(135deg, #e2e8f0, #f8fafc, #cbd5e1);
          }
          70% { 
            transform: translateY(2px) rotate(calc(var(--rotation) - 1deg)) scale(0.98);
            box-shadow: 0 4px 18px rgba(192, 192, 192, 0.2), 0 0 8px rgba(255, 255, 255, 0.4);
            background: linear-gradient(135deg, #f1f5f9, #fff, #e2e8f0);
          }
        }
        
        @keyframes sineWaveHub {
          0%, 100% { 
            transform: translateY(0) scale(1);
            box-shadow: 
              0 8px 32px rgba(239, 68, 68, 0.3),
              0 4px 16px rgba(244, 63, 94, 0.2);
            background: linear-gradient(135deg, #ef4444, #ec4899, #f43f5e);
          }
          50% { 
            transform: translateY(-8px) scale(1.05);
            box-shadow: 
              0 16px 48px rgba(239, 68, 68, 0.4),
              0 8px 24px rgba(244, 63, 94, 0.3),
              0 0 20px rgba(255, 255, 255, 0.6);
            background: linear-gradient(135deg, #f87171, #f472b6, #fb7185);
          }
        }
        
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(10px) scale(0.8); }
          30% { opacity: 1; transform: translateY(-15px) scale(1); }
          100% { opacity: 0; transform: translateY(-35px) scale(0.9); }
        }
        
        .popup-text {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
          padding: 4px 10px;
          border-radius: 14px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          backdrop-filter: blur(8px);
        }
        
        @keyframes showFloat1 { 25% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat2 { 37% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat3 { 50% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat4 { 62% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat5 { 12% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat6 { 75% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat7 { 87% { animation: floatUp 1.2s ease-out; } }
        @keyframes showFloat8 { 0% { animation: floatUp 1.2s ease-out; } }
        
        /* Simple highlight when blue dot crosses */
        .workflow-node:nth-child(1) > div.shine-effect { animation: iconHighlight 0.6s ease-out 2s; }
        .workflow-node:nth-child(2) > div.shine-effect { animation: iconHighlight 0.6s ease-out 3s; }
        .workflow-node:nth-child(3) > div.shine-effect { animation: iconHighlight 0.6s ease-out 4s; }
        .workflow-node:nth-child(4) > div.shine-effect { animation: iconHighlight 0.6s ease-out 5s; }
        .workflow-node:nth-child(5) > div.shine-effect { animation: iconHighlight 0.6s ease-out 6s; }
        .workflow-node:nth-child(6) > div.shine-effect { animation: iconHighlight 0.6s ease-out 7s; }
        .workflow-node:nth-child(7) > div.shine-effect { animation: iconHighlight 0.6s ease-out 8s; }
        .workflow-node:nth-child(8) > div { animation: iconHighlight 0.6s ease-out 10s; }
        
        @keyframes iconHighlight {
          0% { 
            background: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          50% { 
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
          }
          100% { 
            background: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
        }
        
        .workflow-node:nth-child(1) .popup-text { animation: showFloat1 8s infinite ease-in-out; }
        .workflow-node:nth-child(2) .popup-text { animation: showFloat2 8s infinite ease-in-out; }
        .workflow-node:nth-child(3) .popup-text { animation: showFloat3 8s infinite ease-in-out; }
        .workflow-node:nth-child(4) .popup-text { animation: showFloat4 8s infinite ease-in-out; }
        .workflow-node:nth-child(5) .popup-text { animation: showFloat5 8s infinite ease-in-out; }
        .workflow-node:nth-child(6) .popup-text { animation: showFloat6 8s infinite ease-in-out; }
        .workflow-node:nth-child(7) .popup-text { animation: showFloat7 8s infinite ease-in-out; }
        .workflow-node:nth-child(8) .popup-text { animation: showFloat8 6s infinite ease-in-out; }
      `}</style>
      <div className="min-h-screen flex">
      {/* Left Panel - Modern Login Form */}
      <div className="w-full lg:w-2/5 xl:w-5/12 bg-gradient-to-br from-white via-gray-50 to-white flex items-center justify-center p-8 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo Section - Resized */}
          <motion.div 
            className="text-center mb-8"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="MeterSquare Interiors LLC"
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to MeterSquare
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Enterprise Resource Planning System
            </p>
          </motion.div>

          {/* Modern Login Form Card */}
          <motion.div
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-100"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email Address
                </label>
                <motion.div 
                  className="relative"
                  whileFocus={{ scale: 1.01 }}
                >
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-gray-700 placeholder-gray-400"
                    placeholder="user@metersquare.com"
                  />
                </motion.div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500 ml-1"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Password
                </label>
                <motion.div 
                  className="relative"
                  whileFocus={{ scale: 1.01 }}
                >
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 text-gray-700 placeholder-gray-400 pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </motion.div>
                {errors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500 ml-1"
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-gray-600">Keep me signed in</span>
                </label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400 uppercase tracking-wider">Demo Access</span>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">Click any card below to auto-fill and login:</p>
              {demoCredentials.map((cred, index) => (
                <CredentialCard
                  key={cred.email}
                  role={cred.role}
                  email={cred.email}
                  password={cred.password}
                  delay={0.3 + index * 0.1}
                  onClick={() => handleDemoClick(cred.email, cred.password)}
                />
              ))}
            </div>
          </motion.div>

          {/* Security Badges */}
          <motion.div
            className="mt-6 flex items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-1.5 text-gray-500">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs">SSL Secured</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-xs">99.9% Uptime</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel - Modern Workflow Visualization */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-red-50 via-rose-50 to-red-50 relative overflow-hidden items-center justify-center">
        
        {/* Floating Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-20 w-72 h-72 bg-red-200/30 rounded-full blur-3xl"
            animate={{ 
              x: [0, 30, 0],
              y: [0, -30, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
            animate={{ 
              x: [0, -30, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Enhanced Analytics Icons with Glass Morphism */}
        <div className="absolute top-8 left-8 right-8 flex justify-between">
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-gradient-to-br from-white/25 via-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/30"
            style={{ transform: 'rotate(-5deg)' }}
          >
            <motion.div
              animate={{ 
                y: [0, -4, 0],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <LineChart className="w-7 h-7 text-emerald-600 filter drop-shadow-sm" />
              <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full scale-150 animate-pulse"></div>
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="bg-gradient-to-br from-white/25 via-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/30"
            style={{ transform: 'rotate(3deg)' }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative"
            >
              <PieChart className="w-7 h-7 text-purple-600 filter drop-shadow-sm" />
              <div className="absolute inset-0 bg-purple-400/20 blur-xl rounded-full scale-150 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="bg-gradient-to-br from-white/25 via-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/30"
            style={{ transform: 'rotate(-2deg)' }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.08, 1],
                rotate: [0, 3, -3, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <Target className="w-7 h-7 text-indigo-600 filter drop-shadow-sm" />
              <div className="absolute inset-0 bg-indigo-400/20 blur-xl rounded-full scale-150 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </motion.div>
          </motion.div>
        </div>

        {/* Main Workflow Container */}
        <div className="relative" style={{ width: '900px', height: '600px' }}>
          
          {/* SVG Connections */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 600">
            <defs>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="25%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="75%" stopColor="#a855f7" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
              </linearGradient>
              
              <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
              </linearGradient>
              
              <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="40%" stopColor="#6366f1" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
              </radialGradient>
              
              <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id="shadowGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.3"/>
              </filter>
            </defs>
            
            {/* Static Dotted Connection Lines */}
            <path
              d="M 150 150 Q 280 150 420 150 T 650 150"
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            <path
              d="M 650 150 Q 720 220 650 290"
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            <path
              d="M 650 290 Q 520 290 420 290 T 150 290"
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            <path
              d="M 150 290 Q 80 360 150 430"
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            <path
              d="M 150 430 Q 280 430 420 430 T 650 430"
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 6"
              opacity="0.6"
            />
            
            
            {/* Red Dot - Moving First */}
            <circle
              r="4"
              fill="#ef4444"
              filter="url(#iconGlow)"
              opacity="0.8"
            >
              <animateMotion
                dur="15s"
                repeatCount="indefinite"
                path="M 150 150 Q 280 150 420 150 T 650 150 Q 720 220 650 290 Q 520 290 420 290 T 150 290 Q 80 360 150 430 Q 280 430 420 430 T 700 430 Q 650 430 420 430 Q 370 420 420 400"
              />
            </circle>
            
            {/* Blue Dot - Following Red Dot - Triggers Icon Shine Effect */}
            <circle
              r="4"
              fill="#3b82f6"
              filter="url(#iconGlow)"
              opacity="0.8"
            >
              <animateMotion
                dur="15s"
                repeatCount="indefinite"
                begin="2s"
                path="M 150 150 Q 280 150 420 150 T 650 150 Q 720 220 650 290 Q 520 290 420 290 T 150 290 Q 80 360 150 430 Q 280 430 420 430 T 700 430 Q 650 430 420 430 Q 370 420 420 400"
              />
            </circle>
          </svg>

          {/* Refined Workflow Nodes */}
          <motion.div
            className="absolute workflow-node"
            style={{ left: '100px', top: '100px', transform: 'rotate(-3deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-request"
            >
              <FileText className="w-8 h-8 text-red-500" />
            </motion.div>
            <span className="popup-text">Processing</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Request</span>
          </motion.div>

          <motion.div
            className="absolute workflow-node"
            style={{ left: '370px', top: '100px', transform: 'rotate(2deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-review"
            >
              <ClipboardList className="w-8 h-8 text-red-500" />
            </motion.div>
            <span className="popup-text">Reviewing</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Review</span>
          </motion.div>

          <motion.div
            className="absolute workflow-node"
            style={{ left: '600px', top: '100px', transform: 'rotate(-1deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-approval"
            >
              <CheckSquare className="w-8 h-8 text-blue-500" />
            </motion.div>
            <span className="popup-text">Approving</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Approval</span>
          </motion.div>

          <motion.div
            className="absolute workflow-node"
            style={{ left: '600px', top: '240px', transform: 'rotate(3deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-process"
            >
              <Settings className="w-8 h-8 text-blue-500" />
            </motion.div>
            <span className="popup-text">Executing</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Process</span>
          </motion.div>

          <motion.div
            className="absolute workflow-node"
            style={{ left: '370px', top: '240px', transform: 'rotate(-2deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-production"
            >
              <Package className="w-8 h-8 text-red-500" />
            </motion.div>
            <span className="popup-text">Building</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Production</span>
          </motion.div>

          <motion.div
            className="absolute workflow-node"
            style={{ left: '100px', top: '240px', transform: 'rotate(4deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-dispatch"
            >
              <Truck className="w-8 h-8 text-blue-500" />
            </motion.div>
            <span className="popup-text">Shipping</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Dispatch</span>
          </motion.div>

          <motion.div
            className="absolute workflow-node"
            style={{ left: '100px', top: '380px', transform: 'rotate(-2deg)' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.4, type: "spring" }}
          >
            <motion.div 
              className="bg-white backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 transition-all duration-300 shine-effect"
              id="node-complete"
            >
              <CheckCircle className="w-8 h-8 text-green-500" />
            </motion.div>
            <span className="popup-text">Done!</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-600">Complete</span>
          </motion.div>

          {/* ERP Hub - Center Final Position */}
          <motion.div
            className="absolute workflow-node"
            style={{ left: '370px', top: '380px' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.8, type: "spring" }}
          >
            <div
              className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-4 shadow-lg"
              id="node-hub"
            >
              <Layers className="w-8 h-8 text-white" />
            </div>
            <span className="popup-text">Syncing</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-700">ERP Hub</span>
          </motion.div>
        </div>

        {/* Bottom Info */}
        <motion.div
          className="absolute bottom-10 left-0 right-0 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          <h3 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent">
            Intelligent Workflow Automation
          </h3>
          <p className="text-gray-600 mt-2">Streamline your interior project management</p>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">5min Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Secure & Reliable</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Advanced Analytics</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
};

export default LoginPage;