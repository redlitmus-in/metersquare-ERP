import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight,
  Mail,
  CheckCircle,
  Activity,
  ShieldCheck,
  Users,
  Package,
  Clock,
  Shield,
  BarChart3,
  Layers,
  Phone,
  KeyRound,
  User,
  Building2,
  HardHat,
  Briefcase,
  ChevronDown,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import OTPInput from '@/components/OTPInput';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Available roles based on the workflow
const availableRoles = [
  { value: 'technical_director', label: 'Technical Director', icon: Briefcase, color: 'from-purple-500 to-indigo-600' },
  { value: 'project_manager', label: 'Project Manager', icon: Users, color: 'from-blue-500 to-cyan-600' },
  { value: 'procurement', label: 'Procurement', icon: Package, color: 'from-green-500 to-emerald-600' },
  { value: 'estimation', label: 'Estimation', icon: BarChart3, color: 'from-orange-500 to-red-600' },
  { value: 'accounts', label: 'Accounts', icon: Building2, color: 'from-pink-500 to-rose-600' },
  { value: 'design', label: 'Design', icon: Layers, color: 'from-indigo-500 to-purple-600' },
  { value: 'site_supervisor', label: 'Site Supervisor', icon: HardHat, color: 'from-amber-500 to-yellow-600' },
  { value: 'mep_supervisor', label: 'MEP Supervisor', icon: Activity, color: 'from-teal-500 to-green-600' },
  { value: 'factory_supervisor', label: 'Factory Supervisor', icon: Building2, color: 'from-red-500 to-orange-600' },
];

const LoginPageOTP: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !selectedRole) {
      toast.error('Please fill all fields', {
        description: 'Email and role are required'
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      setResendTimer(30);
      
      // For demo purposes, show the OTP
      const demoOTP = '123456';
      toast.success('OTP Sent Successfully!', {
        description: `Demo OTP: ${demoOTP}`,
        duration: 10000,
        icon: <Mail className="w-5 h-5 text-green-500" />
      });
    }, 1500);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Invalid OTP', {
        description: 'Please enter a 6-digit OTP'
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate OTP verification
    setTimeout(() => {
      // For demo, accept 123456 as valid OTP
      if (otp === '123456') {
        setStep('success');
        
        // Store auth data
        const roleData = availableRoles.find(r => r.value === selectedRole);
        localStorage.setItem('access_token', 'otp-demo-token');
        localStorage.setItem('demo_user', JSON.stringify({
          email: email,
          role: roleData?.label || selectedRole,
          name: roleData?.label || 'User'
        }));
        
        toast.success('Login Successful!', {
          description: `Welcome ${roleData?.label}`,
          icon: <CheckCircle className="w-5 h-5 text-green-500" />
        });
        
        // Redirect after animation
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setIsLoading(false);
        toast.error('Invalid OTP', {
          description: 'Please enter the correct OTP'
        });
      }
    }, 1500);
  };

  const handleResendOTP = () => {
    if (resendTimer === 0) {
      setResendTimer(30);
      toast.success('OTP Resent!', {
        description: 'Demo OTP: 123456',
        duration: 10000,
        icon: <RefreshCw className="w-5 h-5 text-green-500" />
      });
    }
  };

  const selectedRoleData = availableRoles.find(r => r.value === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-red-100 to-rose-100 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo Section */}
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-center mb-4">
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 rounded-full blur-2xl opacity-20"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <img
                src="/logo.png"
                alt="MeterSquare"
                className="h-16 w-auto object-contain relative z-10"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            MeterSquare ERP
          </h1>
          <p className="text-gray-500 mt-2">Secure Login with OTP</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-100"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Email & Role Selection */}
            {step === 'email' && (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOTP}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Sign In</h2>
                  <p className="text-sm text-gray-500 mt-1">Enter your email and select role</p>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#243d8a] focus:ring-2 focus:ring-[#243d8a]/20 transition-all duration-200 text-gray-700 placeholder-gray-400"
                    placeholder="user@metersquare.com"
                    required
                  />
                </div>

                {/* Role Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Select Your Role
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#243d8a] focus:ring-2 focus:ring-[#243d8a]/20 transition-all duration-200 text-gray-700 text-left flex items-center justify-between"
                    >
                      {selectedRoleData ? (
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedRoleData.color} flex items-center justify-center`}>
                            <selectedRoleData.icon className="w-4 h-4 text-white" />
                          </div>
                          <span>{selectedRoleData.label}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Choose your role...</span>
                      )}
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showRoleDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                        >
                          <div className="max-h-64 overflow-y-auto">
                            {availableRoles.map((role) => (
                              <button
                                key={role.value}
                                type="button"
                                onClick={() => {
                                  setSelectedRole(role.value);
                                  setShowRoleDropdown(false);
                                }}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                                  <role.icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-gray-700">{role.label}</span>
                                {selectedRole === role.value && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !email || !selectedRole}
                  className="w-full bg-gradient-to-r from-[#243d8a] to-indigo-600 hover:from-[#1d3270] hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Enter OTP</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    We've sent a 6-digit code to
                  </p>
                  <p className="text-sm font-medium text-gray-700 mt-1">{email}</p>
                  {selectedRoleData && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className={`w-6 h-6 rounded bg-gradient-to-br ${selectedRoleData.color} flex items-center justify-center`}>
                        <selectedRoleData.icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs text-gray-600">{selectedRoleData.label}</span>
                    </div>
                  )}
                </div>

                {/* OTP Input */}
                <div className="space-y-4">
                  <OTPInput
                    value={otp}
                    onChange={setOtp}
                    onComplete={handleVerifyOTP}
                    disabled={isLoading}
                  />
                  
                  {/* Timer and Resend */}
                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-sm text-gray-500">
                        Resend OTP in <span className="font-semibold text-[#243d8a]">{resendTimer}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        className="text-sm font-medium text-[#243d8a] hover:text-[#243d8a]/80 transition-colors"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                {/* Verify Button */}
                <motion.button
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-[#243d8a] to-indigo-600 hover:from-[#1d3270] hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <span>Verify & Login</span>
                      <Lock className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← Back to email
                </button>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
                <p className="text-gray-600">Login successful. Redirecting...</p>
                {selectedRoleData && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedRoleData.color} flex items-center justify-center`}>
                      <selectedRoleData.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{selectedRoleData.label}</span>
                  </div>
                )}
                <motion.div
                  className="mt-6"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "linear" }}
                >
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Security & Features */}
        <motion.div
          className="mt-8 flex items-center justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 text-gray-500">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs">Secure OTP</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Activity className="w-4 h-4 text-[#243d8a]" />
            <span className="text-xs">Role-Based Access</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Modern UI</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPageOTP;