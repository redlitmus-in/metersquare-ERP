# Role-Based Hub Implementation Guide - Complete

## Overview
This guide documents the standardized process for implementing role-specific hubs in the MeterSquare ERP system. Each role has its own dedicated hub with appropriate functionality and permissions.

## ✅ Completed Implementation: Procurement Hub

### Directory Structure
```
/frontend/src/roles/procurement/
├── pages/
│   └── ProcurementHub.tsx              # Main hub page (577 lines, optimized)
├── components/
│   ├── PurchaseCard.tsx               # Card component with action buttons
│   └── PurchaseDetailsModal.tsx       # Modal for details/history view
├── services/
│   └── procurementService.ts          # API service layer
├── permissions.ts                      # Role-specific permissions
└── index.ts                            # Barrel exports
```

## API Endpoints Used

### 1. Procurement Service API Calls

```typescript
// Get all procurement purchases (email_sent=true)
GET /all_procurement
Response: {
  success: boolean,
  procurement: Purchase[]
}

// Get purchase details by ID
GET /purchase/{id}
Response: {
  success: boolean,
  purchase: Purchase
}

// Get purchase history with approvals
GET /purchase_history/{id}
Response: {
  success: boolean,
  purchase: {
    ...purchaseData,
    approvals: Approval[]
  }
}

// Send approval email to Project Manager
GET /purchase_email/{id}
Response: {
  success: boolean,
  message: string
}

// Approve/Reject purchase request
POST /procurement_approval/{id}
Body: {
  status: 'approved' | 'rejected',
  comments: string
}

// Get procurement dashboard metrics
GET /procurement/dashboard
Response: {
  success: boolean,
  metrics: {
    totalPurchaseValue: number,
    totalRequisitions: number,
    pendingRequisitions: number,
    approvedRequisitions: number,
    rejectedRequisitions: number,
    vendorPerformance: number,
    avgProcessingTime: number,
    costSavings: number
  }
}

// Get vendor quotations
GET /vendor_quotations
Response: {
  success: boolean,
  quotations: VendorQuotation[]
}

// Create vendor quotation
POST /vendor_quotation
Body: VendorQuotationData

// Update purchase
PUT /purchase/{id}
Body: PurchaseData

// Delete purchase (if allowed)
DELETE /purchase/{id}
```

## Component Implementation Details

### 1. ProcurementHub.tsx
**Key Features:**
- 2-column card layout for purchase requests
- 3 tabs: Pending, Approved, Rejected (removed All and Under Review)
- Real-time metrics dashboard
- Search and filter functionality
- Export to JSON capability
- Confirmation dialogs for actions

**State Management:**
```typescript
const [activeTab, setActiveTab] = useState('pending'); // Default to pending
const [purchases, setPurchases] = useState<Purchase[]>([]);
const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
const [metrics, setMetrics] = useState<MetricCard[]>([]);
const [loading, setLoading] = useState(true);
const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
const [modalMode, setModalMode] = useState<'details' | 'history'>('details');
```

### 2. PurchaseCard Component
**Features:**
- Displays purchase summary information
- Action buttons:
  - View Details (always visible)
  - View History (always visible)
  - Edit (conditional based on status)
  - Approve/Reject (for pending items)
  - Send to PM (for procurement approval)
- Status badges with color coding
- Material summary preview

**Props Interface:**
```typescript
interface PurchaseCardProps {
  purchase: Purchase;
  onViewDetails?: (purchaseId: number) => void;
  onViewHistory?: (purchaseId: number) => void;
  onEdit?: (purchaseId: number) => void;
  onSendEmail?: (purchaseId: number) => void;
  onApprove?: (purchaseId: number) => void;
  onReject?: (purchaseId: number) => void;
  isLoading?: boolean;
  emailSent?: boolean;
}
```

### 3. PurchaseDetailsModal Component
**Features:**
- Dual mode: 'details' or 'history'
- Details mode shows: Details tab, Materials tab
- History mode shows: Only History tab with approval timeline
- Scrollable content (max-height: 90vh)
- Export functionality
- Role name mapping from API response

**API Response Handling:**
```typescript
// Details Mode - uses /purchase/{id}
const purchaseData = await procurementService.getPurchaseDetails(purchaseId);

// History Mode - uses /purchase_history/{id}
const { purchase: purchaseData } = await procurementService.getPurchaseHistory(purchaseId);
```

