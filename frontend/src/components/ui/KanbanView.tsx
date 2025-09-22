/**
 * KanbanView Component
 * A modern kanban board alternative to card-based layouts with drag-and-drop functionality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  MapPin,
  DollarSign,
  Package,
  ChevronRight,
  Plus,
  Filter,
  History
} from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Separator } from './separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  icon: React.ElementType;
}

interface KanbanItem {
  id: number;
  title: string;
  subtitle?: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  date?: string;
  location?: string;
  amount?: number;
  itemCount?: number;
  tags?: string[];
  [key: string]: any;
}

interface KanbanViewProps {
  data: KanbanItem[];
  columns?: KanbanColumn[];
  onItemClick?: (item: KanbanItem) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onViewDetails?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onViewHistory?: (id: number) => void;
  onStatusChange?: (itemId: number, newStatus: string) => void;
  draggable?: boolean;
  className?: string;
  isLoading?: boolean;
}

const defaultColumns: KanbanColumn[] = [
  { id: 'pending', title: 'Pending', color: 'bg-yellow-100 border-yellow-300', icon: Clock },
  { id: 'approved', title: 'Approved', color: 'bg-green-100 border-green-300', icon: CheckCircle },
  { id: 'rejected', title: 'Rejected', color: 'bg-red-100 border-red-300', icon: XCircle },
  { id: 'completed', title: 'Completed', color: 'bg-blue-100 border-blue-300', icon: AlertCircle }
];

export const KanbanView: React.FC<KanbanViewProps> = ({
  data,
  columns = defaultColumns,
  onItemClick,
  onApprove,
  onReject,
  onViewDetails,
  onEdit,
  onDelete,
  onViewHistory,
  onStatusChange,
  draggable = true,
  className = '',
  isLoading = false
}) => {
  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [items, setItems] = useState<KanbanItem[]>(data);
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set(columns.map(c => c.id)));

  useEffect(() => {
    setItems(data);
  }, [data]);

  const handleDragStart = (e: React.DragEvent, item: KanbanItem) => {
    if (!draggable) return;
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId: string) => {
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedItem || !draggable) return;

    const updatedItems = items.map(item =>
      item.id === draggedItem.id ? { ...item, status: columnId } : item
    );
    setItems(updatedItems);

    if (onStatusChange) {
      onStatusChange(draggedItem.id, columnId);
    }

    setDraggedItem(null);
    setDraggedOverColumn(null);
  };

  const toggleColumn = (columnId: string) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(columnId)) {
      newExpanded.delete(columnId);
    } else {
      newExpanded.add(columnId);
    }
    setExpandedColumns(newExpanded);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getColumnItems = (columnId: string) => {
    return items.filter(item => {
      const status = item.status?.toLowerCase() || 'pending';
      return status === columnId.toLowerCase();
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse space-x-4 flex w-full">
          {columns.map(column => (
            <div key={column.id} className="flex-1 h-96 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`kanban-view ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnItems = getColumnItems(column.id);
          const Icon = column.icon;
          const isExpanded = expandedColumns.has(column.id);

          return (
            <motion.div
              key={column.id}
              className={`kanban-column ${column.color} border-2 rounded-lg transition-all ${
                draggedOverColumn === column.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-3 border-b bg-white bg-opacity-50">
                <button
                  onClick={() => toggleColumn(column.id)}
                  className="w-full flex items-center justify-between hover:bg-white hover:bg-opacity-30 rounded-lg p-1 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {columnItems.length}
                    </Badge>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              </div>

              {/* Column Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-3 space-y-3 overflow-y-auto"
                    style={{ maxHeight: '600px' }}
                  >
                    {columnItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No items
                      </div>
                    ) : (
                      columnItems.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          draggable={draggable}
                          onDragStart={(e) => handleDragStart(e, item)}
                          className={`kanban-item bg-white rounded-lg shadow-sm border border-gray-200 p-3 ${
                            draggable ? 'cursor-move' : 'cursor-pointer'
                          } hover:shadow-md transition-shadow`}
                          onClick={() => onItemClick?.(item)}
                        >
                          {/* Item Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {item.title}
                              </h4>
                              {item.subtitle && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdown(activeDropdown === item.id ? null : item.id);
                                }}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-400" />
                              </button>

                              <AnimatePresence>
                                {activeDropdown === item.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute right-0 z-30 mt-1 w-40 rounded-lg bg-white shadow-lg border border-gray-200"
                                  >
                                    <div className="py-1">
                                      {onViewDetails && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onViewDetails(item.id);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                          <Eye className="h-3 w-3" />
                                          View Details
                                        </button>
                                      )}
                                      {onApprove && column.id === 'pending' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onApprove(item.id);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                          Approve
                                        </button>
                                      )}
                                      {onReject && column.id === 'pending' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onReject(item.id);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                        >
                                          <XCircle className="h-3 w-3" />
                                          Reject
                                        </button>
                                      )}
                                      {onEdit && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(item.id);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                          <Edit className="h-3 w-3" />
                                          Edit
                                        </button>
                                      )}
                                      {onViewHistory && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onViewHistory(item.id);
                                            setActiveDropdown(null);
                                          }}
                                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                          <History className="h-3 w-3" />
                                          History
                                        </button>
                                      )}
                                      {onDelete && (
                                        <>
                                          <Separator className="my-1" />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDelete(item.id);
                                              setActiveDropdown(null);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Item Details */}
                          <div className="space-y-1.5">
                            {item.priority && (
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs px-1.5 py-0.5 ${getPriorityColor(item.priority)}`}>
                                  {item.priority}
                                </Badge>
                              </div>
                            )}

                            {item.assignee && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <User className="h-3 w-3" />
                                <span className="truncate">{item.assignee}</span>
                              </div>
                            )}

                            {item.date && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Calendar className="h-3 w-3" />
                                <span>{item.date}</span>
                              </div>
                            )}

                            {item.location && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}

                            {item.amount && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800">
                                <DollarSign className="h-3 w-3" />
                                <span>AED {item.amount.toLocaleString()}</span>
                              </div>
                            )}

                            {item.itemCount && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Package className="h-3 w-3" />
                                <span>{item.itemCount} items</span>
                              </div>
                            )}

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanView;