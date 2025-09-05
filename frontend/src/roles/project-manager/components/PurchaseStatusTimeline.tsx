/**
 * Purchase Status Timeline Component
 * Visual representation of purchase approval workflow
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, XCircle, Clock, User, Calendar,
  ArrowRight, AlertCircle, MessageSquare
} from 'lucide-react';
import { PurchaseStatusDetails } from '../services/projectManagerService';

interface PurchaseStatusTimelineProps {
  statusDetails: PurchaseStatusDetails;
}

export const PurchaseStatusTimeline: React.FC<PurchaseStatusTimelineProps> = ({
  statusDetails
}) => {
  // Combine and sort all statuses chronologically
  const allStatuses = [
    ...statusDetails.procurement_statuses.map(s => ({ ...s, department: 'Procurement' })),
    ...statusDetails.project_manager_statuses.map(s => ({ ...s, department: 'Project Manager' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'border-green-500 bg-green-50';
      case 'rejected':
        return 'border-red-500 bg-red-50';
      case 'pending':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'Procurement':
        return 'bg-blue-100 text-blue-800';
      case 'Project Manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Purchase Workflow Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {statusDetails.summary.procurement_approved_count + statusDetails.summary.pm_approved_count}
              </p>
              <p className="text-sm text-gray-600">Total Approvals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {statusDetails.summary.procurement_rejected_count + statusDetails.summary.pm_rejected_count}
              </p>
              <p className="text-sm text-gray-600">Total Rejections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {statusDetails.summary.total_procurement_statuses}
              </p>
              <p className="text-sm text-gray-600">Procurement Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {statusDetails.summary.total_pm_statuses}
              </p>
              <p className="text-sm text-gray-600">PM Actions</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            {allStatuses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No status history available
              </div>
            ) : (
              <div className="space-y-4">
                {allStatuses.map((status, index) => (
                  <motion.div
                    key={`${status.department}-${status.date}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex gap-4"
                  >
                    {/* Timeline Line */}
                    {index < allStatuses.length - 1 && (
                      <div className="absolute left-[18px] top-10 w-0.5 h-full bg-gray-300" />
                    )}

                    {/* Status Icon */}
                    <div className="flex-shrink-0 z-10 bg-white">
                      {getStatusIcon(status.status)}
                    </div>

                    {/* Status Content */}
                    <div className={`flex-1 border rounded-lg p-4 ${getStatusColor(status.status)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getDepartmentColor(status.department)}>
                            {status.department}
                          </Badge>
                          <Badge variant="outline">
                            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(status.date)}
                        </span>
                      </div>

                      {/* Decision By */}
                      {status.decision_by && (
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-700">
                            {status.decision_by.full_name}
                            {status.decision_by.email && (
                              <span className="text-gray-500 ml-1">
                                ({status.decision_by.email})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {status.rejection_reason && (
                        <div className="bg-red-100 border-l-4 border-red-500 p-2 mt-2">
                          <p className="text-sm font-medium text-red-900">
                            Rejection Reason:
                          </p>
                          <p className="text-sm text-red-800">{status.rejection_reason}</p>
                        </div>
                      )}

                      {/* Comments */}
                      {status.comments && (
                        <div className="flex gap-2 mt-2">
                          <MessageSquare className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">{status.comments}</p>
                        </div>
                      )}

                      {/* Reject Category */}
                      {status.reject_category && (
                        <Badge variant="outline" className="mt-2">
                          Category: {status.reject_category}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="mt-6 pt-4 border-t">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(statusDetails.latest_pm_proc_status.status)}
                  <div>
                    <p className="font-medium">
                      {statusDetails.latest_pm_proc_status.status.charAt(0).toUpperCase() + 
                       statusDetails.latest_pm_proc_status.status.slice(1)}
                    </p>
                    {statusDetails.latest_pm_proc_status.role && (
                      <p className="text-sm text-gray-600">
                        by {statusDetails.latest_pm_proc_status.role}
                      </p>
                    )}
                  </div>
                </div>
                {statusDetails.latest_pm_proc_status.date && (
                  <span className="text-sm text-gray-600">
                    {formatDate(statusDetails.latest_pm_proc_status.date)}
                  </span>
                )}
              </div>
              {statusDetails.latest_pm_proc_status.comments && (
                <p className="text-sm text-gray-700 mt-2">
                  {statusDetails.latest_pm_proc_status.comments}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};