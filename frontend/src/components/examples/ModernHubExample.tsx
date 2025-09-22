/**
 * Modern Hub Example with All UI Alternatives
 * This example shows how to integrate all the new UI components in a hub page
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Search, Shield,
  CheckSquare, XSquare, Clock, TrendingUp,
  DollarSign, FileText, BarChart3, AlertCircle,
  Filter, X, Building2, MapPin, Package, Users
} from 'lucide-react';

// Import all new UI components
import DataTableView from '@/components/ui/DataTableView';
import KanbanView from '@/components/ui/KanbanView';
import SplitView from '@/components/ui/SplitView';
import BentoGrid, { BentoGridPresets } from '@/components/ui/BentoGrid';
import ViewToggle, { ViewType } from '@/components/ui/ViewToggle';
import { Card, CardContent } from '@/components/ui/card';

// Import the original card component for comparison
import TechnicalDirectorApprovalCard from '@/roles/technical-director/components/TechnicalDirectorApprovalCard';

interface ModernHubExampleProps {
  role: 'technicalDirector' | 'procurement' | 'projectManager' | 'estimation' | 'accounts' | 'siteSupervisor';
  data: any[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onViewDetails?: (id: number) => void;
  onViewHistory?: (id: number) => void;
  onEdit?: (id: number) => void;
}

const ModernHubExample: React.FC<ModernHubExampleProps> = ({
  role,
  data,
  onApprove,
  onReject,
  onViewDetails,
  onViewHistory,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [viewType, setViewType] = useState<ViewType>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate metrics for BentoGrid
  const metrics = useMemo(() => {
    const pending = data.filter(d => d.status === 'pending').length;
    const approved = data.filter(d => d.status === 'approved').length;
    const rejected = data.filter(d => d.status === 'rejected').length;
    const totalValue = data.reduce((sum, d) => sum + (d.amount || 0), 0);
    const avgProcessingTime = 2.5; // Example metric

    return { pending, approved, rejected, totalValue, avgProcessingTime };
  }, [data]);

  // Filter data based on active tab
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Tab filtering
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.status === activeTab);
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id?.toString().includes(searchTerm)
      );
    }

    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    return filtered;
  }, [data, activeTab, searchTerm, statusFilter]);

  // Transform data for different view types
  const getTableColumns = () => [
    { key: 'purchase_id', label: 'ID', sortable: true, width: '80px' },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'site_location', label: 'Location', sortable: true },
    { key: 'status', label: 'Status', sortable: true, width: '120px' },
    { key: 'priority', label: 'Priority', sortable: true, width: '100px' },
    { key: 'amount', label: 'Amount', sortable: true, width: '120px',
      render: (value: number) => `AED ${value?.toLocaleString() || 0}` },
    { key: 'date', label: 'Date', sortable: true, width: '120px' }
  ];

  const getKanbanData = () => {
    return filteredData.map(item => ({
      id: item.purchase_id || item.id,
      title: `PR #${item.purchase_id || item.id}`,
      subtitle: item.purpose || item.title,
      status: item.status,
      priority: item.priority,
      assignee: item.created_by,
      date: item.date,
      location: item.site_location,
      amount: item.amount || item.total_amount,
      itemCount: item.materials?.length || 0,
      tags: item.tags || []
    }));
  };

  const getSplitViewData = () => {
    return filteredData.map(item => ({
      id: item.purchase_id || item.id,
      title: `PR #${item.purchase_id || item.id}`,
      subtitle: item.purpose || item.title,
      status: item.status,
      priority: item.priority,
      date: item.date,
      amount: item.amount || item.total_amount,
      location: item.site_location,
      assignee: item.created_by
    }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Add refresh logic here
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const renderViewContent = () => {
    switch (viewType) {
      case 'table':
        return (
          <DataTableView
            data={filteredData}
            columns={getTableColumns()}
            onApprove={onApprove}
            onReject={onReject}
            onViewDetails={onViewDetails}
            onViewHistory={onViewHistory}
            onEdit={onEdit}
            selectable={true}
            pageSize={10}
            sticky={true}
          />
        );

      case 'kanban':
        return (
          <KanbanView
            data={getKanbanData()}
            onApprove={onApprove}
            onReject={onReject}
            onViewDetails={onViewDetails}
            onViewHistory={onViewHistory}
            onEdit={onEdit}
            draggable={true}
          />
        );

      case 'split':
        return (
          <SplitView
            data={getSplitViewData()}
            onApprove={onApprove}
            onReject={onReject}
            onViewDetails={onViewDetails}
            onViewHistory={onViewHistory}
            onEdit={onEdit}
            resizable={true}
          />
        );

      case 'cards':
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredData.map((item) => (
                <TechnicalDirectorApprovalCard
                  key={item.purchase_id || item.id}
                  purchase={item}
                  onApprove={() => onApprove?.(item.purchase_id || item.id)}
                  onReject={() => onReject?.(item.purchase_id || item.id)}
                  onViewDetails={() => onViewDetails?.(item.purchase_id || item.id)}
                  onViewHistory={() => onViewHistory?.(item.purchase_id || item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Modern Hub Dashboard</h1>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-gray-600">Showing all UI alternatives with view toggle</p>
      </div>

      {/* Metrics Display - BentoGrid */}
      <div className="mb-6">
        <BentoGrid
          items={[
            {
              id: 'pending',
              title: 'Pending Review',
              value: metrics.pending,
              subtitle: 'Awaiting approval',
              icon: Clock,
              color: 'indigo',
              size: 'medium',
              change: 5,
              changeType: 'increase',
              details: [
                { label: 'High Priority', value: 3 },
                { label: 'Medium Priority', value: 5 },
                { label: 'Low Priority', value: 2 }
              ]
            },
            {
              id: 'approved',
              title: 'Approved',
              value: metrics.approved,
              subtitle: 'This month',
              icon: CheckSquare,
              color: 'green',
              change: 12,
              changeType: 'increase',
              progress: 75
            },
            {
              id: 'rejected',
              title: 'Rejected',
              value: metrics.rejected,
              subtitle: 'Requires revision',
              icon: XSquare,
              color: 'red',
              change: 3,
              changeType: 'decrease'
            },
            {
              id: 'value',
              title: 'Total Value',
              value: `AED ${metrics.totalValue.toLocaleString()}`,
              subtitle: 'Active purchases',
              icon: DollarSign,
              color: 'green',
              size: 'large',
              progress: 65,
              details: [
                { label: 'This Week', value: 'AED 45,000' },
                { label: 'This Month', value: 'AED 320,000' }
              ]
            },
            {
              id: 'processing',
              title: 'Avg Processing',
              value: `${metrics.avgProcessingTime} days`,
              subtitle: 'Response time',
              icon: TrendingUp,
              color: 'purple',
              change: 15,
              changeType: 'decrease'
            },
            {
              id: 'users',
              title: 'Active Users',
              value: 24,
              subtitle: 'Online now',
              icon: Users,
              color: 'blue'
            },
            {
              id: 'projects',
              title: 'Active Projects',
              value: 8,
              subtitle: 'In progress',
              icon: Building2,
              color: 'orange',
              size: 'medium',
              progress: 82
            }
          ]}
          columns={{ mobile: 2, tablet: 3, desktop: 4 }}
          gap="medium"
          animate={true}
        />
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {/* View Toggle */}
            <ViewToggle
              currentView={viewType}
              onViewChange={setViewType}
              availableViews={['cards', 'table', 'kanban', 'split']}
              variant="buttons"
            />

            {/* Filter Button */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className={`flex items-center gap-2 ${showFilters ? 'bg-indigo-50' : ''}`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Add more filters as needed */}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900">No items found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try adjusting your filters or search criteria
                </p>
              </CardContent>
            </Card>
          ) : (
            renderViewContent()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernHubExample;