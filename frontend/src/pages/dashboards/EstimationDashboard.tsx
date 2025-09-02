import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  Calculator, 
  CheckCircle, 
  FileText, 
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const EstimationDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'Quotes Pending',
      value: '12',
      change: '+3',
      icon: Calculator,
      color: 'amber'
    },
    {
      title: 'Approved Budgets',
      value: '28',
      change: '+5',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Cost Analysis',
      value: '5',
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Accuracy Rate',
      value: '94%',
      change: '+2%',
      icon: TrendingUp,
      color: 'purple'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pending Quotations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-600" />
          Pending Quotations
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Marina Bay Tower - Phase 3</p>
                <p className="text-sm text-gray-600">AED 2.5M • Due in 2 days</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                Review
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Downtown Complex - MEP</p>
                <p className="text-sm text-gray-600">AED 1.8M • Due tomorrow</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                Review
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Villa Project - Interior</p>
                <p className="text-sm text-gray-600">AED 850K • Due in 5 days</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                Review
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Cost Analysis Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Cost Analysis Summary
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Variance</span>
            <span className="font-semibold text-green-600">-3.5%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Estimated</span>
            <span className="font-semibold">AED 45.8M</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Actual Costs</span>
            <span className="font-semibold">AED 44.2M</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cost Savings</span>
            <span className="font-semibold text-green-600">AED 1.6M</span>
          </div>
        </div>
      </Card>

      {/* Budget Tracking */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Recent Budget Approvals
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Office Complex - Foundation</p>
                <p className="text-sm text-gray-600">AED 3.2M • Approved</p>
              </div>
              <span className="text-xs text-green-700">Yesterday</span>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Retail Space - Fit-out</p>
                <p className="text-sm text-gray-600">AED 1.5M • Approved</p>
              </div>
              <span className="text-xs text-green-700">2 days ago</span>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Hotel Renovation</p>
                <p className="text-sm text-gray-600">AED 4.8M • Under Review</p>
              </div>
              <span className="text-xs text-yellow-700">Pending</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
            onClick={() => navigate('/procurement/quotations')}
          >
            <Calculator className="w-4 h-4" />
            New Quote
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/analytics')}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/procurement/approvals')}
          >
            <CheckCircle className="w-4 h-4" />
            Approvals
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/projects')}
          >
            <FileText className="w-4 h-4" />
            Projects
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <BaseDashboard
      title="Estimation Dashboard"
      subtitle="Cost analysis and budget management"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default EstimationDashboard;