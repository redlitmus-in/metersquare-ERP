# UI Alternatives Implementation Guide

## Overview
This guide shows how to implement the new UI alternatives (DataTableView, KanbanView, SplitView, BentoGrid) in all role hub pages, replacing or complementing the traditional card-based layouts.

## Available UI Components

### 1. DataTableView
Professional data table with sorting, filtering, pagination, and bulk actions.

### 2. KanbanView
Drag-and-drop workflow board with status columns.

### 3. SplitView
Master-detail layout with resizable panes.

### 4. BentoGrid
Modern variable-size grid for metrics and dashboards.

### 5. ViewToggle
Component to switch between different view types.

## Implementation Steps for Each Hub

### Step 1: Add Imports
```typescript
// Add these imports to any hub file
import DataTableView from '@/components/ui/DataTableView';
import KanbanView from '@/components/ui/KanbanView';
import SplitView from '@/components/ui/SplitView';
import BentoGrid, { BentoGridPresets } from '@/components/ui/BentoGrid';
import ViewToggle, { ViewType } from '@/components/ui/ViewToggle';
```

### Step 2: Add State for View Type
```typescript
// Add view type state
const [viewType, setViewType] = useState<ViewType>('cards');
```

### Step 3: Replace Metrics Cards with BentoGrid
```typescript
// Replace traditional card metrics with BentoGrid
<BentoGrid
  items={[
    {
      id: 'pending',
      title: 'Pending Review',
      value: metrics.pendingCount,
      subtitle: 'Awaiting approval',
      icon: Clock,
      color: 'indigo',
      size: 'medium',
      change: 5,
      changeType: 'increase'
    },
    // ... more metric items
  ]}
  columns={{ mobile: 2, tablet: 3, desktop: 5 }}
  gap="medium"
/>
```

### Step 4: Add View Toggle to Search Bar
```typescript
// Add ViewToggle component next to filters
<ViewToggle
  currentView={viewType}
  onViewChange={setViewType}
  availableViews={['cards', 'table', 'kanban', 'split']}
  variant="buttons"
/>
```

### Step 5: Implement View Rendering Logic
```typescript
// Create render function for different views
const renderPurchaseView = () => {
  switch (viewType) {
    case 'table':
      return (
        <DataTableView
          data={filteredPurchases}
          columns={[
            { key: 'purchase_id', label: 'ID', sortable: true },
            { key: 'title', label: 'Title', sortable: true },
            { key: 'status', label: 'Status', sortable: true },
            // ... more columns
          ]}
          onApprove={handleApprove}
          onReject={handleReject}
          onViewDetails={handleViewDetails}
          selectable={true}
        />
      );

    case 'kanban':
      return (
        <KanbanView
          data={transformToKanbanData(filteredPurchases)}
          onApprove={handleApprove}
          onReject={handleReject}
          onViewDetails={handleViewDetails}
          draggable={true}
        />
      );

    case 'split':
      return (
        <SplitView
          data={transformToSplitData(filteredPurchases)}
          onApprove={handleApprove}
          onReject={handleReject}
          onViewDetails={handleViewDetails}
          resizable={true}
        />
      );

    case 'cards':
    default:
      // Keep existing card implementation
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Existing card components */}
        </div>
      );
  }
};
```

## Role-Specific Implementations

### Technical Director Hub
```typescript
// Enhanced with all views for approval workflow
const TechnicalDirectorHub = () => {
  // Recommended views: Table for bulk operations, Kanban for workflow
  const [viewType, setViewType] = useState<ViewType>('kanban');

  // Use BentoGrid for metrics with role-specific colors
  const metricsConfig = {
    pending: { color: 'indigo', icon: Clock },
    approved: { color: 'green', icon: CheckSquare },
    rejected: { color: 'red', icon: XSquare }
  };
};
```

### Procurement Hub
```typescript
// Focus on data table for vendor management
const ProcurementHub = () => {
  // Recommended: Table view as default for detailed data
  const [viewType, setViewType] = useState<ViewType>('table');

  // Custom columns for procurement data
  const procurementColumns = [
    { key: 'vendor', label: 'Vendor', sortable: true },
    { key: 'quotation', label: 'Quotation', sortable: true },
    { key: 'delivery_date', label: 'Delivery', sortable: true }
  ];
};
```

### Project Manager Hub
```typescript
// Split view for project overview and details
const ProjectManagerHub = () => {
  // Recommended: Split view for master-detail
  const [viewType, setViewType] = useState<ViewType>('split');

  // Custom detail renderer for project info
  const renderProjectDetails = (item) => (
    <ProjectDetailsPanel project={item} />
  );
};
```

### Estimation Hub
```typescript
// Kanban for estimation workflow stages
const EstimationHub = () => {
  // Recommended: Kanban for workflow visualization
  const [viewType, setViewType] = useState<ViewType>('kanban');

  // Custom kanban columns for estimation stages
  const estimationColumns = [
    { id: 'new', title: 'New Requests', color: 'blue' },
    { id: 'estimating', title: 'Estimating', color: 'yellow' },
    { id: 'review', title: 'Under Review', color: 'purple' },
    { id: 'completed', title: 'Completed', color: 'green' }
  ];
};
```

