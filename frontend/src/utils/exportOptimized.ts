// Optimized export utilities with lazy loading
import { measurePerformance } from './performance';

interface ExportOptions {
  filename?: string;
  format?: 'pdf' | 'excel' | 'csv';
  data?: any;
  columns?: any[];
  title?: string;
}

// PDF Export with lazy loading
export const exportToPDF = async (options: ExportOptions) => {
  return measurePerformance('PDF Export', async () => {
    // Show loading indicator
    const loadingToast = showLoadingToast('Preparing PDF export...');

    try {
      // Lazy load jsPDF only when needed
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();
      const { filename = 'export.pdf', data, columns, title } = options;

      // Add title if provided
      if (title) {
        doc.setFontSize(16);
        doc.text(title, 14, 15);
      }

      // Add table if data provided
      if (data && columns) {
        (doc as any).autoTable({
          head: [columns],
          body: data,
          startY: title ? 25 : 15,
        });
      }

      // Save the PDF
      doc.save(filename);
      hideLoadingToast(loadingToast);
      showSuccessToast('PDF exported successfully');
    } catch (error) {
      hideLoadingToast(loadingToast);
      showErrorToast('Failed to export PDF');
      console.error('PDF Export Error:', error);
    }
  });
};

// Excel Export with lazy loading
export const exportToExcel = async (options: ExportOptions) => {
  return measurePerformance('Excel Export', async () => {
    const loadingToast = showLoadingToast('Preparing Excel export...');

    try {
      // Lazy load XLSX only when needed
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      const { filename = 'export.xlsx', data, title } = options;

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, title || 'Sheet1');

      // Generate buffer
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Save file
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      saveAs(blob, filename);

      hideLoadingToast(loadingToast);
      showSuccessToast('Excel exported successfully');
    } catch (error) {
      hideLoadingToast(loadingToast);
      showErrorToast('Failed to export Excel');
      console.error('Excel Export Error:', error);
    }
  });
};

// CSV Export (no heavy dependencies needed)
export const exportToCSV = (options: ExportOptions) => {
  const { filename = 'export.csv', data } = options;

  if (!data || data.length === 0) {
    showErrorToast('No data to export');
    return;
  }

  // Convert data to CSV
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row: any) =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  showSuccessToast('CSV exported successfully');
};

// Screenshot export with lazy loading
export const exportScreenshot = async (elementId: string, filename = 'screenshot.png') => {
  return measurePerformance('Screenshot Export', async () => {
    const loadingToast = showLoadingToast('Capturing screenshot...');

    try {
      // Lazy load html2canvas only when needed
      const html2canvas = (await import('html2canvas')).default;

      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      const canvas = await html2canvas(element);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          link.click();
        }
      });

      hideLoadingToast(loadingToast);
      showSuccessToast('Screenshot captured successfully');
    } catch (error) {
      hideLoadingToast(loadingToast);
      showErrorToast('Failed to capture screenshot');
      console.error('Screenshot Export Error:', error);
    }
  });
};

// Toast notification helpers (integrate with your notification system)
let toastId = 0;

const showLoadingToast = (message: string) => {
  // Replace with your toast implementation
  console.log(`Loading: ${message}`);
  return ++toastId;
};

const hideLoadingToast = (id: number) => {
  // Replace with your toast implementation
  console.log(`Hide loading toast: ${id}`);
};

const showSuccessToast = (message: string) => {
  // Replace with your toast implementation
  console.log(`Success: ${message}`);
};

const showErrorToast = (message: string) => {
  // Replace with your toast implementation
  console.error(`Error: ${message}`);
};