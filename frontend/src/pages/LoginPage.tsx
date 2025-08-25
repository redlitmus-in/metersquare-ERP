import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { 
  Eye, EyeOff, 
  Sparkles,
  ArrowRight,
  Shield,
  User,
  Lock,
  Palette,
  Ruler,
  Sofa,
  Lamp,
  Flower2,
  Home,
  Paintbrush,
  Scissors,
  Star,
  Briefcase,
  UserCheck,
  HardHat,
  Wrench,
  ShoppingCart,
  DollarSign,
  Building,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/authStore';
import { UserRole, LoginRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional(), // Optional for development role selection
});

type LoginFormData = z.infer<typeof loginSchema>;

// Development role options for easy testing
const developmentRoles = [
  { value: UserRole.BUSINESS_OWNER, label: 'Business Owner', icon: Briefcase, tier: 'Management Tier' },
  { value: UserRole.PROJECT_MANAGER, label: 'Project Manager', icon: UserCheck, tier: 'Management Tier' },
  { value: UserRole.FACTORY_SUPERVISOR, label: 'Factory Supervisor', icon: HardHat, tier: 'Operations Tier' },
  { value: UserRole.SITE_ENGINEER, label: 'Site Engineer', icon: HardHat, tier: 'Operations Tier' },
  { value: UserRole.TECHNICIANS, label: 'Technicians', icon: Wrench, tier: 'Operations Tier' },
  { value: UserRole.PURCHASE_TEAM, label: 'Purchase Team', icon: ShoppingCart, tier: 'Support Tier' },
  { value: UserRole.ACCOUNTS, label: 'Accounts & Finance', icon: DollarSign, tier: 'Support Tier' },
  { value: UserRole.SUB_CONTRACTORS, label: 'Sub Contractors', icon: Building, tier: 'Support Tier' },
  { value: UserRole.VENDOR_MANAGEMENT, label: 'Vendor Management', icon: Truck, tier: 'Support Tier' },
];

