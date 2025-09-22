/**
 * BentoGrid Component
 * A modern bento box grid layout alternative to traditional card-based metrics display
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from './badge';
import { Progress } from './progress';

interface BentoItem {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: LucideIcon;
  color?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  chart?: React.ReactNode;
  progress?: number;
  details?: { label: string; value: string | number }[];
  onClick?: () => void;
}

interface BentoGridProps {
  items: BentoItem[];
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'small' | 'medium' | 'large';
  className?: string;
  animate?: boolean;
}

const defaultColumns = {
  mobile: 1,
  tablet: 2,
  desktop: 4
};

export const BentoGrid: React.FC<BentoGridProps> = ({
  items,
  columns = defaultColumns,
  gap = 'medium',
  className = '',
  animate = true
}) => {
  const getGridSpan = (size?: string) => {
    switch (size) {
      case 'xlarge':
        return 'col-span-1 md:col-span-2 lg:col-span-2 row-span-2';
      case 'large':
        return 'col-span-1 md:col-span-2 lg:col-span-2';
      case 'medium':
        return 'col-span-1 md:col-span-1 lg:col-span-1 row-span-2';
      default:
        return 'col-span-1';
    }
  };

  const getGapClass = () => {
    switch (gap) {
      case 'small':
        return 'gap-2';
      case 'large':
        return 'gap-6';
      default:
        return 'gap-4';
    }
  };

  const getColorClasses = (color?: string) => {
    const colorMap: { [key: string]: string } = {
      blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-900',
      green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-900',
      red: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-900',
      yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-900',
      purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-900',
      indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900',
      gray: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-gray-900',
      orange: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-900',
      teal: 'bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 text-teal-900',
      pink: 'bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 text-pink-900'
    };
    return colorMap[color || 'gray'] || colorMap.gray;
  };

  const getTrendIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 bg-green-100';
      case 'decrease':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div
      className={`bento-grid grid grid-cols-${columns.mobile} md:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop} ${getGapClass()} ${className}`}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isClickable = !!item.onClick;
        const colorClasses = getColorClasses(item.color);
        const spanClass = getGridSpan(item.size);

        return (
          <motion.div
            key={item.id}
            initial={animate ? { opacity: 0, scale: 0.95 } : undefined}
            animate={animate ? { opacity: 1, scale: 1 } : undefined}
            transition={animate ? { delay: index * 0.05, duration: 0.3 } : undefined}
            whileHover={isClickable ? { scale: 1.02 } : undefined}
            className={`${spanClass}`}
          >
            <div
              onClick={item.onClick}
              className={`
                bento-item h-full p-4 md:p-6 rounded-xl border-2 transition-all
                ${colorClasses}
                ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}
                ${item.size === 'xlarge' || item.size === 'medium' ? 'flex flex-col' : ''}
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium opacity-80 mb-1">{item.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl md:text-3xl font-bold">
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </p>
                    {item.change !== undefined && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(item.changeType)}`}>
                        {getTrendIcon(item.changeType)}
                        <span>{Math.abs(item.change)}%</span>
                      </div>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs opacity-70 mt-1">{item.subtitle}</p>
                  )}
                </div>
                {Icon && (
                  <div className="p-2 rounded-lg bg-white bg-opacity-50">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 opacity-80" />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {item.progress !== undefined && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="opacity-70">Progress</span>
                    <span className="font-medium">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              )}

              {/* Chart */}
              {item.chart && (
                <div className="flex-1 min-h-[100px] mb-3">
                  {item.chart}
                </div>
              )}

              {/* Details List */}
              {item.details && item.details.length > 0 && (
                <div className={`space-y-2 ${item.size === 'xlarge' || item.size === 'medium' ? 'mt-auto' : 'mt-3'} pt-3 border-t border-opacity-20`}>
                  {item.details.map((detail, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="opacity-70">{detail.label}</span>
                      <span className="font-medium">
                        {typeof detail.value === 'number' ? detail.value.toLocaleString() : detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Preset Bento Grid Layouts
export const BentoGridPresets = {
  dashboard: (items: BentoItem[]) => {
    // Automatically assign sizes for a balanced dashboard layout
    const sizedItems = items.map((item, index) => {
      if (index === 0) return { ...item, size: 'xlarge' as const };
      if (index === 1 || index === 2) return { ...item, size: 'medium' as const };
      return { ...item, size: 'small' as const };
    });
    return sizedItems;
  },

  metrics: (items: BentoItem[]) => {
    // Equal-sized metric cards
    return items.map(item => ({ ...item, size: 'small' as const }));
  },

  featured: (items: BentoItem[]) => {
    // First item featured, rest are small
    const sizedItems = items.map((item, index) => {
      if (index === 0) return { ...item, size: 'xlarge' as const };
      return { ...item, size: 'small' as const };
    });
    return sizedItems;
  },

  mixed: (items: BentoItem[]) => {
    // Mixed layout with variety
    const sizes = ['xlarge', 'medium', 'small', 'large', 'small', 'medium'] as const;
    return items.map((item, index) => ({
      ...item,
      size: sizes[index % sizes.length]
    }));
  }
};

export default BentoGrid;