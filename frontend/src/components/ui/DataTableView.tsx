/**
 * DataTableView Component
 * A modern data table alternative to card-based layouts with sorting, filtering, and actions
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Eye,
  CheckCircle,
  XCircle,
  MoreVertical,
  Filter,
  Download,
  History,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Separator } from './separator';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface DataTableViewProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onViewDetails?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onViewHistory?: (id: number) => void;
  selectable?: boolean;
  actions?: boolean;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  pageSize?: number;
  sticky?: boolean;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  data,
  columns,
  onRowClick,
  onApprove,
  onReject,
  onViewDetails,
  onEdit,
  onDelete,
  onViewHistory,
  selectable = false,
  actions = true,
  className = '',
  emptyMessage = 'No data available',
  isLoading = false,
  pageSize = 10,
  sticky = false
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [data, sortColumn, sortOrder]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(data.length / rowsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, index) => index)));
    }
  };

  const handleSelectRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'pending';
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      under_review: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return statusColors[statusLower] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          <div className="h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {showBulkActions && selectedRows.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-50 border-b border-indigo-200 px-4 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-700">
                {selectedRows.size} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onApprove && selectedRows.forEach(i => onApprove(paginatedData[i].purchase_id))}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject && selectedRows.forEach(i => onReject(paginatedData[i].purchase_id))}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedRows(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`bg-gray-50 border-b border-gray-200 ${sticky ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      {column.label}
                      {sortColumn === column.key && (
                        sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIndex * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${selectedRows.has(rowIndex) ? 'bg-indigo-50' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(rowIndex);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;

                    // Special rendering for status columns
                    if (column.key.includes('status')) {
                      return (
                        <td key={column.key} className={`px-4 py-4 text-${column.align || 'left'} ${column.className || ''}`}>
                          <Badge className={getStatusBadge(value)}>
                            {displayValue}
                          </Badge>
                        </td>
                      );
                    }

                    return (
                      <td key={column.key} className={`px-4 py-4 text-${column.align || 'left'} text-sm text-gray-900 ${column.className || ''}`}>
                        {displayValue || '-'}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="px-4 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === rowIndex ? null : rowIndex);
                          }}
                          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>

                        <AnimatePresence>
                          {activeDropdown === rowIndex && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 z-20 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200"
                            >
                              <div className="py-1">
                                {onViewDetails && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewDetails(row.purchase_id || row.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </button>
                                )}
                                {onApprove && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApprove(row.purchase_id || row.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Approve
                                  </button>
                                )}
                                {onReject && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReject(row.purchase_id || row.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Reject
                                  </button>
                                )}
                                {onEdit && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(row.purchase_id || row.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </button>
                                )}
                                {onViewHistory && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewHistory(row.purchase_id || row.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <History className="h-4 w-4" />
                                    View History
                                  </button>
                                )}
                                {onDelete && (
                                  <>
                                    <Separator className="my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(row.purchase_id || row.id);
                                        setActiveDropdown(null);
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(Number(value))}>
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTableView;