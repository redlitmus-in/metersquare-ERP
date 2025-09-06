import React, { useState, useEffect } from 'react';
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
  PackageIcon,
  Search,
  Filter,
  Download,
  Plus
} from 'lucide-react';
import ModernLoadingSpinners from '@/components/ui/ModernLoadingSpinners';
import { useNavigate } from 'react-router-dom';
import DocumentViewModal from '@/components/DocumentViewModal';
import { toast } from 'sonner';
import { apiClient } from '@/api/config';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

interface Delivery {
  id: string;
  deliveryNumber: string;
  purchaseOrderId: string;
  supplierName: string;
  deliveryDate: string;
  expectedDate: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
  items: number;
  totalValue: number;
  receivedBy?: string;
  notes?: string;
  trackingNumber?: string;
}

const DeliveriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch deliveries from API
  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get('/deliveries');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for now - will be replaced with real API call
      const mockDeliveries: Delivery[] = [
        {
          id: '1',
          deliveryNumber: 'DEL-2024-001',
          purchaseOrderId: 'PO-2024-001',
          supplierName: 'Singapore Hardware Supplies',
          deliveryDate: '2024-09-05',
          expectedDate: '2024-09-05',
          status: 'in_transit',
          items: 15,
          totalValue: 45000,
          trackingNumber: 'TRK-SHS-001',
          notes: 'Delivery scheduled for morning slot'
        },
        {
          id: '2',
          deliveryNumber: 'DEL-2024-002',
          purchaseOrderId: 'PO-2024-002',
          supplierName: 'Premium Building Materials',
          deliveryDate: '2024-09-06',
          expectedDate: '2024-09-06',
          status: 'pending',
          items: 8,
          totalValue: 32000,
          notes: 'Awaiting dispatch confirmation'
        },
        {
          id: '3',
          deliveryNumber: 'DEL-2024-003',
          purchaseOrderId: 'PO-2024-003',
          supplierName: 'Elite Construction Supplies',
          deliveryDate: '2024-09-03',
          expectedDate: '2024-09-03',
          status: 'delivered',
          items: 22,
          totalValue: 67500,
          receivedBy: 'Site Supervisor',
          notes: 'All items received in good condition'
        }
      ];
      
      setDeliveries(mockDeliveries);
    } catch (err: any) {
      console.error('Error fetching deliveries:', err);
      setError(err.response?.data?.error || 'Failed to fetch deliveries');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  // Role-based permissions
  const canCreateDelivery = () => {
    return [UserRole.PROCUREMENT, UserRole.STORE_IN_CHARGE].includes(user?.role_id as UserRole);
  };

  const canEditDelivery = (delivery: Delivery) => {
    return [UserRole.PROCUREMENT, UserRole.STORE_IN_CHARGE].includes(user?.role_id as UserRole) && 
           delivery.status !== 'delivered';
  };

  // Filter deliveries based on search and status
  const getFilteredDeliveries = () => {
    let filtered = deliveries;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(delivery => 
        delivery.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.purchaseOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        delivery.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === filterStatus);
    }

    return filtered;
  };

  const filteredDeliveries = getFilteredDeliveries();

  const getStatusBadge = (status: Delivery['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: ClockIcon },
      in_transit: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: TruckIcon },
      delivered: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircleIcon },
      delayed: { color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircleIcon },
      cancelled: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: AlertCircleIcon }
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredDeliveries.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <PackageIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredDeliveries.filter(d => d.status === 'in_transit').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredDeliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  AED {filteredDeliveries.reduce((sum, d) => sum + d.totalValue, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by delivery number, PO, or supplier..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
                title="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button variant="outline" className="px-4">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
              <Button variant="outline" className="px-4">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {canCreateDelivery() && (
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Delivery
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-green-600" />
              Deliveries
            </CardTitle>
            <div className="text-sm text-gray-600">
              {filteredDeliveries.length} {filteredDeliveries.length === 1 ? 'delivery' : 'deliveries'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ModernLoadingSpinners variant="pulse-wave" size="lg" />
              <span className="ml-2 text-gray-600">Loading deliveries...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchDeliveries} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No deliveries found</p>
              {canCreateDelivery() && (
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Delivery
                </Button>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Date
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
                {filteredDeliveries.map((delivery, index) => (
                  <motion.tr 
                    key={delivery.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-green-600">{delivery.deliveryNumber}</div>
                      {delivery.trackingNumber && (
                        <div className="text-xs text-gray-500">{delivery.trackingNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.purchaseOrderId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.supplierName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{delivery.expectedDate}</div>
                      {delivery.status === 'delivered' && delivery.deliveryDate && (
                        <div className="text-xs text-green-600">Delivered: {delivery.deliveryDate}</div>
                      )}
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
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setShowViewModal(true);
                          }}
                          title="View Delivery Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {canEditDelivery(delivery) && (
                          <button 
                            className="text-yellow-600 hover:text-yellow-800"
                            onClick={() => navigate(`/procurement/deliveries/edit/${delivery.id}`)}
                            title="Edit Delivery"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery View Modal */}
      <DocumentViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedDelivery(null);
        }}
        documentType="Delivery Note"
        documentData={selectedDelivery}
        onEdit={() => {
          setShowViewModal(false);
          if (selectedDelivery) {
            navigate(`/procurement/deliveries/edit/${selectedDelivery.id}`);
          }
        }}
      />
    </div>
  );
};

export default DeliveriesPage;