### Accounts Hub
```typescript
// Table view for financial data
const AccountsHub = () => {
  // Recommended: Table for financial records
  const [viewType, setViewType] = useState<ViewType>('table');

  // Financial-specific columns
  const accountColumns = [
    { key: 'invoice_no', label: 'Invoice #', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true,
      render: (val) => `AED ${val.toLocaleString()}` },
    { key: 'payment_status', label: 'Payment', sortable: true }
  ];
};
```

### Site Supervisor Hub
```typescript
// Cards or Kanban for field operations
const SiteSupervisorHub = () => {
  // Recommended: Cards for mobile-friendly view
  const [viewType, setViewType] = useState<ViewType>('cards');

  // Mobile-optimized view options
  const mobileViews: ViewType[] = ['cards', 'list', 'kanban'];
};
```

## Data Transformation Helpers

### Transform for Kanban View
```typescript
const transformToKanbanData = (purchases: Purchase[]) => {
  return purchases.map(p => ({
    id: p.purchase_id,
    title: `PR #${p.purchase_id}`,
    subtitle: p.purpose,
    status: p.status,
    priority: p.priority,
    assignee: p.created_by,
    date: p.date,
    location: p.site_location,
    amount: p.total_amount,
    itemCount: p.materials?.length || 0,
    tags: [p.project_id ? `Project ${p.project_id}` : '']
  }));
};
```

### Transform for Split View
```typescript
const transformToSplitData = (purchases: Purchase[]) => {
  return purchases.map(p => ({
    id: p.purchase_id,
    title: `PR #${p.purchase_id}`,
    subtitle: p.purpose,
    status: p.status,
    priority: p.priority,
    date: p.date,
    amount: p.total_amount,
    location: p.site_location,
    assignee: p.created_by
  }));
};
```

## Responsive Considerations

### Mobile-First Approach
```typescript
// Detect mobile and adjust default view
const isMobile = window.innerWidth < 768;
const [viewType, setViewType] = useState<ViewType>(
  isMobile ? 'cards' : 'table'
);

// Limit available views on mobile
const availableViews = isMobile
  ? ['cards', 'list']
  : ['cards', 'table', 'kanban', 'split'];
```

### Performance Optimization
```typescript
// Use React.memo for expensive renders
const MemoizedDataTable = React.memo(DataTableView);
const MemoizedKanban = React.memo(KanbanView);

// Implement virtual scrolling for large datasets
<DataTableView
  data={largeDataset}
  pageSize={50}  // Paginate for performance
  sticky={true}   // Sticky headers for better UX
/>
```

## Styling Customization

### Theme Integration
```typescript
// Apply role-specific colors
const roleThemes = {
  technicalDirector: { primary: 'indigo', accent: 'purple' },
  procurement: { primary: 'red', accent: 'orange' },
  projectManager: { primary: 'blue', accent: 'teal' },
  estimation: { primary: 'green', accent: 'emerald' },
  accounts: { primary: 'yellow', accent: 'amber' },
  siteSupervisor: { primary: 'orange', accent: 'red' }
};

// Apply to BentoGrid
<BentoGrid
  items={metrics.map(m => ({
    ...m,
    color: roleThemes[role].primary
  }))}
/>
```

## Migration Strategy

### Phase 1: Add Toggle (Non-Breaking)
1. Keep existing card implementation
2. Add ViewToggle component
3. Add new views as options

### Phase 2: Set Defaults
1. Change default view based on role
2. Monitor usage analytics
3. Gather user feedback

### Phase 3: Optimize
1. Remove unused views
2. Customize per role needs
3. Add role-specific features

## Testing Checklist

- [ ] All views render correctly
- [ ] Data transforms properly for each view
- [ ] Actions (approve/reject) work in all views
- [ ] Responsive behavior on mobile/tablet
- [ ] Performance with large datasets (100+ items)
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] View persistence (localStorage)
- [ ] Smooth transitions between views
- [ ] Error states handled gracefully

## Common Issues & Solutions

### Issue: Slow rendering with large datasets
**Solution**: Implement pagination or virtual scrolling
```typescript
<DataTableView
  data={data}
  pageSize={25}  // Limit items per page
/>
```

### Issue: Kanban drag-drop not working
**Solution**: Ensure unique IDs and proper event handlers
```typescript
<KanbanView
  data={data.map(d => ({ ...d, id: d.purchase_id }))}
  onStatusChange={handleStatusChange}
/>
```

### Issue: Split view too narrow on mobile
**Solution**: Use conditional rendering
```typescript
{isMobile ? (
  <DataTableView data={data} />
) : (
  <SplitView data={data} />
)}
```

## Support & Resources

- Example implementation: `/components/examples/ModernHubExample.tsx`
- Component docs: `/components/ui/[component-name].tsx`
- Live demo: Run `npm run dev` and visit `/demo/ui-alternatives`

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Ready for implementation in all role hubs