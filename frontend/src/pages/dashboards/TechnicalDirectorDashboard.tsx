import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TechnicalDirectorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'Active Projects',
      value: '24',
      change: '+3',
      icon: Briefcase,
      color: 'blue'
    },
    {
      title: 'Total Budget',
      value: 'AED 12.5M',
      change: '+15%',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Team Members',
      value: '156',
      change: '+12',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Pending Approvals',
      value: '8',
      change: '-2',
      icon: Clock,
      color: 'orange'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Executive Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Executive Overview
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Project Completion Rate</span>
            <span className="font-semibold">87%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Resource Utilization</span>
            <span className="font-semibold">92%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Cost Efficiency</span>
            <span className="font-semibold text-green-600">+8%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Quality Score</span>
            <span className="font-semibold">4.8/5.0</span>
          </div>
        </div>
      </Card>

      {/* Critical Decisions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Pending Critical Decisions
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Marina Bay Tower - Budget Approval</p>
                <p className="text-sm text-gray-600 mt-1">Requires approval for AED 2.5M extension</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Review
              </Button>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Vendor Contract - Critical</p>
                <p className="text-sm text-gray-600 mt-1">New vendor evaluation for MEP works</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Review
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2"
            onClick={() => navigate('/procurement/approvals')}
          >
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <span className="text-sm">Approve Requests</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2"
            onClick={() => navigate('/analytics')}
          >
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <span className="text-sm">View Analytics</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2"
            onClick={() => navigate('/projects')}
          >
            <Briefcase className="w-6 h-6 text-purple-600" />
            <span className="text-sm">All Projects</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-20 flex flex-col gap-2"
            onClick={() => navigate('/workflow-status')}
          >
            <Clock className="w-6 h-6 text-orange-600" />
            <span className="text-sm">Workflow Status</span>
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <BaseDashboard
      title="Technical Director Dashboard"
      subtitle="Executive overview and strategic decisions"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default TechnicalDirectorDashboard;