### 4. ProcurementService
**Service Methods:**
```typescript
class ProcurementService {
  async getPurchases(): Promise<Purchase[]>
  async getPurchaseDetails(purchaseId: number): Promise<Purchase>
  async getPurchaseHistory(purchaseId: number): Promise<{purchase: Purchase, statuses: any[]}>
  async createPurchase(purchaseData: any): Promise<any>
  async updatePurchase(purchaseId: number, purchaseData: any): Promise<any>
  async deletePurchase(purchaseId: number): Promise<any>
  async sendApprovalEmail(purchaseId: number): Promise<any>
  async approvePurchase(purchaseId: number, approvalData?: any): Promise<any>
  async rejectPurchase(purchaseId: number, reason: string): Promise<any>
  async getDashboardMetrics(): Promise<any>
  async getVendorQuotations(): Promise<any[]>
  async createVendorQuotation(quotationData: any): Promise<any>
}
```

## Permissions Configuration

```typescript
export const procurementPermissions: RolePermissions = {
  purchaseRequests: {
    create: false,        // Cannot create - receives from Site/MEP Supervisors
    view: true,          // Can view all requests
    edit: true,          // Can edit for cost revisions
    delete: false,       // Cannot delete (removed from UI)
    sendEmail: true,     // Can send emails to stakeholders
    approve: false,      // Cannot approve (PM/TD role)
    handleCostRevision: true  // Main responsibility
  },
  vendorQuotations: {
    create: true,        // Can create vendor quotations
    view: true,
    edit: true,
    delete: true,
    compare: true,
    negotiate: true
  },
  approvals: {
    canApprove: false,
    canReject: false,
    canEscalate: true
  },
  workflow: {
    canSendToProjectManager: true,
    canHandleCostFlag: true,
    canRequestRevision: true
  }
};
```

## UI/UX Standards

### Color Themes
- **Procurement**: Red theme (`red-50` to `red-700`)
- **Status Colors**:
  - Pending: Yellow (`bg-yellow-100`)
  - Approved: Green (`bg-green-100`)
  - Rejected: Red (`bg-red-100`)
  - In Progress: Blue (`bg-blue-100`)

### Layout Standards
- **Card Grid**: 2 columns (`lg:grid-cols-2`)
- **Tab Layout**: 3 tabs for filtering
- **Modal Size**: `max-w-4xl`, `h-[90vh]`
- **Scrollable Areas**: Using `overflow-y-auto`

## Error Handling

### API Error Responses
```typescript
// Handle 403 Forbidden
if (error.response?.status === 403) {
  throw new Error('You do not have permission to view this purchase request');
}

// Handle 404 Not Found
if (error.response?.status === 404) {
  throw new Error('Purchase request not found');
}

// Handle Network Errors
if (!error.response) {
  throw new Error('Unable to connect to server. Please check if the backend is running.');
}
```

## Data Flow

1. **Page Load**:
   - `fetchPurchases()` calls `/all_procurement`
   - `getDashboardMetrics()` calls `/procurement/dashboard`
   - Data populates cards and metrics

2. **View Details**:
   - Click "View Details" → calls `/purchase/{id}`
   - Opens modal in 'details' mode
   - Shows Details and Materials tabs

3. **View History**:
   - Click "View History" → calls `/purchase_history/{id}`
   - Opens modal in 'history' mode
   - Shows only History tab with approval timeline

4. **Actions**:
   - Approve/Reject → `/procurement_approval/{id}`
   - Send to PM → `/purchase_email/{id}`
   - Edit → Loads form with existing data

## Best Practices Followed

1. **Separation of Concerns**:
   - Service layer for API calls
   - Components for UI
   - Permissions for access control

2. **Error Handling**:
   - Try-catch blocks in all async operations
   - User-friendly error messages
   - Fallback values for failed API calls

3. **Performance**:
   - Parallel API calls with `Promise.all`
   - Debounced search input
   - Memoized calculations

4. **TypeScript**:
   - Proper interfaces for all data types
   - Type safety throughout
   - No implicit 'any' types

5. **Accessibility**:
   - Proper button labels and titles
   - Color contrast compliance
   - Keyboard navigation support

## Testing Checklist

- [x] Component renders without errors
- [x] API calls handle errors gracefully
- [x] Modal opens/closes properly
- [x] Tabs switch correctly
- [x] Scrolling works in all areas
- [x] Action buttons work as expected
- [x] Search/filter functionality works
- [x] Export functionality works
- [x] Role names display correctly
- [x] Status badges show correct colors

## ✅ Completed Implementation: Project Manager Hub

