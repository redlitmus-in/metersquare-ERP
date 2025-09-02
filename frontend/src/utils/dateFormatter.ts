/**
 * Date formatting utilities for DD/MM/YYYY format
 */

/**
 * Format date to DD/MM/YYYY string
 * @param date - Date object or string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date for HTML date input (YYYY-MM-DD)
 * @param date - Date object or string in DD/MM/YYYY format
 * @returns Formatted date string in YYYY-MM-DD format for HTML input
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Check if date is in DD/MM/YYYY format
    if (date.includes('/')) {
      const [day, month, year] = date.split('/');
      dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parse date from DD/MM/YYYY format
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid
 */
export const parseDateFromDDMMYYYY = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  
  // Validate the date
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
};

/**
 * Get today's date in DD/MM/YYYY format
 * @returns Today's date formatted as DD/MM/YYYY
 */
export const getTodayFormatted = (): string => {
  return formatDate(new Date());
};

/**
 * Format date with time in DD/MM/YYYY HH:MM format
 * @param date - Date object or string
 * @returns Formatted date-time string
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const dateStr = formatDate(dateObj);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}`;
};