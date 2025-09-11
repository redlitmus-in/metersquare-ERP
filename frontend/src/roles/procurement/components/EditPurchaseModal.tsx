import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { procurementService, Purchase, Material } from '../services/procurementService';
import {
  Package,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  DollarSign
} from 'lucide-react';

interface EditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onSave: () => void;
}

const EditPurchaseModal: React.FC<EditPurchaseModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    site_location: '',
    purpose: '',
    requested_by: '',
    materials: [] as Material[]
  });

  useEffect(() => {
    if (purchase) {
      setFormData({
        project_id: String(purchase.project_id || ''),
        site_location: String(purchase.site_location || ''),
        purpose: String(purchase.purpose || ''),
        requested_by: String(purchase.requested_by || ''),
        materials: purchase.materials || []
      });
    }
  }, [purchase]);

  const handleMaterialChange = (index: number, field: keyof Material, value: any) => {
    const updatedMaterials = [...formData.materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: field === 'quantity' || field === 'cost' ? Number(value) : value
    };
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const addMaterial = () => {
    const newMaterial: Material = {
      material_id: Date.now(), // Temporary ID
      description: '',
      quantity: 1,
      unit: 'pcs',
      cost: 0,
      priority: 'medium'
    };
    setFormData({
      ...formData,
      materials: [...formData.materials, newMaterial]
    });
  };

  const removeMaterial = (index: number) => {
    const updatedMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: updatedMaterials });
  };

  const calculateTotal = () => {
    return formData.materials.reduce((sum, m) => sum + (m.quantity * m.cost), 0);
  };

  const handleSubmit = async () => {
    if (!purchase) return;

    // Validation - ensure values are strings before calling trim()
    const projectId = String(formData.project_id || '');
    const siteLocation = String(formData.site_location || '');
    const purpose = String(formData.purpose || '');
    const requestedBy = String(formData.requested_by || '');

    if (!projectId.trim()) {
      toast.error('Project ID is required');
      return;
    }

    if (!siteLocation.trim()) {
      toast.error('Site location is required');
      return;
    }

    if (!purpose.trim()) {
      toast.error('Purpose is required');
      return;
    }

    // Requested By field is not editable, so no validation needed

    if (formData.materials.length === 0) {
      toast.error('At least one material is required');
      return;
    }

    // Validate materials
    for (let i = 0; i < formData.materials.length; i++) {
      const material = formData.materials[i];
      if (!material.description.trim()) {
        toast.error(`Material ${i + 1}: Description is required`);
        return;
      }
      if (material.quantity <= 0) {
        toast.error(`Material ${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (material.cost < 0) {
        toast.error(`Material ${i + 1}: Cost cannot be negative`);
        return;
      }
    }

    try {
      setLoading(true);
      
      // Prepare update data (excluding requested_by since it shouldn't be changed)
      const updateData = {
        project_id: String(formData.project_id),
        site_location: String(formData.site_location),
        purpose: String(formData.purpose),
        // Don't include requested_by in update - it should remain as originally set
        materials: formData.materials.map(m => ({
          ...m,
          description: String(m.description),
          unit: String(m.unit || 'pcs'),
          quantity: Number(m.quantity),
          cost: Number(m.cost),
          priority: String(m.priority || 'medium')
        }))
      };

      // Call the update API
      await procurementService.updatePurchase(purchase.purchase_id, updateData);

      toast.success('Purchase request updated successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating purchase:', error);
      toast.error(error.message || 'Failed to update purchase request');
    } finally {
      setLoading(false);
    }
  };

  if (!purchase) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600" />
            Edit Purchase Request - PR-{purchase.purchase_id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-4">
            {/* Basic Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project_id">Project ID *</Label>
                    <Input
                      id="project_id"
                      value={formData.project_id}
                      onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                      placeholder="Enter project ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="site_location">Site Location *</Label>
                    <Input
                      id="site_location"
                      value={formData.site_location}
                      onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                      placeholder="Enter site location"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="requested_by">Requested By</Label>
                  <Input
                    id="requested_by"
                    value={formData.requested_by}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    title="This field cannot be edited"
                  />
                </div>

                <div>
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Describe the purpose of this purchase request"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Materials Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Materials</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMaterial}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Material
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.materials.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No materials added yet</p>
                      <p className="text-sm">Click "Add Material" to start</p>
                    </div>
                  ) : (
                    formData.materials.map((material, index) => (
                      <div key={material.material_id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            Material #{index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMaterial(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label>Description *</Label>
                            <Input
                              value={material.description}
                              onChange={(e) => handleMaterialChange(index, 'description', e.target.value)}
                              placeholder="Material description"
                            />
                          </div>

                          <div>
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                              min="1"
                            />
                          </div>

                          <div>
                            <Label>Unit</Label>
                            <Input
                              value={material.unit}
                              onChange={(e) => handleMaterialChange(index, 'unit', e.target.value)}
                              placeholder="e.g., pcs, kg, m"
                            />
                          </div>

                          <div>
                            <Label>Unit Cost (AED)</Label>
                            <Input
                              type="number"
                              value={material.cost}
                              onChange={(e) => handleMaterialChange(index, 'cost', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div>
                            <Label>Priority</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={material.priority || 'medium'}
                              onChange={(e) => handleMaterialChange(index, 'priority', e.target.value)}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>

                        <div className="text-right text-sm text-gray-600">
                          Subtotal: <span className="font-semibold">AED {(material.quantity * material.cost).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {formData.materials.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total Amount:</span>
                      <span className="text-2xl font-bold text-red-600">
                        AED {calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Important Note</p>
                  <p className="text-xs text-amber-700 mt-1">
                    After updating, this purchase request will need to be re-sent to the Project Manager for approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>Updating...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Update Purchase Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPurchaseModal;