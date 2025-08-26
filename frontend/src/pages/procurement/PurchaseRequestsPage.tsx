import React, { useState } from 'react';
import PurchaseRequisitionForm from '@/components/forms/PurchaseRequisitionForm';
import PurchaseRequestsList from './PurchaseRequestsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListIcon, PlusCircleIcon } from 'lucide-react';

const PurchaseRequestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListIcon className="w-4 h-4" />
            All Requests
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <PlusCircleIcon className="w-4 h-4" />
            Create New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <PurchaseRequestsList />
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <PurchaseRequisitionForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchaseRequestsPage;