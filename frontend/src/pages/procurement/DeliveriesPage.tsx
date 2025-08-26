import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TruckIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  AlertCircleIcon,
  EyeIcon,
  EditIcon,
  PackageIcon
} from 'lucide-react';

interface Delivery {
  id: string;
  purchaseOrderId: string;
  supplierName: string;
  deliveryDate: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
  items: number;
  totalValue: number;
}

const DeliveriesPage: React.FC = () => {
  const deliveries: Delivery[] = [
    {
      id: 'DEL-001',
      purchaseOrderId: 'PO-2024-001',
      supplierName: 'Singapore Hardware Supplies',
      deliveryDate: '2024-08-26',
      status: 'in_transit',
      items: 15,
      totalValue: 45000
    },
    {
      id: 'DEL-002', 
      purchaseOrderId: 'PO-2024-002',
      supplierName: 'Premium Building Materials',
      deliveryDate: '2024-08-27',
      status: 'pending',
      items: 8,
      totalValue: 32000
    },
    {
      id: 'DEL-003',
      purchaseOrderId: 'PO-2024-003', 
      supplierName: 'Elite Construction Supplies',
      deliveryDate: '2024-08-25',
      status: 'delivered',
      items: 22,
      totalValue: 67500
    }
  ];

  const getStatusBadge = (status: Delivery['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: ClockIcon },
      in_transit: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: TruckIcon },
      delivered: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircleIcon },
      delayed: { color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircleIcon }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-xl p-6 text-gray-800 border border-red-200"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur">
            <TruckIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Delivery Management</h1>
            <p className="text-gray-600 mt-1">Track and manage procurement deliveries</p>
          </div>
        </div>
      </motion.div>

      {/* Deliveries List */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b">
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="w-5 h-5 text-red-600" />
            Active Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveries.map((delivery, index) => (
                  <motion.tr 
                    key={delivery.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{delivery.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.purchaseOrderId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.supplierName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.deliveryDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.items} items</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        AED {delivery.totalValue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-900">
                          <EditIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveriesPage;