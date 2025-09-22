/**
 * SplitView Component
 * A modern split-pane layout alternative to card-based layouts with master-detail view
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  MapPin,
  Package,
  DollarSign,
  FileText,
  AlertCircle,
  Edit,
  Trash2,
  History,
  Download
} from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Separator } from './separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

interface ListItem {
  id: number;
  title: string;
  subtitle?: string;
  status?: string;
  priority?: string;
  date?: string;
  amount?: number;
  location?: string;
  assignee?: string;
  [key: string]: any;
}

interface SplitViewProps {
  data: ListItem[];
  onItemSelect?: (item: ListItem | null) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onViewHistory?: (id: number) => void;
  renderDetails?: (item: ListItem) => React.ReactNode;
  className?: string;
  isLoading?: boolean;
  defaultSplitRatio?: number;
  minPaneWidth?: number;
  resizable?: boolean;
}

export const SplitView: React.FC<SplitViewProps> = ({
  data,
  onItemSelect,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onViewHistory,
  renderDetails,
  className = '',
  isLoading = false,
  defaultSplitRatio = 0.4,
  minPaneWidth = 300,
  resizable = true
}) => {
  const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(defaultSplitRatio);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startRatioRef = useRef(0);

  // Filter and sort data
  const filteredData = data.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      item.status?.toLowerCase() === filterStatus;

    const matchesPriority = filterPriority === 'all' ||
      item.priority?.toLowerCase() === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      case 'amount':
        return (b.amount || 0) - (a.amount || 0);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });

  const handleItemClick = (item: ListItem) => {
    setSelectedItem(item);
    onItemSelect?.(item);
    if (window.innerWidth < 768) {
      setIsMobileDetailOpen(true);
    }
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    onItemSelect?.(null);
    setIsMobileDetailOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!resizable) return;
    setIsResizing(true);
    startXRef.current = e.clientX;
    startRatioRef.current = splitRatio;
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startXRef.current;
    const deltaRatio = deltaX / containerWidth;
    const newRatio = Math.max(0.2, Math.min(0.8, startRatioRef.current + deltaRatio));

    setSplitRatio(newRatio);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`split-view h-full flex bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* List Pane */}
      <div
        className={`list-pane border-r border-gray-200 overflow-hidden flex flex-col ${
          isMobileDetailOpen ? 'hidden md:flex' : 'flex'
        }`}
        style={{
          width: window.innerWidth >= 768 ? `${splitRatio * 100}%` : '100%',
          minWidth: `${minPaneWidth}px`
        }}
      >
        {/* List Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-white"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="h-10 w-10 mb-3" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.title}</h4>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {item.status && (
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                    )}
                    {item.priority && (
                      <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                    )}
                    {item.date && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                    )}
                    {item.amount && (
                      <span className="text-xs font-medium text-gray-700">
                        AED {item.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resizer */}
      {resizable && window.innerWidth >= 768 && (
        <div
          className={`resizer w-1 hover:w-2 bg-gray-300 hover:bg-indigo-500 transition-all cursor-col-resize ${
            isResizing ? 'bg-indigo-500 w-2' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Detail Pane */}
      <div
        className={`detail-pane flex-1 overflow-hidden ${
          isMobileDetailOpen ? 'fixed inset-0 z-50 bg-white md:relative md:inset-auto' : 'hidden md:block'
        } ${isDetailExpanded ? 'md:absolute md:inset-0 md:z-40' : ''}`}
      >
        {selectedItem ? (
          <div className="h-full flex flex-col">
            {/* Detail Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold truncate">{selectedItem.title}</h2>
                <div className="flex items-center gap-2">
                  {window.innerWidth >= 768 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                    >
                      {isDetailExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCloseDetail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderDetails ? (
                renderDetails(selectedItem)
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">ID</p>
                          <p className="text-sm font-medium">#{selectedItem.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Status</p>
                          <Badge className={getStatusColor(selectedItem.status)}>
                            {selectedItem.status || 'N/A'}
                          </Badge>
                        </div>
                        {selectedItem.priority && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Priority</p>
                            <Badge className={getPriorityColor(selectedItem.priority)}>
                              {selectedItem.priority}
                            </Badge>
                          </div>
                        )}
                        {selectedItem.date && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Date</p>
                            <p className="text-sm flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {selectedItem.date}
                            </p>
                          </div>
                        )}
                        {selectedItem.location && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Location</p>
                            <p className="text-sm flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {selectedItem.location}
                            </p>
                          </div>
                        )}
                        {selectedItem.assignee && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Assignee</p>
                            <p className="text-sm flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {selectedItem.assignee}
                            </p>
                          </div>
                        )}
                        {selectedItem.amount && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Amount</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              AED {selectedItem.amount.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Additional Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="details" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="details">Details</TabsTrigger>
                          <TabsTrigger value="history">History</TabsTrigger>
                          <TabsTrigger value="notes">Notes</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="space-y-4">
                          <p className="text-sm text-gray-600">
                            {selectedItem.subtitle || 'No additional details available.'}
                          </p>
                        </TabsContent>
                        <TabsContent value="history">
                          <p className="text-sm text-gray-600">No history available.</p>
                        </TabsContent>
                        <TabsContent value="notes">
                          <p className="text-sm text-gray-600">No notes available.</p>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {onApprove && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApprove(selectedItem.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {onReject && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReject(selectedItem.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(selectedItem.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                        {onViewHistory && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewHistory(selectedItem.id)}
                          >
                            <History className="h-4 w-4 mr-2" />
                            History
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(selectedItem.id)}
                            className="text-red-600 hover:text-red-700 col-span-2"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <FileText className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No item selected</p>
            <p className="text-sm mt-2">Select an item from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitView;