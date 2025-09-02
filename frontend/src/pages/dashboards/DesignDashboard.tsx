import React from 'react';
import BaseDashboard from './BaseDashboard';
import { 
  Layers, 
  Clock, 
  CheckCircle, 
  FileText,
  Palette,
  PenTool,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DesignDashboard: React.FC = () => {
  const navigate = useNavigate();

  const metrics = [
    {
      title: 'Design Projects',
      value: '14',
      change: '+2',
      icon: Layers,
      color: 'purple'
    },
    {
      title: 'Reviews Pending',
      value: '6',
      change: '-1',
      icon: Clock,
      color: 'orange'
    },
    {
      title: 'Approved Designs',
      value: '42',
      change: '+8',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Revisions',
      value: '8',
      icon: FileText,
      color: 'blue'
    }
  ];

  const roleSpecificContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Active Design Projects */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          Active Design Projects
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Marina Bay Tower - Interior Design</p>
                <p className="text-sm text-gray-600">Phase 3 - Final Review</p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                View
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Downtown Complex - Facade</p>
                <p className="text-sm text-gray-600">Concept Development</p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                View
              </Button>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Luxury Villa - Landscape</p>
                <p className="text-sm text-gray-600">Initial Sketches</p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                View
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Pending Reviews */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-orange-600" />
          Pending Reviews
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Floor Plan - Building A</p>
                <p className="text-sm text-gray-600 mt-1">Technical Director Review</p>
              </div>
              <span className="text-xs text-orange-700">Urgent</span>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">3D Renders - Lobby</p>
                <p className="text-sm text-gray-600 mt-1">Client Approval Pending</p>
              </div>
              <span className="text-xs text-yellow-700">2 days</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Material Specifications</p>
                <p className="text-sm text-gray-600 mt-1">Procurement Review</p>
              </div>
              <span className="text-xs text-blue-700">3 days</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Design Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PenTool className="w-5 h-5 text-blue-600" />
          Design Performance
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">On-Time Delivery</span>
            <span className="font-semibold">89%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Client Satisfaction</span>
            <span className="font-semibold text-green-600">4.7/5.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Revision Rate</span>
            <span className="font-semibold">12%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Approval Rate</span>
            <span className="font-semibold">94%</span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
            onClick={() => navigate('/projects')}
          >
            <Layers className="w-4 h-4" />
            New Design
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Review Queue
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Revisions
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
      title="Design Dashboard"
      subtitle="Design reviews and technical approvals"
      metrics={metrics}
      roleSpecificContent={roleSpecificContent}
    />
  );
};

export default DesignDashboard;