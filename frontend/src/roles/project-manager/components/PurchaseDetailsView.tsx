/**
 * Purchase Details View Component
 * Displays complete purchase information including materials
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Calendar, Package, DollarSign, FileText,
  User, Mail, Tag, AlertTriangle, CheckCircle
} from 'lucide-react';
import { PurchaseStatusDetails } from '../services/projectManagerService';

interface PurchaseDetailsViewProps {
  details: PurchaseStatusDetails;
}

export const PurchaseDetailsView: React.FC<PurchaseDetailsViewProps> = ({ details }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Purchase Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Purchase #{details.purchase_id}</span>
            <Badge 
              variant={details.latest_pm_proc_status.status === 'approved' ? 'default' : 
                      details.latest_pm_proc_status.status === 'rejected' ? 'destructive' : 
                      'secondary'}
            >
              {details.latest_pm_proc_status.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Site Location</p>
                  <p className="text-sm text-gray-900">{details.purchase_details.site_location}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Request Date</p>
                  <p className="text-sm text-gray-900">{formatDate(details.purchase_details.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email Status</p>
                  <Badge variant={details.purchase_details.email_sent ? 'default' : 'secondary'}>
                    {details.purchase_details.email_sent ? 'Sent' : 'Not Sent'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Purpose</p>
                  <p className="text-sm text-gray-900">{details.purchase_details.purpose}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Created At</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(details.purchase_details.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materials Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Materials</p>
              <p className="text-2xl font-bold text-gray-900">
                {details.purchase_details.materials_summary.total_materials}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">
                {details.purchase_details.materials_summary.total_quantity}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Total Cost</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(details.purchase_details.materials_summary.total_cost)}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {details.purchase_details.materials_summary.categories.length}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Materials List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 mb-3">Material Details</h4>
            {details.purchase_details.materials_summary.materials.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Description</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-700">Category</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-700">Quantity</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-700">Unit</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-700">Unit Cost</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-700">Total</th>
                      <th className="text-center p-3 text-sm font-medium text-gray-700">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.purchase_details.materials_summary.materials.map(material => (
                      <tr key={material.material_id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{material.description}</td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline">{material.category}</Badge>
                        </td>
                        <td className="p-3 text-sm text-center font-medium">{material.quantity}</td>
                        <td className="p-3 text-sm text-center">{material.unit}</td>
                        <td className="p-3 text-sm text-right">{formatCurrency(material.cost)}</td>
                        <td className="p-3 text-sm text-right font-medium">
                          {formatCurrency(material.cost * material.quantity)}
                        </td>
                        <td className="p-3 text-sm text-center">
                          <Badge className={getPriorityColor(material.priority)}>
                            {material.priority}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={5} className="p-3 text-right">Grand Total:</td>
                      <td className="p-3 text-right text-lg">
                        {formatCurrency(details.purchase_details.materials_summary.total_cost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No materials data available
              </div>
            )}
          </div>

          {/* Categories */}
          {details.purchase_details.materials_summary.categories.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {details.purchase_details.materials_summary.categories.map(category => (
                    <Badge key={category} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Decision Information */}
      {details.latest_pm_proc_status.decision_by && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Last Decision By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {details.latest_pm_proc_status.decision_by.full_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {details.latest_pm_proc_status.decision_by.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {details.latest_pm_proc_status.role}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant={details.latest_pm_proc_status.status === 'approved' ? 'default' : 
                          details.latest_pm_proc_status.status === 'rejected' ? 'destructive' : 
                          'secondary'}
                  className="mb-2"
                >
                  {details.latest_pm_proc_status.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {details.latest_pm_proc_status.status === 'rejected' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {details.latest_pm_proc_status.status}
                </Badge>
                {details.latest_pm_proc_status.date && (
                  <p className="text-sm text-gray-600">
                    {formatDate(details.latest_pm_proc_status.date)}
                  </p>
                )}
              </div>
            </div>
            {details.latest_pm_proc_status.comments && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  {details.latest_pm_proc_status.comments}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};