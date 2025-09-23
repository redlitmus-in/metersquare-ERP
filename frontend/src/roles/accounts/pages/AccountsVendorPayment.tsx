import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Building2,
  Calendar,
  TrendingUp,
  Download,
  Send,
  Calculator,
  Receipt,
  Banknote,
  ArrowUpDown,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface VendorPayment {
  id: string;
  sowNumber: string;
  projectName: string;
  vendorName: string;
  vendorBankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    iban: string;
    swiftCode: string;
  };
  category: string;
  totalAmount: number;
  paymentTerms: string;
  paymentSchedule: {
    milestone: string;
    percentage: number;
    amount: number;
    dueDate: string;
    status: 'pending' | 'processing' | 'paid';
    paidDate?: string;
    transactionRef?: string;
  }[];
  tdApprovalDate: string;
  status: 'setup_pending' | 'active' | 'completed';
  totalPaid: number;
  totalPending: number;
  taxDetails?: {
    vatNumber: string;
    vatAmount: number;
  };
}

const AccountsVendorPayment: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('new');
  const [selectedPayment, setSelectedPayment] = useState<VendorPayment | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    transactionRef: '',
    paymentMethod: '',
    notes: ''
  });

  const [payments, setPayments] = useState<VendorPayment[]>([
    {
      id: '1',
      sowNumber: 'SOW-2024-041',
      projectName: 'Sharjah Office Complex',
      vendorName: 'XYZ Contractors',
      category: 'Civil Works',
      totalAmount: 450000,
      paymentTerms: '30% Advance, 40% Progress, 30% Completion',
      paymentSchedule: [
        {
          milestone: 'Advance Payment',
          percentage: 30,
          amount: 135000,
          dueDate: '2024-03-20',
          status: 'pending'
        },
        {
          milestone: '50% Completion',
          percentage: 40,
          amount: 180000,
          dueDate: '2024-04-15',
          status: 'pending'
        },
        {
          milestone: 'Project Completion',
          percentage: 30,
          amount: 135000,
          dueDate: '2024-05-10',
          status: 'pending'
        }
      ],
      tdApprovalDate: '2024-03-18',
      status: 'setup_pending',
      totalPaid: 0,
      totalPending: 450000,
      taxDetails: {
        vatNumber: 'TRN100234567890003',
        vatAmount: 22500
      }
    },
    {
      id: '2',
      sowNumber: 'SOW-2024-043',
      projectName: 'Abu Dhabi Mall',
      vendorName: 'Global MEP Solutions',
      vendorBankDetails: {
        accountName: 'Global MEP Solutions LLC',
        accountNumber: '1234567890',
        bankName: 'Emirates NBD',
        iban: 'AE070331234567890123456',
        swiftCode: 'EBILAEAD'
      },
      category: 'MEP Systems',
      totalAmount: 280000,
      paymentTerms: '25% Advance, 50% Progress, 25% Completion',
      paymentSchedule: [
        {
          milestone: 'Advance Payment',
          percentage: 25,
          amount: 70000,
          dueDate: '2024-03-10',
          status: 'paid',
          paidDate: '2024-03-10',
          transactionRef: 'TXN-2024-0310-001'
        },
        {
          milestone: 'Equipment Delivery',
          percentage: 50,
          amount: 140000,
          dueDate: '2024-03-25',
          status: 'processing'
        },
        {
          milestone: 'Installation Complete',
          percentage: 25,
          amount: 70000,
          dueDate: '2024-04-20',
          status: 'pending'
        }
      ],
      tdApprovalDate: '2024-03-08',
      status: 'active',
      totalPaid: 70000,
      totalPending: 210000,
      taxDetails: {
        vatNumber: 'TRN100234567890004',
        vatAmount: 14000
      }
    }
  ]);

  const stats = {
    newSetups: payments.filter(p => p.status === 'setup_pending').length,
    activePayments: payments.filter(p => p.status === 'active').length,
    completedPayments: payments.filter(p => p.status === 'completed').length,
    totalPending: payments.reduce((sum, p) => sum + p.totalPending, 0),
    totalPaid: payments.reduce((sum, p) => sum + p.totalPaid, 0)
  };

  const handlePaymentSetup = (payment: VendorPayment) => {
    setSelectedPayment(payment);
    setIsSetupDialogOpen(true);
  };

  const handleProcessPayment = (payment: VendorPayment, milestoneIndex: number) => {
    setSelectedPayment(payment);
    setIsPaymentDialogOpen(true);
  };

  const submitPaymentSetup = () => {
    toast.success('Vendor payment account setup completed');
    setIsSetupDialogOpen(false);
  };

  const submitPayment = () => {
    if (!paymentDetails.transactionRef || !paymentDetails.paymentMethod) {
      toast.error('Please provide transaction details');
      return;
    }

    toast.success('Payment processed successfully');
    setIsPaymentDialogOpen(false);
    setPaymentDetails({
      transactionRef: '',
      paymentMethod: '',
      notes: ''
    });
  };

  const getPaymentProgress = (schedule: any[]) => {
    const total = schedule.length;
    const paid = schedule.filter(s => s.status === 'paid').length;
    return (paid / total) * 100;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header - ACCOUNTS View */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6 border"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-green-600" />
              Vendor Payment Management - Accounts
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Setup vendor accounts and process payments after TD approval
            </p>
          </div>
        </div>
      </motion.div>

      {/* Workflow Alert */}
      <Alert className="border-green-200 bg-green-50">
        <Banknote className="h-4 w-4 text-green-600" />
        <AlertTitle>Payment Processing Stage</AlertTitle>
        <AlertDescription>
          You receive approved vendors from Technical Director. Process payments according to agreed terms and milestones.
          <strong> Final step before Task Completion.</strong>
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Setups</p>
                <p className="text-2xl font-bold text-blue-600">{stats.newSetups}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activePayments}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completedPayments}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-lg font-bold text-amber-600">AED {(stats.totalPending / 1000).toFixed(0)}K</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-lg font-bold text-green-600">AED {(stats.totalPaid / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="new">New Vendor Setups</TabsTrigger>
              <TabsTrigger value="active">Active Payments</TabsTrigger>
              <TabsTrigger value="history">Payment History</TabsTrigger>
            </TabsList>

            {/* New Vendor Setups */}
            <TabsContent value="new" className="space-y-4 mt-6">
              {payments.filter(p => p.status === 'setup_pending').map((payment) => (
                <Card key={payment.id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">{payment.sowNumber}</h3>
                          <Badge className="bg-blue-100 text-blue-800">Setup Required</Badge>
                          <Badge variant="outline">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            TD Approved {new Date(payment.tdApprovalDate).toLocaleDateString()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Vendor</p>
                            <p className="font-medium">{payment.vendorName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Project</p>
                            <p className="font-medium">{payment.projectName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="font-bold text-green-600">AED {payment.totalAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">VAT</p>
                            <p className="font-medium">AED {payment.taxDetails?.vatAmount.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-2">Payment Terms:</p>
                          <p className="text-sm text-gray-600">{payment.paymentTerms}</p>
                          <div className="mt-2 space-y-1">
                            {payment.paymentSchedule.map((schedule, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{schedule.milestone}</span>
                                <span className="font-medium">AED {schedule.amount.toLocaleString()} ({schedule.percentage}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <Button
                          onClick={() => handlePaymentSetup(payment)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Setup Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Active Payments */}
            <TabsContent value="active" className="space-y-4 mt-6">
              {payments.filter(p => p.status === 'active').map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{payment.sowNumber}</h3>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Payment Progress</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={getPaymentProgress(payment.paymentSchedule)} className="w-24 h-2" />
                          <span className="text-sm font-medium">{getPaymentProgress(payment.paymentSchedule).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Vendor</p>
                        <p className="font-medium">{payment.vendorName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Paid</p>
                        <p className="font-bold text-green-600">AED {payment.totalPaid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="font-bold text-amber-600">AED {payment.totalPending.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Payment Schedule */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium text-gray-700">Milestone</th>
                            <th className="text-center p-3 text-sm font-medium text-gray-700">Amount</th>
                            <th className="text-center p-3 text-sm font-medium text-gray-700">Due Date</th>
                            <th className="text-center p-3 text-sm font-medium text-gray-700">Status</th>
                            <th className="text-center p-3 text-sm font-medium text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payment.paymentSchedule.map((schedule, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3 text-sm">{schedule.milestone}</td>
                              <td className="p-3 text-sm text-center font-medium">
                                AED {schedule.amount.toLocaleString()}
                              </td>
                              <td className="p-3 text-sm text-center">
                                {new Date(schedule.dueDate).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-center">
                                {schedule.status === 'paid' && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Paid
                                  </Badge>
                                )}
                                {schedule.status === 'processing' && (
                                  <Badge className="bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Processing
                                  </Badge>
                                )}
                                {schedule.status === 'pending' && (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {schedule.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleProcessPayment(payment, index)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Process
                                  </Button>
                                )}
                                {schedule.status === 'paid' && schedule.transactionRef && (
                                  <span className="text-xs text-gray-500">{schedule.transactionRef}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bank Details */}
                    {payment.vendorBankDetails && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-2">Bank Details:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Account: </span>
                            <span className="font-medium">{payment.vendorBankDetails.accountNumber}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">IBAN: </span>
                            <span className="font-medium">{payment.vendorBankDetails.iban}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Bank: </span>
                            <span className="font-medium">{payment.vendorBankDetails.bankName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Payment History */}
            <TabsContent value="history" className="space-y-4 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Completed Transactions</h3>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>

              <div className="space-y-3">
                {payments.flatMap(p =>
                  p.paymentSchedule
                    .filter(s => s.status === 'paid')
                    .map(s => ({
                      ...s,
                      vendorName: p.vendorName,
                      sowNumber: p.sowNumber
                    }))
                ).map((transaction, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Receipt className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium">{transaction.vendorName}</p>
                            <p className="text-sm text-gray-600">
                              {transaction.sowNumber} • {transaction.milestone}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">AED {transaction.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            {transaction.paidDate} • {transaction.transactionRef}
                          </p>
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

      {/* Payment Setup Dialog */}
      <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Payment Account Setup</DialogTitle>
            <DialogDescription>
              Setup payment account for {selectedPayment?.vendorName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account-name">Account Name</Label>
                <Input id="account-name" placeholder="Vendor account name" />
              </div>
              <div>
                <Label htmlFor="account-number">Account Number</Label>
                <Input id="account-number" placeholder="Account number" />
              </div>
              <div>
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input id="bank-name" placeholder="Bank name" />
              </div>
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Input id="iban" placeholder="IBAN number" />
              </div>
              <div>
                <Label htmlFor="swift">SWIFT Code</Label>
                <Input id="swift" placeholder="SWIFT code" />
              </div>
              <div>
                <Label htmlFor="vat">VAT Number</Label>
                <Input id="vat" placeholder="VAT registration number" />
              </div>
            </div>

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Ensure all bank details are verified before setup. This will enable payment processing for this vendor.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPaymentSetup} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Process payment for {selectedPayment?.vendorName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="transaction-ref">Transaction Reference *</Label>
              <Input
                id="transaction-ref"
                value={paymentDetails.transactionRef}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, transactionRef: e.target.value })}
                placeholder="TXN-2024-XXXX"
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select
                value={paymentDetails.paymentMethod}
                onValueChange={(value) => setPaymentDetails({ ...paymentDetails, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Payment Notes</Label>
              <Textarea
                id="notes"
                value={paymentDetails.notes}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, notes: e.target.value })}
                placeholder="Additional payment notes"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsVendorPayment;