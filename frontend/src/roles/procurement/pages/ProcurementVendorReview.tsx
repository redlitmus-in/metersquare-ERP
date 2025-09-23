import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Send,
  Package,
  ClipboardCheck,
  Grid3X3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface VendorSOWReview {
  id: string;
  sowNumber: string;
  projectName: string;
  projectManager: string;
  vendorName?: string;
  vendorId?: string;
  category: string;
  boqReference: string;
  boqItems: any[];
  totalAmount: number;
  status: 'pending_vendor_selection' | 'quotation_requested' | 'quotation_received' | 'qty_scope_review';
  submittedDate: string;
  scopeDescription: string;
  deliverables: string[];
  availableVendors?: { id: string; name: string; rating: number; previousOrders: number }[];
  selectedVendors?: string[];
  quotations?: { vendorId: string; vendorName: string; amount: number; leadTime: string; submitted: boolean }[];
}

const ProcurementVendorReview: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedSOW, setSelectedSOW] = useState<VendorSOWReview | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isVendorSelectionOpen, setIsVendorSelectionOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [sowRequests, setSowRequests] = useState<VendorSOWReview[]>([
    {
      id: '1',
      sowNumber: 'SOW-2024-045',
      projectName: 'Dubai Marina Tower',
      projectManager: 'John Smith',
      category: 'Electrical',
      boqReference: 'BOQ-2024-089',
      boqItems: [
        { description: 'Electrical Panels', quantity: 10, unit: 'nos', estimatedCost: 50000 },
        { description: 'Cable Trays', quantity: 500, unit: 'lm', estimatedCost: 75000 }
      ],
      totalAmount: 125000,
      status: 'pending_vendor_selection',
      submittedDate: '2024-03-18',
      scopeDescription: 'Complete electrical installation for floors 10-20',
      deliverables: ['Panel installation', 'Cable tray mounting', 'Testing & commissioning'],
      availableVendors: [
        { id: 'V1', name: 'ABC Trading LLC', rating: 4.5, previousOrders: 127 },
        { id: 'V2', name: 'ElectroTech Solutions', rating: 4.8, previousOrders: 89 },
        { id: 'V3', name: 'PowerLine Industries', rating: 4.2, previousOrders: 76 }
      ]
    },
    {
      id: '2',
      sowNumber: 'SOW-2024-043',
      projectName: 'Abu Dhabi Mall',
      projectManager: 'Sarah Johnson',
      vendorName: 'Global MEP Solutions',
      vendorId: 'V4',
      category: 'MEP Systems',
      boqReference: 'BOQ-2024-087',
      boqItems: [
        { description: 'HVAC Units', quantity: 5, unit: 'nos', estimatedCost: 200000 },
        { description: 'Ducting', quantity: 800, unit: 'sqm', estimatedCost: 80000 }
      ],
      totalAmount: 280000,
      status: 'quotation_received',
      submittedDate: '2024-03-15',
      scopeDescription: 'HVAC system installation for retail spaces',
      deliverables: ['Equipment supply', 'Installation', 'Testing'],
      selectedVendors: ['V4', 'V5', 'V6'],
      quotations: [
        { vendorId: 'V4', vendorName: 'Global MEP Solutions', amount: 275000, leadTime: '6 weeks', submitted: true },
        { vendorId: 'V5', vendorName: 'Climate Control Co.', amount: 290000, leadTime: '5 weeks', submitted: true },
        { vendorId: 'V6', vendorName: 'AirTech Systems', amount: 0, leadTime: '', submitted: false }
      ]
    }
  ]);

  const stats = {
    newRequests: sowRequests.filter(s => s.status === 'pending_vendor_selection').length,
    awaitingQuotations: sowRequests.filter(s => s.status === 'quotation_requested').length,
    quotationsReceived: sowRequests.filter(s => s.status === 'quotation_received').length,
    underReview: sowRequests.filter(s => s.status === 'qty_scope_review').length
  };

  const handleVendorSelection = (sow: VendorSOWReview) => {
    setSelectedSOW(sow);
    setSelectedVendorIds([]);
    setIsVendorSelectionOpen(true);
  };

  const submitVendorSelection = () => {
    if (selectedVendorIds.length < 3) {
      toast.error('Please select at least 3 vendors for quotation');
      return;
    }
    toast.success(`Quotation request sent to ${selectedVendorIds.length} vendors`);
    setIsVendorSelectionOpen(false);
  };

  const handleQtyScopeReview = (sow: VendorSOWReview) => {
    setSelectedSOW(sow);
    setIsReviewDialogOpen(true);
  };

  const submitQtyScopeFlag = (approved: boolean) => {
    if (!approved && !reviewNotes) {
      toast.error('Please provide rejection notes');
      return;
    }

    const message = approved
      ? 'QTY/SCOPE FLAG approved - Sent to Project Manager'
      : 'QTY/SCOPE FLAG rejected - Sent back for revision';

    toast.success(message);
    setIsReviewDialogOpen(false);
    setReviewNotes('');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header - PROCUREMENT View */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-red-600" />
              Vendor Management - Procurement
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review SOWs, select vendors, and manage quotations
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
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle>Your Role in Vendor Workflow</AlertTitle>
        <AlertDescription>
          You receive SOWs from Project Manager. Your responsibilities:
          <strong> Select Vendors → Request Quotations → Review with PM for QTY/SCOPE FLAG approval</strong>
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Requests</p>
                <p className="text-2xl font-bold text-blue-600">{stats.newRequests}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Awaiting Quotes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.awaitingQuotations}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Quotes Received</p>
                <p className="text-2xl font-bold text-green-600">{stats.quotationsReceived}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-red-600">{stats.underReview}</p>
              </div>
              <Eye className="w-8 h-8 text-red-600 opacity-20" />
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
                Pending ({sowRequests.filter(s => s.status === 'pending_vendor_selection').length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({sowRequests.filter(s => s.status === 'quotation_received').length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                Rejected (0)
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed ({sowRequests.filter(s => s.status === 'qty_scope_review').length})
              </TabsTrigger>
            </TabsList>

            {/* Pending SOW Requests */}
            <TabsContent value="pending" className="space-y-4 mt-6">
              {sowRequests.filter(s => s.status === 'pending_vendor_selection').map((sow) => (
                <Card key={sow.id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{sow.sowNumber}</h3>
                          <Badge variant="secondary">{sow.category}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">New</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <strong>Project:</strong> {sow.projectName}
                          </div>
                          <div>
                            <strong>PM:</strong> {sow.projectManager}
                          </div>
                          <div>
                            <strong>BOQ Ref:</strong> {sow.boqReference}
                          </div>
                          <div>
                            <strong>Est. Value:</strong> AED {sow.totalAmount.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-medium mb-1">Scope Description:</p>
                          <p className="text-sm text-gray-600">{sow.scopeDescription}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Available Vendors ({sow.availableVendors?.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {sow.availableVendors?.map(vendor => (
                              <Badge key={vendor.id} variant="outline">
                                {vendor.name} • ⭐ {vendor.rating}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          onClick={() => handleVendorSelection(sow)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Select Vendors
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-4 mt-6">
              {sowRequests.filter(s => s.status === 'quotation_received').map((sow) => (
                <Card key={sow.id}>
                  <CardContent className="p-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{sow.sowNumber}</h3>
                        <Badge className="bg-green-100 text-green-800">Quotations Received</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{sow.projectName} • {sow.category}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-sm">Vendor Quotations:</p>
                      {sow.quotations?.map((quote) => (
                        <div key={quote.vendorId} className={`p-3 rounded-lg border ${quote.submitted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{quote.vendorName}</p>
                              {quote.submitted ? (
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Amount:</span> AED {quote.amount.toLocaleString()} •
                                  <span className="font-medium ml-2">Lead Time:</span> {quote.leadTime}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 mt-1">Awaiting response...</p>
                              )}
                            </div>
                            {quote.submitted && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => handleQtyScopeReview(sow)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Submit for QTY/SCOPE Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Rejected Tab */}
            <TabsContent value="rejected" className="space-y-4 mt-6">
              <div className="text-center py-8 text-gray-500">
                No rejected vendor requests found
              </div>
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="space-y-4 mt-6">
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  Items in this tab require joint review with Project Manager for QTY/SCOPE FLAG approval
                </AlertDescription>
              </Alert>

              {sowRequests.filter(s => s.status === 'qty_scope_review').map((sow) => (
                <Card key={sow.id} className="border-amber-200">
                  <CardContent className="p-4">
                    <Badge className="bg-amber-100 text-amber-800 mb-3">Pending QTY/SCOPE Review</Badge>
                    <p className="font-medium">{sow.sowNumber} - {sow.projectName}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Vendor Selection Dialog */}
      <Dialog open={isVendorSelectionOpen} onOpenChange={setIsVendorSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Vendors for Quotation</DialogTitle>
            <DialogDescription>
              Choose at least 3 vendors to request quotations for {selectedSOW?.sowNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {selectedSOW?.availableVendors?.map(vendor => (
              <div key={vendor.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  id={vendor.id}
                  checked={selectedVendorIds.includes(vendor.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedVendorIds([...selectedVendorIds, vendor.id]);
                    } else {
                      setSelectedVendorIds(selectedVendorIds.filter(id => id !== vendor.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor={vendor.id} className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="text-sm text-gray-600">
                      Rating: ⭐ {vendor.rating} • Previous Orders: {vendor.previousOrders}
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVendorSelectionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitVendorSelection} className="bg-red-600 hover:bg-red-700">
              Send Quotation Request ({selectedVendorIds.length} vendors)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QTY/SCOPE Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QTY/SCOPE FLAG Review</DialogTitle>
            <DialogDescription>
              Review quantities and scope with Project Manager
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="notes">Review Notes</Label>
              <Textarea
                id="notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes or rejection reason"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitQtyScopeFlag(false)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => submitQtyScopeFlag(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve QTY/SCOPE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcurementVendorReview;