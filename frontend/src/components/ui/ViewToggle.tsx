/**
 * ViewToggle Component
 * Allows users to switch between different view layouts
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Table,
  Columns,
  SplitSquareVertical,
  Grid3X3,
  List
} from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export type ViewType = 'cards' | 'table' | 'kanban' | 'split' | 'bento' | 'list';

interface ViewOption {
  value: ViewType;
  label: string;
  icon: React.ElementType;
  description?: string;
}

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  availableViews?: ViewType[];
  className?: string;
  variant?: 'dropdown' | 'buttons';
}

const viewOptions: ViewOption[] = [
  {
    value: 'cards',
    label: 'Cards',
    icon: LayoutGrid,
    description: 'Traditional card grid layout'
  },
  {
    value: 'table',
    label: 'Table',
    icon: Table,
    description: 'Data table with sorting and filtering'
  },
  {
    value: 'kanban',
    label: 'Kanban',
    icon: Columns,
    description: 'Drag-and-drop workflow board'
  },
  {
    value: 'split',
    label: 'Split View',
    icon: SplitSquareVertical,
    description: 'Master-detail split layout'
  },
  {
    value: 'bento',
    label: 'Bento Grid',
    icon: Grid3X3,
    description: 'Modern variable grid layout'
  },
  {
    value: 'list',
    label: 'List',
    icon: List,
    description: 'Simple list layout'
  }
];

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  availableViews = ['cards', 'table', 'kanban', 'split'],
  className = '',
  variant = 'buttons'
}) => {
  const filteredOptions = viewOptions.filter(option =>
    availableViews.includes(option.value)
  );

  if (variant === 'dropdown') {
    const currentOption = viewOptions.find(v => v.value === currentView);
    const Icon = currentOption?.icon || LayoutGrid;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={`flex items-center gap-2 ${className}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{currentOption?.label || 'View'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {filteredOptions.map(option => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onViewChange(option.value)}
                className={`flex items-center gap-2 ${currentView === option.value ? 'bg-indigo-50' : ''}`}
              >
                <OptionIcon className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500">{option.description}</div>
                  )}
                </div>
                {currentView === option.value && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button group variant
  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-100 rounded-lg ${className}`}>
      {filteredOptions.map(option => {
        const OptionIcon = option.icon;
        const isActive = currentView === option.value;

        return (
          <motion.button
            key={option.value}
            onClick={() => onViewChange(option.value)}
            className={`
              relative p-2 rounded-md transition-all
              ${isActive
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={option.description}
          >
            <OptionIcon className="h-4 w-4" />
            {isActive && (
              <motion.div
                layoutId="activeView"
                className="absolute inset-0 bg-white rounded-md shadow-sm -z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default ViewToggle;