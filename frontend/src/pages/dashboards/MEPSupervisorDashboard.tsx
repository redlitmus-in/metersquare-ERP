import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Wrench,
  AlertTriangle,
  FileText,
  Shield
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const MEPSupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'MEP Systems',
      value: '8',
      icon: Activity,
      color: 'cyan'
    },
    {
      title: 'Active Tasks',
      value: '15',
      change: '+3',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Pending Approvals',
      value: '3',
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'Compliance Rate',
      value: '96%',
      change: '+2%',
      icon: TrendingUp,
      color: 'blue'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* MEP Systems Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-600" />
          MEP Systems Status
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">HVAC System - Building A</p>
                <p className="text-sm text-gray-600">Maintenance scheduled</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Operational</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Electrical Panel - Floor 3</p>
                <p className="text-sm text-gray-600">Testing in progress</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Testing</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Plumbing System - Zone B</p>
                <p className="text-sm text-gray-600">Installation phase</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">In Progress</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Maintenance Schedule */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          Upcoming Maintenance
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">HVAC Filter Replacement</p>
                <p className="text-sm text-gray-600 mt-1">Tomorrow at 10:00 AM</p>
              </div>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Electrical System Check</p>
                <p className="text-sm text-gray-600 mt-1">Next Week - Monday</p>
              </div>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Compliance & Safety */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Compliance & Safety
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Safety Inspections</span>
            <span className="font-semibold text-green-600">100% Complete</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Code Compliance</span>
            <span className="font-semibold">96%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Incident Reports</span>
            <span className="font-semibold text-green-600">0 This Month</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Certifications Valid</span>
            <span className="font-semibold">All Current</span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2"
            onClick={() => navigate('/procurement/requests')}
          >
            <FileText className="w-4 h-4" />
            New Request
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/workflows/material-dispatch-site')}
          >
            <Activity className="w-4 h-4" />
            System Status
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate('/tasks')}
          >
            <CheckCircle className="w-4 h-4" />
            View Tasks
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Issue
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <BaseDashboard
      title="MEP Supervisor Dashboard"
      subtitle="Manage MEP systems and operations"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default MEPSupervisorDashboard;