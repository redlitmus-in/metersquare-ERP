# MeterSquare ERP - Phase 1: Costing, Estimation & Procurement

## 📋 Project Overview

**MeterSquare ERP** is a comprehensive Enterprise Resource Planning system designed specifically for construction and manufacturing industries. This documentation covers Phase 1 implementation focusing on Costing, Estimation, and Procurement operational workflows.

### 🎯 Project Scope
- **Industry Focus**: Construction, Manufacturing, Joinery & Furniture
- **Phase 1**: Costing, Estimation & Procurement Workflows
- **Architecture**: React + TypeScript Frontend with Modern UI Components
- **Workflow Engine**: State-based approval systems with role-based access

## 🏗️ System Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui Components
- **Animation**: Framer Motion
- **Forms**: React Hook Form
- **Charts**: Recharts (Interactive data visualization)
- **Icons**: Lucide React
- **State Management**: React Hooks + Context

### Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── forms/                     # Document forms
│   │   │   ├── PurchaseRequisitionForm.tsx
│   │   │   ├── VendorQuotationForm.tsx
│   │   │   ├── VendorScopeOfWorkForm.tsx    # BOQ referenced
│   │   │   ├── MaterialRequisitionForm.tsx
│   │   │   └── MaterialDeliveryNote.tsx
│   │   ├── layout/                    # Navigation & layout
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ModernSidebar.tsx
│   │   │   └── ModernHeader.tsx
│   │   ├── ui/                        # Reusable UI components
│   │   └── workflow/                  # Workflow components
│   │       └── ApprovalWorkflow.tsx
│   ├── pages/                         # Main application pages
│   │   ├── procurement/               # Procurement module
│   │   │   ├── PurchaseRequestsPage.tsx
│   │   │   ├── VendorQuotationsPage.tsx
│   │   │   ├── ApprovalsPage.tsx
│   │   │   └── DeliveriesPage.tsx
│   │   ├── workflows/                 # Workflow-specific pages
│   │   │   ├── MaterialDispatchProductionPage.tsx
│   │   │   └── MaterialDispatchSitePage.tsx
│   │   ├── AnalyticsPage.tsx          # Interactive analytics
│   │   ├── TasksPage.tsx              # Task management with New Task form
│   │   ├── ProjectsPage.tsx           # Project management with New Project form
│   │   ├── ProcessFlowPage.tsx        # Workflow visualization
│   │   ├── ProfilePage.tsx            # User profile management
│   │   ├── LoginPage.tsx              # Authentication
│   │   ├── ModernDashboard.tsx        # Main dashboard
│   │   └── ProcurementDashboard.tsx   # Procurement overview
│   └── store/                         # State management
```

## 🔄 Implemented Workflows

### 1. Material Purchases - Project Bound
**Actors**: Site/MEP Supervisor → Procurement → Project Manager → Estimation → Technical Director → Accounts → Design

**Key Features**:
- Purchase Requisition Form with multi-level approvals
- QTY/SPEC FLAG and COST FLAG gating
- Rejection loops with mandatory revisions
- Payment transaction workflow
- Design reference inputs tracking

**Document**: `PurchaseRequisitionForm.tsx`
**Workflow Page**: Integrated in Procurement module

### 2. Subcontractor/Vendor - Project Bound
**Actors**: Procurement → Project Manager → Estimation → Technical Director → Accounts → Design

**Key Features**:
- Vendor Scope of Work Form with BOQ reference
- Sub-Contractor Quotation management
- QTY/SCOPE FLAG approval gates
- Vendor verification and cost analysis
- Design integration workflow

**Document**: `VendorScopeOfWorkForm.tsx`
**Workflow Page**: Vendor Quotations module

### 3. Material Dispatch - Production - Project Bound
**Actors**: Factory Supervisor → Procurement/Store → Project Manager → Estimation → Technical Director → Design

**Key Features**:
- Material Requisition Form for factory operations
- Bulk Qty request and approval workflow
- Joinery & Furniture production tracking
- Factory section management
- Production stage monitoring

**Document**: `MaterialRequisitionForm.tsx`
**Workflow Page**: `MaterialDispatchProductionPage.tsx`

### 4. Material Dispatch - Site Works - Project Bound
**Actors**: Site/MEP/Factory Supervisor → Procurement → Project Manager → Technical Director → Design

**Key Features**:
- Material Delivery Note workflow
- QTY/SPEC/REQ FLAG implementation
- Bulk qty dispatch approvals
- Site delivery execution tracking
- Multi-supervisor support (Site, MEP, Factory)

**Document**: `MaterialDeliveryNote.tsx`
**Workflow Page**: `MaterialDispatchSitePage.tsx`

## 🚩 Approval Flag System

The frontend forms are designed to support all required workflow flags as specified in the PDF requirements:

- **PM FLAG**: Project Manager approval gate
- **COST FLAG**: Cost approval gate  
- **QTY/SPEC FLAG**: Quantity & Specification approval
- **QTY/SCOPE FLAG**: Quantity & Scope approval
- **QTY/SPEC/REQ FLAG**: Quantity, Specification & Requirements approval
- **FLAG**: Generic approval flag
- **Compliance Verification**: Quality and compliance checks

### Flag Implementation (Frontend Ready)
```typescript
interface ApprovalStep {
  flags?: {
    pmFlag?: boolean;
    costFlag?: boolean;
    qtySpecFlag?: boolean;
    qtyScopeFlag?: boolean;
    qtySpecReqFlag?: boolean;
    flag?: boolean;
    compliance?: boolean;
  };
}
```

**Note**: Frontend forms are complete and ready. Backend workflow engine implementation needed for full approval flow functionality.

## 👥 Role-Based Access

### Global Roles Implemented
- **Estimation**
- **Procurement**
- **Project Manager**
- **Technical Director**
- **Accounts**
- **Design**
- **Site Supervisor**
- **MEP Supervisor**
- **Factory Supervisor**
- **Store In Charge**

### Role-Based UI Features
- Dynamic navigation based on user role
- Role-specific approval workflows
- Conditional form fields and actions
- Department-based access controls

## 📊 Analytics & Reporting

### Interactive Dashboard Features
- **Real-time metrics**: Procurement spending, project status, vendor performance
- **Interactive charts**: LineChart, PieChart, BarChart, AreaChart using Recharts
- **Multi-tab analytics**: Overview, Procurement, Projects, Reports
- **Export capabilities**: PDF, Excel, CSV formats
- **Time-based filtering**: Daily, weekly, monthly, quarterly views

### Key Metrics Tracked
- Total procurement value and trends
- Active projects and completion rates
- Vendor partner performance
- Cost savings and budget variance
- Approval workflow bottlenecks
- Production efficiency metrics

## 🎨 UI/UX Design System

> **📖 Complete Theme Documentation**: See [`/docs/theme-system.md`](./docs/theme-system.md) for comprehensive theme system details.

### Theme Architecture
The application implements a **multi-layered theme system** combining:
- **Tailwind CSS** - Main utility-first framework
- **Shadcn/ui** - Modern component library with semantic theming  
- **Corporate Theme** - Custom business-focused design system
- **Framer Motion** - Animation and interaction library

### Color Themes by Module
- **Procurement**: Red theme (`red-50` to `red-700`)
- **Production**: Blue theme (`blue-50` to `blue-700`)  
- **Site Operations**: Orange theme (`orange-50` to `orange-700`)
- **Vendor Management**: Purple theme (`purple-50` to `purple-700`)
- **Delivery**: Green theme (`green-50` to `green-700`)

### Corporate Brand Colors
```css
:root {
  --corporate-blue: #1e40af;
  --corporate-dark: #111827;
  --corporate-light: #f9fafb;
  --corporate-accent: #3730a3;
}
```

### Component Standards
- **Consistent spacing**: 4px, 8px, 16px, 24px grid system
- **Typography**: Inter font family with defined scale
- **Border radius**: 8px for cards, 4px for inputs
- **Shadows**: Layered elevation system (`soft`, `medium`, `large`)
- **Animations**: Smooth transitions using Framer Motion
- **Glass Effects**: Backdrop blur with transparency layers
- **Responsive Design**: Mobile-first with adaptive layouts
- **Dark Mode**: Full support via CSS custom properties

## 🔧 Development Commands

### Frontend Development
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start development server
npm run build           # Build for production
npm run lint            # Run ESLint
npm run typecheck       # TypeScript type checking
```

