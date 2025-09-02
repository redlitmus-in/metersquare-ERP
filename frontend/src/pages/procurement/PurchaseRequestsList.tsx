import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatDate, parseDateFromDDMMYYYY } from '@/utils/dateFormatter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign,
  Building,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Eye,
  Edit,
  Trash2,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DocumentViewModal from '@/components/DocumentViewModal';

interface PurchaseRequest {
  id: string;
  prNumber: string;
  projectName: string;
  projectId: string;
  description: string;
  requestedBy: string;
  department: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  totalAmount: number;
  currency: string;
  createdDate: string;
  requiredDate: string;
  approvalLevel: string;
  flags: {
    qtySpec?: boolean;
    cost?: boolean;
    pm?: boolean;
  };
  items: number;
}

const PurchaseRequestsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'priority'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PurchaseRequest | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Mock data - would come from backend
  const purchaseRequests: PurchaseRequest[] = [
    {
      id: '1',
      prNumber: 'PR-2024-001',
      projectName: 'Marina Bay Residences',
      projectId: 'PRJ-001',
      description: 'Construction materials for Tower A foundation',
      requestedBy: 'John Tan',
      department: 'Site Operations',
      status: 'pending',
      priority: 'high',
      totalAmount: 45000,
      currency: 'AED',
      createdDate: '20/08/2024',
      requiredDate: '27/08/2024',
      approvalLevel: 'Project Manager',
      flags: { qtySpec: true, cost: false, pm: false },
      items: 12
    },
    {
      id: '2',
      prNumber: 'PR-2024-002',
      projectName: 'Orchard Office Tower',
      projectId: 'PRJ-002',
      description: 'Electrical equipment and cables',
      requestedBy: 'Sarah Chen',
      department: 'MEP',
      status: 'approved',
      priority: 'medium',
      totalAmount: 78500,
      currency: 'AED',
      createdDate: '19/08/2024',
      requiredDate: '30/08/2024',
      approvalLevel: 'Technical Director',
      flags: { qtySpec: true, cost: true, pm: true },
      items: 25
    },
    {
      id: '3',
      prNumber: 'PR-2024-003',
      projectName: 'Sentosa Resort',
      projectId: 'PRJ-003',
      description: 'Furniture and fixtures for lobby',
      requestedBy: 'Michael Wong',
      department: 'Procurement',
      status: 'in_progress',
      priority: 'urgent',
      totalAmount: 125000,
      currency: 'AED',
      createdDate: '18/08/2024',
      requiredDate: '25/08/2024',
      approvalLevel: 'Accounts',
      flags: { qtySpec: true, cost: true, pm: false },
      items: 45
    },
    {
      id: '4',
      prNumber: 'PR-2024-004',
      projectName: 'CBD Corporate Tower',
      projectId: 'PRJ-004',
      description: 'HVAC system components',
      requestedBy: 'David Lim',
      department: 'Factory',
      status: 'rejected',
      priority: 'low',
      totalAmount: 32000,
      currency: 'AED',
      createdDate: '17/08/2024',
      requiredDate: '05/09/2024',
      approvalLevel: 'Estimation',
      flags: { qtySpec: false, cost: false, pm: false },
      items: 8
    },
    {
      id: '5',
      prNumber: 'PR-2024-005',
      projectName: 'Marina Bay Residences',
      projectId: 'PRJ-001',
      description: 'Safety equipment and PPE',
      requestedBy: 'John Tan',
      department: 'Site Operations',
      status: 'draft',
      priority: 'medium',
      totalAmount: 15000,
      currency: 'AED',
      createdDate: '21/08/2024',
      requiredDate: '28/08/2024',
      approvalLevel: 'Site Supervisor',
      flags: { qtySpec: false, cost: false, pm: false },
      items: 30
    }
  ];

  // Get unique projects for filter
  const projects = [...new Set(purchaseRequests.map(pr => pr.projectName))];

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    let filtered = [...purchaseRequests];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(pr =>
        pr.prNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.requestedBy.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pr => pr.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(pr => pr.priority === priorityFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(pr => pr.projectName === projectFilter);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(pr => {
        const createdDate = parseDateFromDDMMYYYY(pr.createdDate);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return createdDate && createdDate >= startDate && createdDate <= endDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          const dateA = parseDateFromDDMMYYYY(a.createdDate);
          const dateB = parseDateFromDDMMYYYY(b.createdDate);
          comparison = (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [searchQuery, statusFilter, priorityFilter, projectFilter, dateRange, sortBy, sortOrder]);

  const getStatusConfig = (status: PurchaseRequest['status']) => {
    const configs = {
      draft: { color: 'bg-gray-100 text-gray-700', icon: FileText },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
      in_progress: { color: 'bg-[#243d8a]/10 text-[#243d8a]/90', icon: AlertCircle },
      completed: { color: 'bg-purple-100 text-purple-700', icon: CheckCircle }
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: PurchaseRequest['priority']) => {
    const configs = {
      low: { color: 'bg-gray-100 text-gray-600' },
      medium: { color: 'bg-[#243d8a]/10 text-[#243d8a]/90' },
      high: { color: 'bg-orange-100 text-orange-700' },
      urgent: { color: 'bg-red-100 text-red-700' }
    };
    return configs[priority];
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setProjectFilter('all');
    setDateRange({ start: '', end: '' });
  };

  const activeFiltersCount = [
    searchQuery,
    statusFilter !== 'all',
    priorityFilter !== 'all',
    projectFilter !== 'all',
    dateRange.start && dateRange.end
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#243d8a]" />
                <h2 className="text-lg font-semibold">Purchase Requests</h2>
                <Badge className="bg-[#243d8a]/10 text-[#243d8a]/90">
                  {filteredRequests.length} Records
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-1 bg-[#243d8a] text-white">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-[#243d8a] hover:bg-[#243d8a]/90 text-white flex items-center gap-1"
                  onClick={() => {/* Navigate to create form */}}
                >
                  <Plus className="w-3 h-3" />
                  New Request
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by PR number, description, project or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t"
              >
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DateInput
                  placeholder="Start Date (dd/mm/yyyy)"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />

                <DateInput
                  placeholder="End Date (dd/mm/yyyy)"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort by:</span>
              <div className="flex gap-1">
                {[
                  { value: 'date', label: 'Date' },
                  { value: 'amount', label: 'Amount' },
                  { value: 'priority', label: 'Priority' }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (sortBy === option.value) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(option.value as any);
                        setSortOrder('desc');
                      }
                    }}
                    className="text-xs flex items-center gap-1"
                  >
                    {option.label}
                    {sortBy === option.value && (
                      sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Requests Found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || activeFiltersCount > 0
                  ? "Try adjusting your search or filter criteria"
                  : "Create your first purchase request to get started"}
              </p>
              {(searchQuery || activeFiltersCount > 0) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((pr, index) => {
            const statusConfig = getStatusConfig(pr.status);
            const priorityConfig = getPriorityConfig(pr.priority);
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={pr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${statusConfig.color.split(' ')[0]}`}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-base">{pr.prNumber}</h3>
                              <Badge className={statusConfig.color}>
                                {pr.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge className={priorityConfig.color}>
                                {pr.priority.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-2">{pr.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {pr.projectName}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {pr.requestedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {pr.requiredDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {pr.currency} {pr.totalAmount.toLocaleString()}
                              </span>
                            </div>

                            {/* Approval Flags */}
                            <div className="flex items-center gap-2 mt-2">
                              {pr.flags.qtySpec && (
                                <Badge variant="outline" className="text-[10px] border-[#243d8a]/30 text-[#243d8a]/90">
                                  QTY/SPEC FLAG
                                </Badge>
                              )}
                              {pr.flags.cost && (
                                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">
                                  COST FLAG
                                </Badge>
                              )}
                              {pr.flags.pm && (
                                <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700">
                                  PM FLAG
                                </Badge>
                              )}
                              <span className="text-[10px] text-gray-500">
                                {pr.items} items • Level: {pr.approvalLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedDocument(pr);
                            setShowViewModal(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/procurement/purchase-requests/edit/${pr.id}`)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const data = JSON.stringify(pr, null, 2);
                            const blob = new Blob([data], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `PR_${pr.prNumber}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Document View Modal */}
      <DocumentViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedDocument(null);
        }}
        documentType="Purchase Request"
        documentData={selectedDocument}
        onEdit={() => {
          setShowViewModal(false);
          if (selectedDocument) {
            navigate(`/procurement/purchase-requests/edit/${selectedDocument.id}`);
          }
        }}
      />
    </div>
  );
};

export default PurchaseRequestsList;