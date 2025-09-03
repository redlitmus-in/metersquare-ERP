import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  HardHat, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  Truck,
  Users,
  Activity,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const SiteSupervisorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'Active Sites',
      value: '3',
      icon: HardHat,
      color: 'orange'
    },
    {
      title: 'Material Requests',
      value: '12',
      change: '+4',
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Workers On Site',
      value: '45',
      icon: Users,
      color: 'green'
    },
    {
      title: 'Safety Incidents',
      value: '0',
      change: 'Safe',
      icon: AlertTriangle,
      color: 'red'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Site Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HardHat className="w-5 h-5 text-orange-600" />
          Site Operations Status
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Marina Bay Tower - Site A</p>
                <p className="text-sm text-gray-600">Interior finishing phase</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Downtown Complex - Site B</p>
                <p className="text-sm text-gray-600">Structural works</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">In Progress</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Material Tracking */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          Material Deliveries Today
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Cement Bags - 500 units</p>
                <p className="text-sm text-gray-600">Expected: 10:00 AM</p>
              </div>
              <span className="text-xs text-yellow-700">Pending</span>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">Steel Reinforcement</p>
                <p className="text-sm text-gray-600">Delivered: 8:30 AM</p>
              </div>
              <span className="text-xs text-green-700">Received</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            className="bg-orange-600 hover:bg-orange-700 flex flex-col items-center gap-2 h-20"
            onClick={() => navigate('/procurement')}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">Request Materials</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-20"
            onClick={() => navigate('/workflows/material-dispatch-site')}
          >
            <Truck className="w-5 h-5" />
            <span className="text-xs">Track Delivery</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-20"
            onClick={() => navigate('/tasks')}
          >
            <CheckCircle className="w-5 h-5" />
            <span className="text-xs">Daily Tasks</span>
          </Button>
          <Button 
            variant="outline" 
            className="flex flex-col items-center gap-2 h-20"
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs">Safety Report</span>
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <BaseDashboard
      title="Site Supervisor Dashboard"
      subtitle="Manage site operations and material requests"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default SiteSupervisorDashboard;