### Key Dependencies
```json
{
  "react": "^18.2.0",
  "typescript": "^5.2.2",
  "tailwindcss": "^3.3.5",
  "framer-motion": "^10.18.0",
  "react-hook-form": "^7.62.0",
  "recharts": "^2.15.4",
  "lucide-react": "^0.294.0",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@supabase/supabase-js": "^2.38.4",
  "zustand": "^4.4.7",
  "react-router-dom": "^6.20.0"
}
```

## 📝 Document Entities

### Core Documents Implemented
1. **Purchase Requisition Form** - Multi-level approval with cost/spec gates
2. **Vendor Quotation Form** - Vendor evaluation and comparison
3. **Vendor Scope of Work Form** - BOQ referenced project scoping
4. **Material Requisition Form** - Factory production material requests
5. **Material Delivery Note** - Site delivery and quality inspection

### Document Features
- **Multi-tab interfaces** for complex data entry
- **Real-time calculations** and validations
- **File upload support** for attachments
- **Approval workflow integration**
- **Print/export capabilities**
- **Revision tracking and history**

## 🔐 Security & Compliance

### Security Features
- **Role-based access control** (RBAC)
- **Form validation** and sanitization
- **Audit trail** for all workflow actions
- **Secure file handling** for uploads
- **Session management** and authentication

### Compliance Standards
- **Construction industry** best practices
- **ISO quality standards** integration
- **Safety requirement** tracking
- **Financial approval** controls
- **Document retention** policies

## 📈 Performance Optimizations

### Frontend Optimizations
- **Code splitting** with React.lazy()
- **Memoization** for expensive calculations
- **Virtual scrolling** for large data sets
- **Image optimization** and lazy loading
- **Bundle analysis** and optimization

### Data Management
- **Efficient state updates** with React hooks
- **Form optimization** with React Hook Form
- **Chart performance** with Recharts optimization
- **Search and filtering** with debounced inputs

## 🐛 Testing Strategy

### Testing Approaches
- **Component testing** with React Testing Library
- **Form validation** testing
- **Workflow integration** testing
- **Accessibility** testing with axe-core
- **Cross-browser** compatibility testing

### Quality Assurance
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for consistent formatting
- **Husky** for pre-commit hooks

## 🚀 Deployment

### Build Process
```bash
npm run build           # Production build
npm run preview         # Preview production build
```

### Environment Configuration
- **Development**: Local development server
- **Staging**: Pre-production testing
- **Production**: Live deployment

### Performance Metrics
- **Lighthouse score**: 90+ across all metrics
- **Bundle size**: Optimized chunks < 500KB
- **Loading time**: < 3 seconds initial load
- **Accessibility**: WCAG 2.1 AA compliance

## 📞 Support & Maintenance

### Development Team Contacts
- **Frontend Development**: React/TypeScript specialists
- **UI/UX Design**: Modern interface design
- **Workflow Engineering**: Business process automation
- **Quality Assurance**: Testing and validation

### Maintenance Schedule
- **Daily**: Monitoring and basic updates
- **Weekly**: Feature additions and bug fixes  
- **Monthly**: Performance optimization
- **Quarterly**: Major feature releases

## 📚 Additional Resources

### Documentation Links
- **React Documentation**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Shadcn/ui**: https://ui.shadcn.com/
- **Framer Motion**: https://www.framer.com/motion/
- **Recharts**: https://recharts.org/

### Training Materials
- **User manuals** for each workflow
- **Admin guides** for system configuration
- **Developer documentation** for customization
- **Video tutorials** for common tasks

---

## 🎯 Future Roadmap

### Phase 2 Planning
- **Inventory Management** integration
- **Financial Accounting** modules
- **Project Management** tools
- **Mobile application** development
- **API development** for integrations

### Scalability Considerations
- **Microservices** architecture preparation
- **Database optimization** strategies
- **Cloud deployment** readiness
- **Multi-tenant** support planning

---

**Last Updated**: August 26, 2024  
**Version**: 1.0.1  
**Status**: Phase 1 Frontend Complete - Clean & Optimized

## ✅ Recent Updates (v1.0.1)
- ✅ Fixed dropdown text visibility issues
- ✅ Implemented working New Project and New Task forms with modal dialogs
- ✅ Cleaned up duplicate/unused components (old Sidebar.tsx, Header.tsx, DashboardPage.tsx)
- ✅ Removed unused dependencies (@visx/visx, react-query, yup) 
- ✅ Removed UsersPage (not in Phase 1 requirements)
- ✅ Updated project structure to reflect current implementation

*This documentation serves as the comprehensive guide for MeterSquare ERP Phase 1 implementation. For technical support or feature requests, please refer to the project repository issues section.*

## 🔒 Development Rules & Standards

### Currency Configuration
- **DEFAULT CURRENCY**: AED (United Arab Emirates Dirham)
- **ALWAYS use AED** as the currency symbol in all displays
- Format: `AED {amount.toLocaleString()}` for proper number formatting
- DO NOT use INR (₹) or any other currency symbols

### API Configuration
- **NEVER hardcode API URLs** in frontend code (no localhost, IP addresses, or direct URLs)
- **ALWAYS use `VITE_API_BASE_URL`** environment variable for API endpoints
- All API calls must go through `apiClient` from `src/api/config.ts`
- Environment configuration is managed in `src/utils/environment.ts`

### Documentation & Database
- Always use `/docs` folder for reference documents  
- All database details are in `/database` folder