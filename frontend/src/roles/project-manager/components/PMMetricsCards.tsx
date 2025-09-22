/**
 * PM Metrics Cards Component
 * Displays key performance metrics for Project Manager
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Minus, Package, 
  CheckCircle, XCircle, Clock, Activity
} from 'lucide-react';
import { PMDashboardData } from '../services/projectManagerService';

interface PMMetricsCardsProps {
  data: PMDashboardData;
}

// Metrics Carousel Component - Same as PM Hub
const MetricsCarousel: React.FC<{ data: PMDashboardData }> = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const metricCards = [
    {
      title: 'Pending',
      value: data.pendingApprovals,
      icon: Clock,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      bgIcon: 'bg-yellow-100',
      change: data.pendingApprovals > 5 ? '+8%' : '+2%',
      changeColor: 'text-yellow-600'
    },
    {
      title: 'Approved',
      value: data.approvedThisMonth,
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 text-green-700',
      bgIcon: 'bg-green-100',
      change: '+15%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Rejected',
      value: data.rejectedThisMonth,
      icon: XCircle,
      color: 'bg-red-50 border-red-200 text-red-700',
      bgIcon: 'bg-red-100',
      change: '-2%',
      changeColor: 'text-red-600'
    },
    {
      title: 'Total',
      value: data.totalPurchases,
      icon: Package,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      bgIcon: 'bg-blue-100',
      change: '+23',
      changeColor: 'text-blue-600'
    },
    {
      title: 'Processing',
      value: `${data.averageApprovalTime}d`,
      icon: Activity,
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      bgIcon: 'bg-purple-100',
      change: '-12%',
      changeColor: 'text-purple-600'
    },
    {
      title: 'Rate',
      value: `${data.totalPurchases > 0
        ? Math.round((data.approvedThisMonth / (data.approvedThisMonth + data.rejectedThisMonth || 1)) * 100)
        : 0}%`,
      icon: TrendingUp,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      bgIcon: 'bg-indigo-100',
      change: '+5%',
      changeColor: 'text-indigo-600'
    },
    {
      title: 'Critical',
      value: Math.floor(data.pendingApprovals * 0.3),
      icon: TrendingUp,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      bgIcon: 'bg-orange-100',
      change: data.pendingApprovals > 0 ? '+5' : '0',
      changeColor: 'text-orange-600'
    },
    {
      title: 'Projects',
      value: data.recentPurchases?.length || 0,
      icon: Package,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      bgIcon: 'bg-emerald-100',
      change: '+3',
      changeColor: 'text-emerald-600'
    }
  ];

  // Auto-rotate carousel
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [metricCards.length]);

  // Handle manual navigation
  const handleNext = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, metricCards.length - 4));
    // Restart auto-rotation after manual interaction
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
    }, 3000);
  };

  const handlePrev = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, metricCards.length - 4)) % Math.max(1, metricCards.length - 4));
    // Restart auto-rotation after manual interaction
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
    }, 3000);
  };

  // Get visible cards (show 5 at a time on desktop, 3 on tablet, 2 on mobile)
  const visibleCards = metricCards.slice(currentIndex, currentIndex + 5);
  if (visibleCards.length < 5) {
    visibleCards.push(...metricCards.slice(0, 5 - visibleCards.length));
  }

  return (
    <div className="mb-6">
      <div className="relative">
        {/* Navigation Buttons */}
        <button
          onClick={handlePrev}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          aria-label="Previous metrics"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleNext}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          aria-label="Next metrics"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Metrics Cards */}
        <div className="overflow-hidden px-1">
          <motion.div
            className="flex gap-3"
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {visibleCards.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={`${metric.title}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex-1 min-w-0"
                >
                  <div className={`relative overflow-hidden border rounded-lg p-3 ${metric.color} transition-all hover:shadow-md`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600 truncate">{metric.title}</p>
                        <p className="text-lg font-bold mt-1 truncate">{metric.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs font-medium ${metric.changeColor}`}>
                            {metric.change}
                          </span>
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg ${metric.bgIcon}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: Math.max(1, metricCards.length - 4) }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCurrentIndex(index);
                intervalRef.current = setInterval(() => {
                  setCurrentIndex(prev => (prev + 1) % Math.max(1, metricCards.length - 4));
                }, 3000);
              }}
              className={`transition-all ${index === currentIndex
                ? 'w-6 h-1.5 bg-blue-500 rounded-full'
                : 'w-1.5 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400'
              }`}
              aria-label={`Go to metrics page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const PMMetricsCards = MetricsCarousel;