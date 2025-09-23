import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  ClipboardCheck,
  Award,
  BarChart3,
  History,
  Calculator,
  Database,
  Shield,
  Grid3X3,
  List,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface VendorVerification {
  id: string;
  sowNumber: string;
  projectName: string;
  vendorName: string;
  category: string;
  quotedAmount: number;
  estimatedAmount: number;
  variance: number;
  vendorStatus: 'approved_vendor' | 'new_vendor' | 'blacklisted';
  previousProjects?: { name: string; amount: number; performance: number }[];
  complianceScore: number;
  qualityScore: number;
  deliveryScore: number;
  status: 'pending_verification' | 'verified' | 'rejected';
  submittedDate: string;
  pmApprovalDate?: string;
  estimationNotes?: string;
}

const EstimationVendorCheck: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedVerification, setSelectedVerification] = useState<VendorVerification | null>(null);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [verifications, setVerifications] = useState<VendorVerification[]>([
    {
      id: '1',
      sowNumber: 'SOW-2024-041',
      projectName: 'Sharjah Office Complex',
      vendorName: 'XYZ Contractors',
      category: 'Civil Works',
      quotedAmount: 450000,
      estimatedAmount: 425000,
      variance: 5.9,
      vendorStatus: 'approved_vendor',
      previousProjects: [
        { name: 'Dubai Tower Project', amount: 380000, performance: 92 },
        { name: 'Mall Renovation', amount: 520000, performance: 88 },
        { name: 'Office Fit-out', amount: 290000, performance: 95 }
      ],
      complianceScore: 98,
      qualityScore: 91,
      deliveryScore: 89,
      status: 'pending_verification',
      submittedDate: '2024-03-10',
      pmApprovalDate: '2024-03-12'
    },
    {
      id: '2',
      sowNumber: 'SOW-2024-043',
      projectName: 'Abu Dhabi Mall',
      vendorName: 'Global MEP Solutions',
      category: 'MEP Systems',
      quotedAmount: 280000,
      estimatedAmount: 265000,
      variance: 5.7,
      vendorStatus: 'approved_vendor',
      complianceScore: 95,
      qualityScore: 93,
      deliveryScore: 90,
      status: 'verified',
      submittedDate: '2024-03-15',
      pmApprovalDate: '2024-03-16',
      estimationNotes: 'Vendor pricing within acceptable range. Previous performance satisfactory.'
    },
    {
      id: '3',
      sowNumber: 'SOW-2024-045',
      projectName: 'Dubai Marina Tower',
      vendorName: 'NewTech Solutions',
      category: 'Electrical',
      quotedAmount: 195000,
      estimatedAmount: 150000,
      variance: 30,
      vendorStatus: 'new_vendor',
      complianceScore: 0,
      qualityScore: 0,
      deliveryScore: 0,
      status: 'pending_verification',
      submittedDate: '2024-03-18'
    }
  ]);

  const stats = {
    pendingVerification: verifications.filter(v => v.status === 'pending_verification').length,
    verified: verifications.filter(v => v.status === 'verified').length,
    rejected: verifications.filter(v => v.status === 'rejected').length,
    averageVariance: verifications.reduce((acc, v) => acc + v.variance, 0) / verifications.length
  };

  const getVendorStatusBadge = (status: string) => {
    switch (status) {
      case 'approved_vendor':
        return <Badge className="bg-green-100 text-green-800">✓ Approved Vendor</Badge>;
      case 'new_vendor':
        return <Badge className="bg-amber-100 text-amber-800">⚠ New Vendor</Badge>;
      case 'blacklisted':
        return <Badge className="bg-red-100 text-red-800">✗ Blacklisted</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance <= 5) return 'text-green-600';
    if (variance <= 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleVerification = (verification: VendorVerification) => {
    setSelectedVerification(verification);
    setIsVerificationDialogOpen(true);
  };

  const submitVerification = (approved: boolean) => {
    if (!verificationNotes) {
      toast.error('Please provide verification notes');
      return;
    }

    const message = approved
      ? 'Vendor verification completed - Sent to Technical Director'
      : 'Vendor rejected - Sent back to Procurement';

    toast.success(message);
    setIsVerificationDialogOpen(false);
    setVerificationNotes('');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header - ESTIMATION View */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-7 h-7 text-indigo-600" />
              Vendor Verification - Estimation
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Verify vendor list compliance and cost estimates
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
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
          </div>
        </div>
      </motion.div>

      {/* Workflow Alert */}
      <Alert className="border-indigo-200 bg-indigo-50">
        <Shield className="h-4 w-4 text-indigo-600" />
        <AlertTitle>ESTIMATION-VENDOR LIST CHECK & GO</AlertTitle>
        <AlertDescription>
          Your role is critical: Verify vendors are on approved list, check cost estimates against historical data,
          and ensure compliance before sending to Technical Director.
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Verification</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingVerification}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Variance</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.averageVariance.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending ({verifications.filter(v => v.status === 'pending_verification').length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({verifications.filter(v => v.status === 'verified').length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                Rejected ({verifications.filter(v => v.status === 'rejected').length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed (0)
              </TabsTrigger>
            </TabsList>

            {/* Pending Verification */}
            <TabsContent value="pending" className="space-y-4 mt-6">
              {verifications.filter(v => v.status === 'pending_verification').map((verification) => (
                <Card key={verification.id} className="border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">{verification.sowNumber}</h3>
                          {getVendorStatusBadge(verification.vendorStatus)}
                          {verification.variance > 10 && (
                            <Badge variant="destructive">High Variance</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Project</p>
                            <p className="font-medium">{verification.projectName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Vendor</p>
                            <p className="font-medium">{verification.vendorName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Category</p>
                            <Badge variant="secondary">{verification.category}</Badge>
                          </div>
                        </div>

                        {/* Cost Comparison */}
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-2">Cost Analysis:</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Quoted Amount</p>
                              <p className="font-bold">AED {verification.quotedAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Estimated Amount</p>
                              <p className="font-bold text-indigo-600">AED {verification.estimatedAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Variance</p>
                              <p className={`font-bold ${getVarianceColor(verification.variance)}`}>
                                {verification.variance > 0 ? '+' : ''}{verification.variance.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Vendor Performance (if available) */}
                        {verification.vendorStatus === 'approved_vendor' && (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <p className="text-xs text-gray-600">Compliance</p>
                              <p className="text-lg font-bold text-blue-600">{verification.complianceScore}%</p>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <p className="text-xs text-gray-600">Quality</p>
                              <p className="text-lg font-bold text-green-600">{verification.qualityScore}%</p>
                            </div>
                            <div className="text-center p-2 bg-amber-50 rounded">
                              <p className="text-xs text-gray-600">Delivery</p>
                              <p className="text-lg font-bold text-amber-600">{verification.deliveryScore}%</p>
                            </div>
                          </div>
                        )}

                        {verification.vendorStatus === 'new_vendor' && (
                          <Alert className="border-amber-200 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription>
                              This is a new vendor with no historical data. Extra due diligence required.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <div className="ml-4">
                        <Button
                          onClick={() => handleVerification(verification)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Verify
                        </Button>
                      </div>
                    </div>

                    {/* Previous Projects */}
                    {verification.previousProjects && verification.previousProjects.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Previous Projects:</p>
                        <div className="space-y-2">
                          {verification.previousProjects.slice(0, 3).map((project, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{project.name}</span>
                              <div className="flex items-center gap-4">
                                <span>AED {project.amount.toLocaleString()}</span>
                                <Badge variant={project.performance >= 90 ? 'default' : 'secondary'}>
                                  {project.performance}% score
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4 mt-6">
              {verifications.filter(v => v.status === 'verified').map((verification) => (
                <Card key={verification.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{verification.sowNumber}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {verification.vendorName} • {verification.projectName}
                        </p>
                        {verification.estimationNotes && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            Note: {verification.estimationNotes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">AED {verification.quotedAmount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Variance: {verification.variance.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-4 mt-6">
              <div className="text-center py-8 text-gray-500">
                No rejected vendor verifications found
              </div>
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="mt-6">
              <Alert className="mb-4">
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Approved vendor database with historical performance metrics
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {['ABC Trading LLC', 'Global MEP Solutions', 'XYZ Contractors', 'Prime Materials Co.'].map((vendor) => (
                  <Card key={vendor}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="font-medium">{vendor}</p>
                            <p className="text-sm text-gray-600">Active since 2022</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Projects</p>
                            <p className="font-bold">24</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Avg Score</p>
                            <p className="font-bold text-green-600">92%</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Approved</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Verification</DialogTitle>
            <DialogDescription>
              Complete estimation check for {selectedVerification?.sowNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Vendor Status</p>
                  {getVendorStatusBadge(selectedVerification.vendorStatus)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cost Variance</p>
                  <p className={`font-bold ${getVarianceColor(selectedVerification.variance)}`}>
                    {selectedVerification.variance.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Verification Notes *</Label>
                <Textarea
                  id="notes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Enter your verification notes and recommendations"
                  rows={4}
                  className="mt-2"
                />
              </div>

              <Alert className="border-indigo-200 bg-indigo-50">
                <AlertTriangle className="h-4 w-4 text-indigo-600" />
                <AlertDescription>
                  Ensure vendor is on approved list and pricing is within acceptable variance before approving.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerificationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitVerification(false)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => submitVerification(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EstimationVendorCheck;