// Enhanced Particle component with glow effects
const Particle = ({ x, y, delay, icon: Icon, size = 16, color = "white" }: { 
  x: string; 
  y: string; 
  delay: number; 
  icon: React.ComponentType<any>;
  size?: number;
  color?: string;
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="absolute"
      style={{ 
        left: x, 
        top: y,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0.05, 0.15, 0.05], 
        scale: [1, 1.1, 1],
        y: [-15, 15, -15],
        rotate: [0, 90, 180]
      }}
      transition={{
        duration: 15,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      whileHover={{ 
        scale: 1.3, 
        opacity: 0.3,
        transition: { duration: 0.5 }
      }}
    >
      <Icon className={`w-${size} h-${size} text-${color}-400/30`} />
    </motion.div>
  );
};

// Floating stars component
const FloatingStars = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-yellow-300/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 0.3, 0],
            scale: [0, 0.8, 0],
            rotate: [0, 180],
          }}
          transition={{
            duration: 5 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        >
          <Star className="w-1 h-1" />
        </motion.div>
      ))}
    </div>
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, setDevelopmentRole } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const errorShownRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Watch for role changes
  const watchedRole = watch('role');

  // Show error toast when error occurs (only once per error)
  useEffect(() => {
    // Only show toast if this is a new error and user has actually tried to login
    if (error && !errorShownRef.current && isLoading === false) {
      toast.error(error);
      errorShownRef.current = true;
    }
  }, [error, isLoading]);

  // Reset error flag when error is cleared
  useEffect(() => {
    if (!error) {
      errorShownRef.current = false;
    }
  }, [error]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      // In development mode, we can simulate different role logins
      if (isDevelopmentMode && data.role) {
        // Store the selected role for development testing
        localStorage.setItem('dev_role', data.role);
        setDevelopmentRole(data.role);
        toast.success(`Development mode: Logging in as ${data.role}`);
      }
      
      // Create login request with proper typing
      const loginRequest: LoginRequest = {
        email: data.email,
        password: data.password,
        ...(data.role && { role: data.role })
      };
      
      await login(loginRequest);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the store and shown via toast
    }
  };

  // Handle role selection
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setValue('role', role);
  };

  // Toggle development mode
  const toggleDevelopmentMode = () => {
    setIsDevelopmentMode(!isDevelopmentMode);
    if (!isDevelopmentMode) {
      toast.info('Development mode enabled - Role selection available');
    }
  };

  // Quick development login helper
  const quickDevLogin = (role: string) => {
    setValue('email', 'dev@test.com');
    setValue('password', 'password123');
    setValue('role', role);
    setSelectedRole(role);
    setIsDevelopmentMode(true);
    toast.info(`Quick setup for ${role} role`);
  };

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1,
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  // Enhanced particle positions with colors
  const particles = [
    { x: '10%', y: '15%', delay: 0, icon: Palette, size: 20, color: "blue" },
    { x: '85%', y: '25%', delay: 1, icon: Ruler, size: 16, color: "green" },
    { x: '15%', y: '70%', delay: 2, icon: Sofa, size: 18, color: "purple" },
    { x: '80%', y: '60%', delay: 3, icon: Lamp, size: 14, color: "yellow" },
    { x: '90%', y: '80%', delay: 4, icon: Flower2, size: 16, color: "pink" },
    { x: '5%', y: '45%', delay: 5, icon: Home, size: 18, color: "blue" },
    { x: '75%', y: '10%', delay: 6, icon: Paintbrush, size: 16, color: "orange" },
    { x: '20%', y: '85%', delay: 7, icon: Scissors, size: 14, color: "red" },
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-800 via-purple-800 via-indigo-800 to-slate-800"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"
          animate={{
            background: [
              "linear-gradient(45deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05), rgba(236, 72, 153, 0.05))",
              "linear-gradient(45deg, rgba(236, 72, 153, 0.05), rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05))",
              "linear-gradient(45deg, rgba(147, 51, 234, 0.05), rgba(236, 72, 153, 0.05), rgba(59, 130, 246, 0.05))",
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Enhanced Particle Background */}
      <div className="absolute inset-0">
        {particles.map((particle, index) => (
          <Particle
            key={index}
            x={particle.x}
            y={particle.y}
            delay={particle.delay}
            icon={particle.icon}
            size={particle.size}
            color={particle.color}
          />
        ))}

        {/* Floating stars */}
        <FloatingStars />

        {/* Enhanced animated gradient orbs */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-400/3 to-blue-600/3 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.02, 0.08, 0.02],
            x: [-20, 20, -20],
            y: [-20, 20, -20],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-60 h-60 bg-gradient-to-br from-red-400/3 to-red-600/3 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.01, 0.05, 0.01],
            x: [20, -20, 20],
            y: [20, -20, 20],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        <motion.div
          className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-br from-green-400/3 to-green-600/3 rounded-full blur-xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.01, 0.04, 0.01],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Enhanced Logo and Branding */}
          <motion.div
            className="text-center mb-8"
            variants={itemVariants}
          >
            <motion.div
              className="mx-auto w-36 h-28 flex items-center justify-center mb-6 relative"
              whileHover={{ 
                scale: 1.05,
                transition: { type: "spring", stiffness: 300 }
              }}
            >
              {/* Glow effect behind logo */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              <motion.div
                className="relative z-10 bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/30 shadow-2xl"
                whileHover={{
                  boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.4)",
                }}
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(59, 130, 246, 0.2)",
                    "0 0 40px rgba(59, 130, 246, 0.4)",
                    "0 0 20px rgba(59, 130, 246, 0.2)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <img 
                  src="/logo.png" 
                  alt="Meter Square Interiors LLC" 
                  className="h-full w-auto object-contain"
                />
              </motion.div>
            </motion.div>
            
            <motion.div
              className="flex items-center justify-center space-x-2"
              variants={itemVariants}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-red-500" />
              </motion.div>
              <span className="text-sm text-gray-300 font-medium">Interior Design Excellence</span>
              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-red-500" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Enhanced Login Form */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl relative overflow-hidden">
              {/* Animated border glow */}
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: "linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.3), transparent)",
                }}
                animate={{
                  background: [
                    "linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.3), transparent)",
                    "linear-gradient(45deg, transparent, rgba(147, 51, 234, 0.3), transparent)",
                    "linear-gradient(45deg, transparent, rgba(236, 72, 153, 0.3), transparent)",
                    "linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.3), transparent)",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              <div className="relative z-10">
                <CardHeader className="text-center pb-4">
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <CardTitle className="text-xl font-bold text-white">
                      Welcome Back
                    </CardTitle>
                  </motion.div>
                  <p className="text-gray-400 text-xs">
                    Sign in to your workspace
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email Field */}
                    <motion.div 
                      className="space-y-1"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Label htmlFor="email" className="text-gray-300 text-xs">
                        Email Address
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          {...register('email')}
                          id="email"
                          type="email"
                          className="pl-9 h-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm transition-all duration-300"
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-400"
                        >
                          {errors.email.message}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Password Field */}
                    <motion.div 
                      className="space-y-1"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Label htmlFor="password" className="text-gray-300 text-xs">
                        Password
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          {...register('password')}
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          className="pl-9 pr-9 h-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm transition-all duration-300"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-400"
                        >
                          {errors.password.message}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* Development Mode Toggle */}
                    <motion.div 
                      className="flex items-center justify-between"
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={toggleDevelopmentMode}
                          aria-label={`${isDevelopmentMode ? 'Disable' : 'Enable'} development mode`}
                          title={`${isDevelopmentMode ? 'Disable' : 'Enable'} development mode`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 ${
                            isDevelopmentMode ? 'bg-blue-500' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isDevelopmentMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <Label className="text-gray-300 text-xs cursor-pointer" onClick={toggleDevelopmentMode}>
                          Development Mode
                        </Label>
                      </div>
                      {isDevelopmentMode && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-xs text-blue-400 font-medium"
                        >
                          Role Testing Enabled
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Role Selection Dropdown (Development Mode Only) */}
                    {isDevelopmentMode && (
                      <motion.div 
                        className="space-y-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <Label className="text-gray-300 text-xs">
                          Test Role (Development)
                        </Label>
                        <Select value={selectedRole} onValueChange={handleRoleChange}>
                          <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm transition-all duration-300">
                            <SelectValue placeholder="Select a role to test..." />
                          </SelectTrigger>
                          <SelectContent>
                            {developmentRoles.map((role) => {
                              const IconComponent = role.icon;
                              return (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center space-x-2">
                                    <IconComponent className="h-4 w-4" />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{role.label}</span>
                                      <span className="text-xs text-gray-400">{role.tier}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {selectedRole && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-blue-400"
                          >
                            Testing as: {developmentRoles.find(r => r.value === selectedRole)?.label}
                          </motion.p>
                        )}
                      </motion.div>
                    )}

                    {/* Enhanced Submit Button */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 text-sm font-semibold shadow-lg hover:shadow-xl bg-blue-500 hover:bg-blue-600 text-white relative overflow-hidden group transition-colors duration-300"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          {isLoading ? (
                            <LoadingSpinner size="sm" color="white" />
                          ) : (
                            <>
                              <span>Sign In</span>
                              <motion.div
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                              >
                                <ArrowRight className="w-4 h-4" />
                              </motion.div>
                            </>
                          )}
                        </div>
                      </Button>
                    </motion.div>
                  </form>

                  {/* Enhanced Security Badge */}
                  <motion.div
                    className="flex items-center justify-center space-x-2 text-gray-400 text-xs pt-4 border-t border-white/10"
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Shield className="w-3 h-3" />
                    </motion.div>
                    <span>Enterprise-grade security</span>
                  </motion.div>

                  {/* Development Quick Login Helpers */}
                  {isDevelopmentMode && (
                    <motion.div
                      className="pt-4 border-t border-white/10"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-xs text-gray-400 mb-2 text-center">Quick Development Login:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {developmentRoles.slice(0, 6).map((role) => (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => quickDevLogin(role.value)}
                            className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-gray-300 hover:text-white transition-colors"
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;