### Directory Structure
```
/frontend/src/roles/project-manager/
├── pages/
│   ├── ProjectManagerHub.tsx          # Main hub page
│   └── PurchaseApprovalsPage.tsx      # Detailed approvals page
├── components/
│   ├── PurchaseApprovalCard.tsx       # Card component with action buttons
│   ├── PurchaseDetailsModal.tsx       # Unified modal for details/history
│   ├── ApprovalModal.tsx              # Approval/rejection modal
│   └── PMMetricsCards.tsx             # Metrics display component
├── services/
│   └── projectManagerService.ts       # API service layer
├── permissions.ts                      # Role-specific permissions
└── index.ts                           # Barrel exports
```

### API Endpoints Used

```typescript
// Get all procurement approved purchases for PM review
GET /projectmanger_purchases
Response: {
  success: boolean,
  total_approved_procurement_purchases: number,
  non_approval_project_manager_purchases: number,
  approved_procurement_purchases: ProcurementPurchase[],
  summary: {
    workflow_status_counts: {...},
    financial_summary: {...}
  }
}

// Get purchase details by ID
GET /purchase/{id}
Response: {
  success: boolean,
  purchase: Purchase
}

// Get purchase history with approvals
GET /purchase_history/{id}
Response: {
  success: boolean,
  purchase: {
    ...purchaseData,
    approvals: Approval[]
  }
}

// PM Approval/Rejection
POST /pm_approval
Body: {
  purchase_id: number,
  purchase_status: 'approved' | 'reject',
  rejection_reason?: string,
  comments?: string
}

// Get PM Dashboard
GET /project_manager_dashboard
Response: {
  success: boolean,
  dashboard_data: PMDashboardData
}
```

### Key Implementation Differences from Procurement

1. **Removed `/purchase_status` endpoint** - Uses standard `/purchase/{id}` and `/purchase_history/{id}` instead
2. **Modal Behavior**:
   - Details mode: Shows only Details and Materials tabs (no History tab)
   - History mode: Shows only History tab
3. **Data Transformation**: Transforms purchase data to `PurchaseStatusDetails` structure for component compatibility
4. **Permissions**: Added Project Manager to allowed roles for `/purchase_history/{id}` endpoint

### Component Features

1. **PurchaseDetailsModal**:
   - Unified modal with conditional tab display
   - Proper null checking for all data fields
   - Fallback data fetching mechanism
   - Clean separation between details and history modes

2. **PurchaseApprovalCard**:
   - Modal-based navigation (no routing)
   - Approval/Rejection dialogs
   - Status badges and icons
   - Material summary display

3. **ProjectManagerHub**:
   - Tab-based filtering (Pending/Approved/Rejected)
   - Real-time metrics display
   - Export functionality
   - Search and refresh capabilities

### Service Layer Implementation

```typescript
class ProjectManagerService {
  // Get purchase details using /purchase/{id}
  async getPurchaseDetails(purchaseId: number): Promise<any>
  
  // Get purchase history using /purchase_history/{id}
  async getPurchaseHistory(purchaseId: number): Promise<{purchase: any, statuses: any[]}>
  
  // Approve purchase
  async approvePurchase(purchaseId: number, comments?: string): Promise<any>
  
  // Reject purchase
  async rejectPurchase(purchaseId: number, rejectionReason: string, comments?: string): Promise<any>
  
  // Get PM dashboard data
  async getPMDashboardData(): Promise<PMDashboardData>
}
```

### Error Handling

- Proper 403 permission handling
- Fallback to `/purchase/{id}` if primary endpoints fail
- User-friendly error messages via toast notifications
- Comprehensive try-catch blocks with error logging

## Migration Notes for Other Roles

To implement similar hubs for other roles:

1. **Copy the structure** from `/roles/procurement/`
2. **Update the service** with role-specific endpoints
3. **Modify permissions** based on role requirements
4. **Adjust the UI theme** colors per role
5. **Update action buttons** based on role capabilities
6. **Test with role-specific user accounts**

## Common Issues and Solutions

1. **403 Forbidden Error**:
   - Solution: Use `/purchase_history/{id}` instead of `/purchase/{id}` for roles without direct access

2. **Undefined Metrics**:
   - Solution: Provide fallback calculations from purchase data

3. **Scrolling Issues**:
   - Solution: Use `flex-1 overflow-hidden` parent with `overflow-y-auto` child

4. **TypeScript Errors**:
   - Solution: Add proper type annotations and null checks

---

**Last Updated**: December 2024
**Version**: 3.0
**Status**: Procurement Hub and Project Manager Hub Complete and Production Ready