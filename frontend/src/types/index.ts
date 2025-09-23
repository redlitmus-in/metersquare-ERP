/**
 * Centralized TypeScript type definitions
 */

// User and Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  permissions?: Permission[];
  created_at?: string;
  updated_at?: string;
}

export type UserRole =
  | 'estimation'
  | 'procurement'
  | 'project-manager'
  | 'technical-director'
  | 'accounts'
  | 'design'
  | 'site-supervisor'
  | 'mep-supervisor'
  | 'factory-supervisor'
  | 'admin';

export interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
}

// Notification Types
export interface NotificationMetadata {
  project?: string;
  projectId?: string;
  amount?: number;
  sender?: string;
  documentId?: string;
  documentType?: string;
  workflowStage?: string;
  dueDate?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category?: NotificationCategory;
  timestamp: Date;
  read: boolean;
  actionRequired?: boolean;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: NotificationMetadata;
}

export type NotificationType =
  | 'email'
  | 'approval'
  | 'alert'
  | 'success'
  | 'error'
  | 'info'
  | 'update'
  | 'reminder';

export type NotificationPriority = 'urgent' | 'high' | 'medium' | 'low';

export type NotificationCategory =
  | 'workflow'
  | 'project'
  | 'procurement'
  | 'system'
  | 'user';

// Workflow Types
export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  role: UserRole;
  status: WorkflowStatus;
  completedAt?: Date;
  completedBy?: string;
  comments?: string;
  flags?: WorkflowFlags;
}

export interface WorkflowFlags {
  pmFlag?: boolean;
  costFlag?: boolean;
  qtySpecFlag?: boolean;
  qtyScopeFlag?: boolean;
  qtySpecReqFlag?: boolean;
  flag?: boolean;
  compliance?: boolean;
}

export type WorkflowStatus = 'pending' | 'in-progress' | 'approved' | 'rejected' | 'completed';

// Document Types
export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  description?: string;
  projectId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: DocumentStatus;
  revision: number;
  attachments?: Attachment[];
  metadata?: DocumentMetadata;
}

export type DocumentType =
  | 'purchase-requisition'
  | 'vendor-quotation'
  | 'vendor-scope'
  | 'material-requisition'
  | 'material-delivery';

export type DocumentStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'closed';

export interface DocumentMetadata {
  totalAmount?: number;
  currency?: string;
  vendorId?: string;
  items?: DocumentItem[];
  [key: string]: unknown;
}

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
  url?: string;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  budget: number;
  currency: string;
  managerId: string;
  teamMembers: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: ProjectMetadata;
}

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface ProjectMetadata {
  client?: string;
  location?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  [key: string]: unknown;
}

// Task Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  projectId?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  attachments?: Attachment[];
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';

// Vendor Types
export interface Vendor {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  category: VendorCategory;
  status: VendorStatus;
  rating?: number;
  registrationDate: Date;
  documents?: VendorDocument[];
  contacts?: VendorContact[];
}

export type VendorCategory = 'material-supplier' | 'sub-contractor' | 'service-provider' | 'equipment-rental';
export type VendorStatus = 'active' | 'inactive' | 'blacklisted' | 'pending-approval';

export interface VendorDocument {
  id: string;
  type: string;
  name: string;
  expiryDate?: Date;
  verified: boolean;
}

export interface VendorContact {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export interface ResponseMetadata {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: FieldValidation;
  defaultValue?: unknown;
}

export type FormFieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'checkbox' | 'file';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FieldValidation {
  pattern?: RegExp;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  custom?: (value: unknown) => string | undefined;
}

// Analytics Types
export interface AnalyticsData {
  date: Date;
  metric: string;
  value: number;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

// Service Worker Types
export interface ServiceWorkerMessage {
  type: string;
  data?: unknown;
  timestamp: Date;
}

export interface ServiceWorkerConfig {
  version: string;
  integrity?: string;
  updateInterval?: number;
  scope?: string;
}