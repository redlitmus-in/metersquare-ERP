import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  Briefcase,
  Award,
  TrendingUp,
  Building2,
  ClipboardCheck,
  Flag,
  Gavel,
  ShieldCheck,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface VendorApproval {
  id: string;
  sowNumber: string;
  projectName: string;
  vendorName: string;
  category: string;
  quotedAmount: number;
  approvalStages: {
    qtyScopeFlag: boolean;
    pmFlag: boolean;
    estimationCheck: boolean;
    tdFlag?: boolean;
  };
  complianceChecks: {
    technicalCompliance: boolean;
    qualityStandards: boolean;
    safetyRequirements: boolean;
    contractualTerms: boolean;
  };
  estimationNotes: string;
  pmNotes: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  submittedDate: string;
  criticalFlags?: string[];
}

const TDVendorApproval: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState<VendorApproval | null>(null);
  const [isFinalApprovalOpen, setIsFinalApprovalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [complianceChecks, setComplianceChecks] = useState({
    technicalCompliance: false,
    qualityStandards: false,
    safetyRequirements: false,
    contractualTerms: false
  });

  const [approvals, setApprovals] = useState<VendorApproval[]>([
    {
      id: '1',
      sowNumber: 'SOW-2024-041',
      projectName: 'Sharjah Office Complex',
      vendorName: 'XYZ Contractors',
      category: 'Civil Works',
      quotedAmount: 450000,
      approvalStages: {
        qtyScopeFlag: true,
        pmFlag: true,
        estimationCheck: true
      },
      complianceChecks: {
        technicalCompliance: false,
        qualityStandards: false,
        safetyRequirements: false,
        contractualTerms: false
      },
      estimationNotes: 'Vendor verified. Pricing within 5.9% variance. Approved vendor with good track record.',
      pmNotes: 'Scope aligns with project requirements. Timeline acceptable.',
      status: 'pending_approval',
      submittedDate: '2024-03-10'
    },
    {
      id: '2',
      sowNumber: 'SOW-2024-043',
      projectName: 'Abu Dhabi Mall',
      vendorName: 'Global MEP Solutions',
      category: 'MEP Systems',
      quotedAmount: 280000,
      approvalStages: {
        qtyScopeFlag: true,
        pmFlag: true,
        estimationCheck: true,
        tdFlag: true
      },
      complianceChecks: {
        technicalCompliance: true,
        qualityStandards: true,
        safetyRequirements: true,
        contractualTerms: true
      },
      estimationNotes: 'Vendor pricing acceptable. All compliance checks passed.',
      pmNotes: 'Critical for project timeline. Recommended for approval.',
      status: 'approved',
      submittedDate: '2024-03-15',
      criticalFlags: ['Time-sensitive', 'Key vendor']
    },
    {
      id: '3',
      sowNumber: 'SOW-2024-039',
      projectName: 'Dubai Marina Tower',
      vendorName: 'NewTech Solutions',
      category: 'Electrical',
      quotedAmount: 195000,
      approvalStages: {
        qtyScopeFlag: true,
        pmFlag: true,
        estimationCheck: false
      },
      complianceChecks: {
        technicalCompliance: false,
        qualityStandards: false,
        safetyRequirements: false,
        contractualTerms: false
      },
      estimationNotes: 'New vendor with 30% cost variance. Requires additional scrutiny.',
      pmNotes: 'Alternative vendors available if needed.',
      status: 'rejected',
      submittedDate: '2024-03-18'
    }
  ]);

  const stats = {
    pendingApproval: approvals.filter(a => a.status === 'pending_approval').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
    totalValue: approvals.reduce((sum, a) => sum + a.quotedAmount, 0)
  };

  const getApprovalProgress = (stages: any) => {
    const total = Object.keys(stages).length;
    const completed = Object.values(stages).filter(Boolean).length;
    return (completed / total) * 100;
  };

  const getComplianceScore = (checks: any) => {
    const total = Object.keys(checks).length;
    const passed = Object.values(checks).filter(Boolean).length;
    return (passed / total) * 100;
  };

  const handleFinalApproval = (approval: VendorApproval) => {
    setSelectedApproval(approval);
    setComplianceChecks({
      technicalCompliance: false,
      qualityStandards: false,
      safetyRequirements: false,
      contractualTerms: false
    });
    setIsFinalApprovalOpen(true);
  };

  const submitFinalApproval = (approved: boolean) => {
    if (approved) {
      const allChecked = Object.values(complianceChecks).every(Boolean);
      if (!allChecked) {
        toast.error('Please complete all compliance checks');
        return;
      }
    }

    if (!approvalNotes) {
      toast.error('Please provide approval notes');
      return;
    }

    const message = approved
      ? 'FLAG approved - Vendor approved for project. Sent to Accounts for payment setup.'
      : 'FLAG rejected - Vendor rejected. Sent back to Procurement.';

    toast.success(message);
    setIsFinalApprovalOpen(false);
    setApprovalNotes('');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header - TECHNICAL DIRECTOR View */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-[#243d8a]" />
              Vendor Final Approval - Technical Director
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Final technical and compliance approval for vendors
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
      <Alert className="border-[#243d8a]/20 bg-[#243d8a]/5">
        <Flag className="h-4 w-4 text-[#243d8a]" />
        <AlertTitle>Final FLAG Approval Authority</AlertTitle>
        <AlertDescription>
          You provide the final technical approval after all checks are complete. Your approval triggers:
          <strong> Accounts notification for payment setup → Task completion</strong>
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
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
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold text-[#243d8a]">AED {(stats.totalValue / 1000000).toFixed(1)}M</p>
              </div>
              <DollarSign className="w-8 h-8 text-[#243d8a] opacity-20" />
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
                Pending ({approvals.filter(a => a.status === 'pending_approval').length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({approvals.filter(a => a.status === 'approved').length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                Rejected ({approvals.filter(a => a.status === 'rejected').length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed (0)
              </TabsTrigger>
            </TabsList>

            {/* Pending Approval */}
            <TabsContent value="pending" className="space-y-4 mt-6">
              {approvals.filter(a => a.status === 'pending_approval').map((approval) => (
                <Card key={approval.id} className="border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">{approval.sowNumber}</h3>
                          <Badge variant="secondary">{approval.category}</Badge>
                          {approval.criticalFlags?.map(flag => (
                            <Badge key={flag} variant="destructive">{flag}</Badge>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Project</p>
                            <p className="font-medium">{approval.projectName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Vendor</p>
                            <p className="font-medium">{approval.vendorName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Amount</p>
                            <p className="font-bold text-[#243d8a]">AED {approval.quotedAmount.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Approval Stages */}
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Approval Progress:</p>
                          <Progress value={getApprovalProgress(approval.approvalStages)} className="h-2 mb-2" />
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={approval.approvalStages.qtyScopeFlag ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                              {approval.approvalStages.qtyScopeFlag ? '✓' : '○'} QTY/SCOPE
                            </Badge>
                            <Badge className={approval.approvalStages.pmFlag ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                              {approval.approvalStages.pmFlag ? '✓' : '○'} PM FLAG
                            </Badge>
                            <Badge className={approval.approvalStages.estimationCheck ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                              {approval.approvalStages.estimationCheck ? '✓' : '○'} ESTIMATION
                            </Badge>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="font-medium text-blue-900">PM Notes:</p>
                            <p className="text-blue-700">{approval.pmNotes}</p>
                          </div>
                          <div className="p-2 bg-indigo-50 rounded">
                            <p className="font-medium text-indigo-900">Estimation Notes:</p>
                            <p className="text-indigo-700">{approval.estimationNotes}</p>
                          </div>
                        </div>

                        {/* Compliance Status */}
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-1">Compliance Score:</p>
                          <Progress value={getComplianceScore(approval.complianceChecks)} className="h-2" />
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          onClick={() => handleFinalApproval(approval)}
                          className="bg-[#243d8a] hover:bg-[#1e3470]"
                        >
                          <Gavel className="w-4 h-4 mr-2" />
                          Final Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4 mt-6">
              {approvals.filter(a => a.status === 'approved').map((approval) => (
                <Card key={approval.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{approval.sowNumber}</h3>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                          <Badge className="bg-[#243d8a] text-white">
                            <Flag className="w-3 h-3 mr-1" />
                            TD FLAG
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {approval.vendorName} • {approval.projectName}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {Object.entries(approval.complianceChecks).map(([key, value]) => (
                            value && (
                              <Badge key={key} variant="outline" className="text-xs">
                                ✓ {key.replace(/([A-Z])/g, ' $1').trim()}
                              </Badge>
                            )
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">AED {approval.quotedAmount.toLocaleString()}</p>
                        <p className="text-sm text-green-600">Sent to Accounts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-4 mt-6">
              {approvals.filter(a => a.status === 'rejected').map((approval) => (
                <Card key={approval.id} className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{approval.sowNumber}</h3>
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {approval.vendorName} • {approval.projectName}
                        </p>
                        <p className="text-sm text-red-600 mt-2">
                          Failed estimation check - High cost variance
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-500 line-through">
                          AED {approval.quotedAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-red-600">Returned to Procurement</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="space-y-4 mt-6">
              <div className="text-center py-8 text-gray-500">
                No completed vendor approvals found
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Final Approval Dialog */}
      <Dialog open={isFinalApprovalOpen} onOpenChange={setIsFinalApprovalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Final Technical Approval - FLAG</DialogTitle>
            <DialogDescription>
              Complete all compliance checks and provide final approval for {selectedApproval?.sowNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Vendor</p>
                  <p className="font-medium">{selectedApproval.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-bold text-[#243d8a]">AED {selectedApproval.quotedAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Compliance Checklist */}
              <div className="space-y-3">
                <Label>Compliance Checklist</Label>
                <div className="space-y-2">
                  {Object.entries(complianceChecks).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setComplianceChecks(prev => ({ ...prev, [key]: checked as boolean }))
                        }
                      />
                      <label htmlFor={key} className="flex-1 cursor-pointer">
                        <p className="font-medium text-sm">
                          {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                        </p>
                      </label>
                      {value && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="approval-notes">Approval Notes *</Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Enter your final approval decision and any conditions"
                  rows={4}
                  className="mt-2"
                />
              </div>

              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Your approval will authorize Accounts to proceed with payment setup and notify all stakeholders.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalApprovalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitFinalApproval(false)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => submitFinalApproval(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve FLAG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TDVendorApproval;