import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Clock,
  CreditCard,
  Receipt,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AccountsDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'Pending Payments',
      value: '24',
      change: '-3',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'Invoices',
      value: '156',
      change: '+12',
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Total Revenue',
      value: 'AED 8.5M',
      change: '+15%',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Overdue',
      value: '3',
      change: '-2',
      icon: Clock,
      color: 'red'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pending Payments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Pending Payments
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Al Futtaim Trading - Invoice #1234</p>
                <p className="text-sm text-gray-600">AED 125,000 • Due in 3 days</p>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                Process
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Emirates Steel - Invoice #5678</p>
                <p className="text-sm text-gray-600">AED 85,000 • Due tomorrow</p>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                Process
              </Button>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Dubai Cement Co. - Invoice #9012</p>
                <p className="text-sm text-gray-600 text-red-600">AED 45,000 • Overdue 2 days</p>
              </div>
              <Button size="sm" variant="destructive">
                Urgent
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Financial Summary - This Month
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Income</span>
            <span className="font-semibold text-green-600">AED 2.8M</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Expenses</span>
            <span className="font-semibold">AED 2.1M</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Net Profit</span>
            <span className="font-semibold text-green-600">AED 700K</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cash Flow</span>
            <span className="font-semibold">Positive</span>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          Recent Transactions
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Payment Received - Marina Bay</p>
                <p className="text-sm text-gray-600">AED 500,000</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Vendor Payment - Materials</p>
                <p className="text-sm text-gray-600">AED 125,000</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Pending - Downtown Complex</p>
                <p className="text-sm text-gray-600">AED 750,000</p>
              </div>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            New Invoice
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Process Payment
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/analytics')}
          >
            <TrendingUp className="w-4 h-4" />
            Reports
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Statements
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <BaseDashboard
      title="Accounts Dashboard"
      subtitle="Financial management and payment processing"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default AccountsDashboard;