import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Calendar,
  TrendingUp,
  Package,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ProjectManagerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'Active Projects',
      value: '8',
      change: '+2',
      icon: Package,
      color: 'green'
    },
    {
      title: 'Tasks Completed',
      value: '127',
      change: '+15',
      icon: CheckCircle,
      color: 'emerald'
    },
    {
      title: 'Pending Tasks',
      value: '34',
      change: '-5',
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'Team Members',
      value: '24',
      change: '+3',
      icon: Users,
      color: 'blue'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-green-600" />
          Project Status Overview
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Marina Bay Tower</p>
              <p className="text-sm text-gray-600">Phase 3 - Interior Works</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">On Track</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Downtown Office Complex</p>
              <p className="text-sm text-gray-600">Phase 2 - MEP Installation</p>
            </div>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">At Risk</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Luxury Villa Project</p>
              <p className="text-sm text-gray-600">Phase 1 - Foundation</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Planning</span>
          </div>
        </div>
      </Card>

      {/* Pending Approvals */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Pending Approvals
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Material Request - Tiles</p>
                <p className="text-sm text-gray-600 mt-1">AED 45,000 • Site Supervisor</p>
              </div>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Approve
              </Button>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Vendor Quotation</p>
                <p className="text-sm text-gray-600 mt-1">AED 120,000 • Procurement</p>
              </div>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Review
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Team Performance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Team Performance
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tasks Completion Rate</span>
            <span className="font-semibold">78%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">On-Time Delivery</span>
            <span className="font-semibold">85%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Budget Adherence</span>
            <span className="font-semibold text-green-600">92%</span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/projects')}
          >
            <FileText className="w-4 h-4" />
            View Projects
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/tasks')}
          >
            <CheckCircle className="w-4 h-4" />
            Manage Tasks
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/procurement/approvals')}
          >
            <AlertCircle className="w-4 h-4" />
            Approvals
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/analytics')}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <BaseDashboard
      title="Project Manager Dashboard"
      subtitle="Manage projects, teams, and approvals"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default ProjectManagerDashboard;