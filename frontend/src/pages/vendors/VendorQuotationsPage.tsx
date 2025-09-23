import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  Building2,
  User,
  TrendingUp,
  AlertCircle,
  Send,
  FileCheck,
  ArrowUpDown,
  Package,
  Grid3X3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/authStore';
import { buildRolePath } from '@/utils/roleRouting';
import { apiClient } from '@/api/config';
import { toast } from 'sonner';

interface Quotation {
  id: string;
  quotationNumber: string;
  sowReference: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  projectName: string;
  category: string;
  submissionDate: string;
  validUntil: string;
  totalAmount: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'negotiation';
  approvalFlags: {
    qtyScopeFlag: boolean;
    pmFlag: boolean;
    costFlag: boolean;
    complianceFlag: boolean;
  };
  items: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  paymentTerms: string;
  deliveryTerms: string;
  warranty: string;
  notes?: string;
  reviewer?: string;
  reviewDate?: string;
  rejectionReason?: string;
}

const VendorQuotationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = (user as any)?.role || '';
  const userName = (user as any)?.full_name || (user as any)?.name || '';

  const buildPath = (path: string) => buildRolePath(user?.role_id || '', path);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Tab and view mode state
  const [activeTab, setActiveTab] = useState('pending');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Sample quotation data
  useEffect(() => {
    const sampleQuotations: Quotation[] = [
      {
        id: '1',
        quotationNumber: 'VQ-2024-089',
        sowReference: 'SOW-2024-045',
        vendorId: 'VND-001',
        vendorName: 'ABC Trading LLC',
        projectId: 'PRJ-001',
        projectName: 'Dubai Marina Tower',
        category: 'Electrical',
        submissionDate: '2024-03-18',
        validUntil: '2024-04-18',
        totalAmount: 125000,
        status: 'pending',
        approvalFlags: {
          qtyScopeFlag: false,
          pmFlag: false,
          costFlag: false,
          complianceFlag: false
        },
        items: [
          { description: 'Electrical Panels', quantity: 10, unit: 'nos', unitPrice: 5000, totalPrice: 50000 },
          { description: 'Cable Trays', quantity: 500, unit: 'lm', unitPrice: 150, totalPrice: 75000 }
        ],
        paymentTerms: '30% Advance, 70% on Delivery',
        deliveryTerms: '4 weeks from PO',
        warranty: '12 months'
      },
      {
        id: '2',
        quotationNumber: 'VQ-2024-087',
        sowReference: 'SOW-2024-043',
        vendorId: 'VND-003',
        vendorName: 'Global MEP Solutions',
        projectId: 'PRJ-002',
        projectName: 'Abu Dhabi Mall Renovation',
        category: 'MEP Systems',
        submissionDate: '2024-03-15',
        validUntil: '2024-04-15',
        totalAmount: 280000,
        status: 'under_review',
        approvalFlags: {
          qtyScopeFlag: true,
          pmFlag: false,
          costFlag: false,
          complianceFlag: false
        },
        items: [
          { description: 'HVAC Units', quantity: 5, unit: 'nos', unitPrice: 40000, totalPrice: 200000 },
          { description: 'Ducting Material', quantity: 800, unit: 'sqm', unitPrice: 100, totalPrice: 80000 }
        ],
        paymentTerms: '25% Advance, 50% on Delivery, 25% after Installation',
        deliveryTerms: '6 weeks from PO',
        warranty: '24 months',
        reviewer: 'Project Manager'
      },
      {
        id: '3',
        quotationNumber: 'VQ-2024-085',
        sowReference: 'SOW-2024-041',
        vendorId: 'VND-002',
        vendorName: 'XYZ Contractors',
        projectId: 'PRJ-003',
        projectName: 'Sharjah Office Complex',
        category: 'Civil Works',
        submissionDate: '2024-03-10',
        validUntil: '2024-04-10',
        totalAmount: 450000,
        status: 'approved',
        approvalFlags: {
          qtyScopeFlag: true,
          pmFlag: true,
          costFlag: true,
          complianceFlag: true
        },
        items: [
          { description: 'Concrete Works', quantity: 1000, unit: 'sqm', unitPrice: 300, totalPrice: 300000 },
          { description: 'Steel Reinforcement', quantity: 50, unit: 'ton', unitPrice: 3000, totalPrice: 150000 }
        ],
        paymentTerms: '20% Advance, 60% Progress, 20% Completion',
        deliveryTerms: 'As per project schedule',
        warranty: '5 years structural warranty',
        reviewer: 'Technical Director',
        reviewDate: '2024-03-12'
      },
      {
        id: '4',
        quotationNumber: 'VQ-2024-083',
        sowReference: 'SOW-2024-039',
        vendorId: 'VND-004',
        vendorName: 'Prime Furniture Co.',
        projectId: 'PRJ-001',
        projectName: 'Dubai Marina Tower',
        category: 'Furniture',
        submissionDate: '2024-03-08',
        validUntil: '2024-04-08',
        totalAmount: 180000,
        status: 'rejected',
        approvalFlags: {
          qtyScopeFlag: true,
          pmFlag: true,
          costFlag: false,
          complianceFlag: true
        },
        items: [
          { description: 'Office Desks', quantity: 100, unit: 'nos', unitPrice: 1200, totalPrice: 120000 },
          { description: 'Office Chairs', quantity: 100, unit: 'nos', unitPrice: 600, totalPrice: 60000 }
        ],
        paymentTerms: '50% Advance, 50% on Delivery',
        deliveryTerms: '8 weeks from PO',
        warranty: '12 months',
        reviewer: 'Estimation Team',
        reviewDate: '2024-03-09',
        rejectionReason: 'Price exceeds budget allocation by 25%'
      }
    ];
    setQuotations(sampleQuotations);
  }, []);

  const categories = ['All Categories', 'Electrical', 'MEP Systems', 'Civil Works', 'Joinery', 'Furniture'];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, className: 'bg-amber-100 text-amber-800' },
      under_review: { variant: 'outline', icon: <Eye className="w-3 h-3" />, className: 'bg-blue-100 text-blue-800' },
      approved: { variant: 'default', icon: <CheckCircle className="w-3 h-3" />, className: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, className: '' },
      negotiation: { variant: 'outline', icon: <TrendingUp className="w-3 h-3" />, className: 'bg-blue-100 text-blue-800' }
    };
    return variants[status] || variants.pending;
  };

  // This will be replaced by the tab-based filtering below

  const handleApprove = () => {
    if (selectedQuotation) {
      toast.success(`Quotation ${selectedQuotation.quotationNumber} approved successfully`);
      setIsApprovalDialogOpen(false);
      setApprovalNotes('');
    }
  };

  const handleReject = () => {
    if (selectedQuotation && approvalNotes) {
      toast.error(`Quotation ${selectedQuotation.quotationNumber} rejected`);
      setIsApprovalDialogOpen(false);
      setApprovalNotes('');
    } else {
      toast.error('Please provide rejection reason');
    }
  };

  const getApprovalProgress = (flags: Quotation['approvalFlags']) => {
    const total = Object.keys(flags).length;
    const approved = Object.values(flags).filter(Boolean).length;
    return (approved / total) * 100;
  };

  // Filter quotations by tab, search, and other filters
  const getFilteredQuotations = () => {
    return quotations.filter(quotation => {
      // Tab filtering
      const matchesTab = activeTab === 'all' || quotation.status === activeTab;

      // Search filtering
      const matchesSearch = quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           quotation.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           quotation.projectName.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filtering (for the dropdown)
      const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;

      // Category filtering
      const matchesCategory = filterCategory === 'all' || quotation.category === filterCategory;

      return matchesTab && matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      // Apply sorting
      switch (sortBy) {
        case 'date':
          return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'vendor':
          return a.vendorName.localeCompare(b.vendorName);
        default:
          return 0;
      }
    });
  };

  // Get tab counts
  const getTabCounts = () => {
    return {
      all: quotations.length,
      pending: quotations.filter(q => q.status === 'pending').length,
      under_review: quotations.filter(q => q.status === 'under_review').length,
      approved: quotations.filter(q => q.status === 'approved').length,
      rejected: quotations.filter(q => q.status === 'rejected').length,
      negotiation: quotations.filter(q => q.status === 'negotiation').length,
    };
  };

  const tabCounts = getTabCounts();
  const filteredQuotations = getFilteredQuotations();

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              Vendor Quotations
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review and manage vendor quotations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-none border-0"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => navigate(buildPath('/vendors/scope-of-work'))}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              New SOW Request
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quotations</p>
                <p className="text-2xl font-bold text-gray-900">{quotations.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">
                  {quotations.filter(q => q.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-blue-600">
                  {quotations.filter(q => q.status === 'under_review').length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {quotations.filter(q => q.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold text-blue-600">
                  AED {(quotations.reduce((sum, q) => sum + q.totalAmount, 0) / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search quotations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.slice(1).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotations List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQuotations.map((quotation) => (
          <motion.div
            key={quotation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-100">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {quotation.quotationNumber}
                          </h3>
                          <Badge {...getStatusBadge(quotation.status)} className="gap-1">
                            {getStatusBadge(quotation.status).icon}
                            {quotation.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {quotation.category}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{quotation.vendorName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>{quotation.projectName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Submitted: {new Date(quotation.submissionDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span>Valid until: {new Date(quotation.validUntil).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {quotation.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg">
                            <p className="text-xs text-red-600">
                              <strong>Rejection Reason:</strong> {quotation.rejectionReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        AED {quotation.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    {quotation.status === 'under_review' && (
                      <div className="w-full">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Approval Progress</span>
                          <span>{getApprovalProgress(quotation.approvalFlags).toFixed(0)}%</span>
                        </div>
                        <Progress value={getApprovalProgress(quotation.approvalFlags)} className="w-32" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedQuotation(quotation);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {(quotation.status === 'pending' || quotation.status === 'under_review') && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setSelectedQuotation(quotation);
                            setIsApprovalDialogOpen(true);
                          }}
                        >
                          <FileCheck className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Approval Flags */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Approval Flags:</span>
                    <div className="flex gap-2">
                      <Badge
                        variant={quotation.approvalFlags.qtyScopeFlag ? 'default' : 'secondary'}
                        className={quotation.approvalFlags.qtyScopeFlag ? 'bg-green-100 text-green-800' : ''}
                      >
                        {quotation.approvalFlags.qtyScopeFlag ? '✓' : '○'} QTY/SCOPE
                      </Badge>
                      <Badge
                        variant={quotation.approvalFlags.pmFlag ? 'default' : 'secondary'}
                        className={quotation.approvalFlags.pmFlag ? 'bg-green-100 text-green-800' : ''}
                      >
                        {quotation.approvalFlags.pmFlag ? '✓' : '○'} PM FLAG
                      </Badge>
                      <Badge
                        variant={quotation.approvalFlags.costFlag ? 'default' : 'secondary'}
                        className={quotation.approvalFlags.costFlag ? 'bg-green-100 text-green-800' : ''}
                      >
                        {quotation.approvalFlags.costFlag ? '✓' : '○'} COST FLAG
                      </Badge>
                      <Badge
                        variant={quotation.approvalFlags.complianceFlag ? 'default' : 'secondary'}
                        className={quotation.approvalFlags.complianceFlag ? 'bg-green-100 text-green-800' : ''}
                      >
                        {quotation.approvalFlags.complianceFlag ? '✓' : '○'} COMPLIANCE
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Details</DialogTitle>
            <DialogDescription>
              {selectedQuotation?.quotationNumber} - {selectedQuotation?.vendorName}
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="terms">Terms</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quotation Number</Label>
                    <p className="font-medium">{selectedQuotation.quotationNumber}</p>
                  </div>
                  <div>
                    <Label>SOW Reference</Label>
                    <p className="font-medium">{selectedQuotation.sowReference}</p>
                  </div>
                  <div>
                    <Label>Vendor</Label>
                    <p className="font-medium">{selectedQuotation.vendorName}</p>
                  </div>
                  <div>
                    <Label>Project</Label>
                    <p className="font-medium">{selectedQuotation.projectName}</p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Badge variant="secondary">{selectedQuotation.category}</Badge>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge {...getStatusBadge(selectedQuotation.status)}>
                      {selectedQuotation.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <Label>Submission Date</Label>
                    <p className="font-medium">{new Date(selectedQuotation.submissionDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <p className="font-medium">{new Date(selectedQuotation.validUntil).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="text-2xl font-bold text-blue-600">
                    AED {selectedQuotation.totalAmount.toLocaleString()}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-2 text-left text-sm font-medium">Description</th>
                        <th className="border p-2 text-center text-sm font-medium">Quantity</th>
                        <th className="border p-2 text-center text-sm font-medium">Unit</th>
                        <th className="border p-2 text-right text-sm font-medium">Unit Price</th>
                        <th className="border p-2 text-right text-sm font-medium">Total Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.items.map((item, index) => (
                        <tr key={index}>
                          <td className="border p-2">{item.description}</td>
                          <td className="border p-2 text-center">{item.quantity}</td>
                          <td className="border p-2 text-center">{item.unit}</td>
                          <td className="border p-2 text-right">AED {item.unitPrice.toLocaleString()}</td>
                          <td className="border p-2 text-right font-medium">
                            AED {item.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="border p-2 text-right font-bold">Total:</td>
                        <td className="border p-2 text-right font-bold text-blue-600">
                          AED {selectedQuotation.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="terms" className="space-y-4">
                <div>
                  <Label>Payment Terms</Label>
                  <p className="font-medium">{selectedQuotation.paymentTerms}</p>
                </div>
                <div>
                  <Label>Delivery Terms</Label>
                  <p className="font-medium">{selectedQuotation.deliveryTerms}</p>
                </div>
                <div>
                  <Label>Warranty</Label>
                  <p className="font-medium">{selectedQuotation.warranty}</p>
                </div>
                {selectedQuotation.notes && (
                  <div>
                    <Label>Additional Notes</Label>
                    <p className="font-medium">{selectedQuotation.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">Quotation Submitted</p>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedQuotation.submissionDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {selectedQuotation.reviewer && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <div>
                        <p className="font-medium">Reviewed by {selectedQuotation.reviewer}</p>
                        <p className="text-sm text-gray-600">
                          {selectedQuotation.reviewDate ? new Date(selectedQuotation.reviewDate).toLocaleString() : 'In progress'}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedQuotation.status === 'approved' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <div>
                        <p className="font-medium">Quotation Approved</p>
                        <p className="text-sm text-gray-600">All approval flags cleared</p>
                      </div>
                    </div>
                  )}
                  {selectedQuotation.status === 'rejected' && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <div>
                        <p className="font-medium">Quotation Rejected</p>
                        <p className="text-sm text-gray-600">{selectedQuotation.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Quotation</DialogTitle>
            <DialogDescription>
              {selectedQuotation?.quotationNumber} - AED {selectedQuotation?.totalAmount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="approvalNotes">Review Notes</Label>
              <Textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Enter your review notes or rejection reason"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!approvalNotes}
            >
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorQuotationsPage;