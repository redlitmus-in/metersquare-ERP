/**
 * Lazy import utilities for heavy libraries
 * These functions ensure libraries are only loaded when needed
 */

// Lazy load PDF generation libraries
export const loadPDFLibraries = async () => {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  // Apply autoTable plugin to jsPDF
  const autoTable = autoTableModule.default;

  return { jsPDF, autoTable };
};

// Lazy load Excel library
export const loadExcelLibrary = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// Lazy load chart libraries
export const loadChartLibraries = async () => {
  const recharts = await import('recharts');
  return recharts;
};

// Preload critical chunks for better performance
export const preloadCriticalChunks = () => {
  // Preload router chunk
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('react-router-dom');
    });
  }

  // Preload UI core components after initial render
  setTimeout(() => {
    import('@radix-ui/react-dialog');
    import('@radix-ui/react-select');
    import('@radix-ui/react-tabs');
  }, 1000);
};

// Prefetch role-specific dashboards based on user role
export const prefetchRoleDashboard = (role: string) => {
  const roleLower = role.toLowerCase();

  // Prefetch the appropriate dashboard based on role
  switch (roleLower) {
    case 'procurement':
      import('@/roles/procurement/pages/ProcurementHub');
      break;
    case 'project manager':
    case 'projectmanager':
      import('@/roles/project-manager/pages/ProjectManagerHub');
      break;
    case 'estimation':
      import('@/roles/estimation/pages/EstimationHub');
      break;
    case 'technical director':
    case 'technicaldirector':
      import('@/roles/technical-director/pages/TechnicalDirectorHub');
      break;
    case 'site supervisor':
    case 'sitesupervisor':
      import('@/roles/site-supervisor/pages/SiteSupervisorHub');
      break;
    case 'accounts':
      import('@/roles/accounts/pages/AccountsHub');
      break;
  }
};