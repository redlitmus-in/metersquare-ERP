import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BaseDashboard from './BaseDashboard';
import { 
  Calculator, 
  CheckCircle, 
  FileText, 
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  Award,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/config';
import { estimationService } from '@/roles/estimation/services/estimationService';
import { toast } from 'sonner';
import { format } from 'date-fns';


const EstimationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const refreshData = async () => {
    setRefreshing(true);
    try {
      const dashboard = await estimationService.getEstimationDashboard();
      if (dashboard?.estimation_as_receiver) {
        setDashboardMetrics({
          pending: dashboard.estimation_as_receiver.pending_count,
          approved: dashboard.estimation_as_receiver.approved_count,
          rejected: dashboard.estimation_as_receiver.rejected_count,
          totalValue: dashboard.estimation_as_receiver.pending_value
        });
      }
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };


  // Use static counts for dashboard display
  const [dashboardMetrics, setDashboardMetrics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalValue: 0
  });
  
  useEffect(() => {
    // Fetch dashboard metrics
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const dashboard = await estimationService.getEstimationDashboard();
        if (dashboard?.estimation_as_receiver) {
          setDashboardMetrics({
            pending: dashboard.estimation_as_receiver.pending_count,
            approved: dashboard.estimation_as_receiver.approved_count,
            rejected: dashboard.estimation_as_receiver.rejected_count,
            totalValue: dashboard.estimation_as_receiver.pending_value
          });
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);
  
  const pendingPurchases = [];
  const approvedPurchases = [];
  const rejectedPurchases = [];
  const totalEstimated = dashboardMetrics.totalValue;

  const handleNavigateToHub = () => {
    navigate('/estimation');
  };

  const metrics = [
    {
      title: 'Quotes Pending',
      value: dashboardMetrics.pending.toString(),
      change: dashboardMetrics.pending > 0 ? `+${dashboardMetrics.pending}` : '0',
      icon: Calculator,
      color: 'amber'
    },
    {
      title: 'Approved Budgets',
      value: dashboardMetrics.approved.toString(),
      change: dashboardMetrics.approved > 0 ? `+${Math.min(5, dashboardMetrics.approved)}` : '0',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Rejected',
      value: dashboardMetrics.rejected.toString(),
      icon: XCircle,
      color: 'red'
    },
    {
      title: 'Total Estimated',
      value: `AED ${(totalEstimated / 1000000).toFixed(1)}M`,
      change: totalEstimated > 0 ? '+' : '0',
      icon: TrendingUp,
      color: 'purple'
    }
  ];

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { y: -4, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const pulseVariants = {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  };

  const roleSpecificContent = (
    <motion.div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {/* Pending Cost Reviews */}
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
              style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fde68a 100%)' }}>
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={dashboardMetrics.pending > 0 ? pulseVariants : {}}
              className="p-2 bg-amber-100 rounded-lg"
            >
              <Calculator className="w-5 h-5 text-amber-600" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-amber-800">Pending Cost Reviews</h3>
              <p className="text-xs text-amber-600">Requiring immediate attention</p>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                onClick={handleNavigateToHub}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Calculator className="w-4 h-4 mr-1" />
                Review All
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                variant="outline"
                onClick={refreshData}
                disabled={refreshing}
                className="border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-all duration-300"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-8 h-8 text-amber-600" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute inset-0 rounded-full border-2 border-amber-200 border-t-amber-500"
                />
              </div>
            </motion.div>
          ) : dashboardMetrics.pending === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6"
              >
                <div className="relative">
                  <Clock className="w-16 h-16 mx-auto text-amber-300" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-3 h-3 text-white" />
                  </motion.div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-lg font-semibold text-gray-700 mb-2">All Caught Up! 🎉</p>
                <p className="text-sm text-gray-500">No pending cost reviews at this time</p>
                <p className="text-xs text-amber-600 mt-2 font-medium">All purchase requests are up to date</p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <motion.div 
                variants={itemVariants}
                className="relative p-6 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-xl" />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg"
                    >
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </motion.div>
                    <div>
                      <p className="text-lg font-bold text-amber-900 flex items-center gap-2">
                        {dashboardMetrics.pending} Purchase Request{dashboardMetrics.pending > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-600">Awaiting cost analysis review</p>
                      <motion.p 
                        className="text-sm font-semibold text-amber-700 mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        💰 Total Value: AED {dashboardMetrics.totalValue.toLocaleString()}
                      </motion.p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 shadow-md">
                      <Target className="w-3 h-3 mr-1" />
                      High Priority
                    </Badge>
                  </motion.div>
                </div>
                
                <motion.div 
                  className="mt-6 pt-4 border-t border-amber-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={handleNavigateToHub}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Calculator className="w-5 h-5" />
                        <span>Start Cost Analysis Reviews</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          →
                        </motion.div>
                      </div>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </Card>
      </motion.div>

      {/* Cost Analysis Summary */}
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #bfdbfe 100%)' }}>
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 opacity-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <BarChart3 className="w-12 h-12 text-blue-600" />
          </motion.div>
        </div>
        
        <motion.div 
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="p-2 bg-blue-100 rounded-lg"
            whileHover={{ rotate: 5, scale: 1.1 }}
          >
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-blue-900">Cost Analysis Summary</h3>
            <p className="text-xs text-blue-600">Real-time performance metrics</p>
          </div>
        </motion.div>
        
        <motion.div 
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {/* Average Variance */}
          <motion.div 
            variants={itemVariants}
            className="relative p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.02, x: 4 }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Average Variance</span>
              </div>
              <motion.span 
                className="font-bold text-green-600 text-xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                -3.5%
              </motion.span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-b-xl opacity-80" />
          </motion.div>

          {/* Total Estimated */}
          <motion.div 
            variants={itemVariants}
            className="relative p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.02, x: 4 }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 font-medium">Total Estimated</span>
              </div>
              <motion.span 
                className="font-bold text-blue-800 text-xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                AED {(dashboardMetrics.totalValue / 1000000).toFixed(1)}M
              </motion.span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-b-xl opacity-80" />
          </motion.div>

          {/* Pending Value */}
          <motion.div 
            variants={itemVariants}
            className="relative p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.02, x: 4 }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-gray-700 font-medium">Pending Value</span>
              </div>
              <motion.span 
                className="font-bold text-amber-600 text-xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                AED {dashboardMetrics.totalValue.toLocaleString()}
              </motion.span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-b-xl opacity-80" />
          </motion.div>

          {/* Reviews Completed */}
          <motion.div 
            variants={itemVariants}
            className="relative p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300"
            whileHover={{ scale: 1.02, x: 4 }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-2 bg-green-100 rounded-lg"
                  animate={dashboardMetrics.approved > 0 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Award className="w-4 h-4 text-green-600" />
                </motion.div>
                <span className="text-gray-700 font-medium">Reviews Completed</span>
              </div>
              <motion.span 
                className="font-bold text-green-600 text-xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              >
                {dashboardMetrics.approved}
              </motion.span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-b-xl opacity-80" />
          </motion.div>
        </motion.div>
        </Card>
      </motion.div>

      {/* Estimation Activity Overview */}
      <motion.div
        variants={cardVariants}
        whileHover="hover"
        transition={{ duration: 0.3 }}
        className="lg:col-span-2"
      >
        <Card className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 50%, #bbf7d0 100%)' }}>
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-4 opacity-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          >
            <Activity className="w-12 h-12 text-green-600" />
          </motion.div>
        </div>

        <motion.div 
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="p-2 bg-green-100 rounded-lg"
            whileHover={{ rotate: 10, scale: 1.1 }}
          >
            <Activity className="w-5 h-5 text-green-600" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-green-900">Estimation Activity Overview</h3>
            <p className="text-xs text-green-600">Live activity tracking & status updates</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-8 h-8 text-green-600" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Approved Section */}
              {dashboardMetrics.approved > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ y: -4 }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-xl" />
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="p-3 bg-green-100 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </motion.div>
                    <div>
                      <p className="text-2xl font-bold text-green-800">{dashboardMetrics.approved}</p>
                      <p className="text-xs text-gray-600">Approved</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Successfully completed cost analysis</p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="mt-3 h-2 bg-green-200 rounded-full overflow-hidden"
                  >
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 1, duration: 1 }}
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                    />
                  </motion.div>
                </motion.div>
              )}
              
              {/* Pending Section */}
              {dashboardMetrics.pending > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ y: -4 }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-xl" />
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="p-3 bg-amber-100 rounded-lg"
                    >
                      <Clock className="w-5 h-5 text-amber-600" />
                    </motion.div>
                    <div>
                      <p className="text-2xl font-bold text-amber-800">{dashboardMetrics.pending}</p>
                      <p className="text-xs text-gray-600">Pending</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    AED {dashboardMetrics.totalValue.toLocaleString()}
                  </p>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-3 h-2 bg-amber-200 rounded-full overflow-hidden"
                  >
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 w-3/4" />
                  </motion.div>
                </motion.div>
              )}

              {/* Rejected Section */}
              {dashboardMetrics.rejected > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative p-5 bg-white/90 backdrop-blur-sm rounded-xl border border-red-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ y: -4 }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-rose-500 rounded-t-xl" />
                  <div className="flex items-center gap-3 mb-3">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="p-3 bg-red-100 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 text-red-600" />
                    </motion.div>
                    <div>
                      <p className="text-2xl font-bold text-red-800">{dashboardMetrics.rejected}</p>
                      <p className="text-xs text-gray-600">Rejected</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Sent back for revision</p>
                  <div className="mt-3 h-2 bg-red-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-rose-500 w-1/2" />
                  </div>
                </motion.div>
              )}

              {/* No activity - Full width when no data */}
              {dashboardMetrics.approved === 0 && dashboardMetrics.pending === 0 && dashboardMetrics.rejected === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="col-span-full text-center py-12"
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="mb-6"
                  >
                    <div className="relative">
                      <BarChart3 className="w-16 h-16 mx-auto text-green-300" />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 w-16 h-16 mx-auto border-4 border-green-300 rounded-full"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-lg font-semibold text-gray-700 mb-2">Ready for Action! 🚀</p>
                    <p className="text-sm text-gray-500">No recent estimation activity</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">Activity will appear here once purchases are assigned</p>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </Card>
      </motion.div>

    </motion.div>
  );

  return (
    <BaseDashboard
      title="Estimation Dashboard"
      subtitle="Cost analysis and budget management"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default EstimationDashboard;