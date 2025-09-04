# Role-Based Architecture

## Structure

```
roles/
├── [role-name]/
│   ├── permissions.ts    # Role-specific permissions
│   ├── components/        # Role-specific components (if needed)
│   └── index.ts          # Role exports
│
├── shared/
│   ├── hooks/            # Shared hooks like useRolePermissions
│   ├── components/       # Shared components across roles
│   └── utils/           # Utility functions
│
└── index.ts             # Central role management
```

## Key Principles

1. **Dashboards stay in `pages/dashboards/`** - We don't duplicate dashboards here
2. **Permissions are centralized here** - Each role has its permission file
3. **Role-specific components only** - Only create components unique to a role
4. **Import, don't duplicate** - Import existing dashboards and enhance with permissions

## Usage

```typescript
// In any component
import { useRolePermissions } from '@/roles/shared/hooks/useRolePermissions';

const MyComponent = () => {
  const { permissions, canCreatePurchaseRequest } = useRolePermissions();
  
  return (
    <>
      {canCreatePurchaseRequest() && (
        <Button>New Purchase Request</Button>
      )}
    </>
  );
};
```

## Dashboard Mapping

- Dashboards remain in: `src/pages/dashboards/`
- Role permissions in: `src/roles/[role]/permissions.ts`
- The dashboards import and use permissions from roles folder