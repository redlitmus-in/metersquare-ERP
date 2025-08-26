import React from 'react';
import ApprovalWorkflow from '@/components/workflow/ApprovalWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ApprovalsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage workflow approvals and track document status</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Requisition Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalWorkflow 
              documentType="purchase_requisition"
              documentId="PR-001"
              currentUserRole="TECHNICAL_DIRECTOR"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Quotation Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalWorkflow 
              documentType="vendor_quotation"
              documentId="VQ-001"
              currentUserRole="PROJECT_MANAGER"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Material Requisition Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalWorkflow 
              documentType="material_requisition"
              documentId="MR-001"
              currentUserRole="PROCUREMENT"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApprovalsPage;