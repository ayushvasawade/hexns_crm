export type PriceTier = 'MIN' | 'DEFAULT' | 'MAX' | 'CUSTOM';

export type QuotationStatus = 
  | 'Draft' 
  | 'Sent' 
  | 'Viewed' 
  | 'Accepted' 
  | 'Rejected' 
  | 'Expired' 
  | 'Converted';

export type InvoiceStatus = 
  | 'Draft' 
  | 'Sent' 
  | 'Partially Paid' 
  | 'Paid' 
  | 'Overdue' 
  | 'Cancelled';

export type PaymentMode = 
  | 'NEFT / RTGS / IMPS' 
  | 'UPI' 
  | 'Cheque' 
  | 'Cash';

export type RetainerFrequency = 
  | 'Monthly' 
  | 'Quarterly' 
  | 'Semi-Annual' 
  | 'Custom';

export type ExpenseCategory = 
  | 'AI subscriptions and API usage'
  | 'Software subscriptions'
  | 'Hosting and infrastructure'
  | 'Employee salaries'
  | 'Employee reimbursements'
  | 'Employer-side contributions (PF, ESIC, Insurance)'
  | 'Contractor and freelancer payments'
  | 'Shoot expenses and equipment rentals'
  | 'Office rent and utilities'
  | 'Electricity & Utilities'
  | 'Internet & Communications'
  | 'Marketing'
  | 'Travel'
  | 'Miscellaneous';

export interface Client {
  id: string;
  legalEntityName: string;
  brandTradeName: string;
  primaryContactPerson: string;
  officialPhone: string;
  mobile: string;
  billingEmail: string;
  registeredAddress: string;
  city: string;
  state: string;
  pinCode: string;
  gstRegistered: boolean;
  gstin: string;
  pan: string;
  stateCode: string;
  placeOfSupply: string;
  reverseCharge: boolean;
  taxExempt: boolean;
  taxExemptReason?: string;
  clientSegment: 'Retainer' | 'One-Off';
  industryCategory: string;
  assignedAccountLead: string;
  internalNotes?: string;
  defaultPaymentTerms: string;
  status: 'Active' | 'Archived';
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  serviceName: string;
  category: string;
  groupCategory?: string; // e.g. "Influencer & Events"
  description: string;
  billingUnit: string;
  sacCode: string;
  minPrice: number;
  defaultPrice: number;
  maxPrice: number;
  internalCostPrice: number;
  gstRate: number; // e.g. 18
  status: 'Active' | 'Inactive';
}

export interface PackageItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unit: string;
  defaultUnitPrice: number;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  items: PackageItem[];
  standardPrice: number;
  packageDiscount: number;
  finalPrice: number;
  minPrice?: number;
  duration?: string;
  scope?: string;
  gstRate: number;
  presentationMode: 'Consolidated' | 'Itemized';
  status: 'Active' | 'Inactive';
}

export interface DocumentLineItem {
  id: string;
  serviceId?: string;
  serviceName: string;
  category?: string;
  description: string;
  sacCode: string;
  quantity: number;
  billingUnit: string;
  minPrice: number;
  defaultPrice: number;
  maxPrice: number;
  selectedTier: PriceTier;
  negotiatedUnitPrice: number;
  isBelowMinWarning: boolean;
  itemDiscountType: 'percentage' | 'fixed';
  itemDiscountValue: number;
  itemDiscountAmount: number;
  lineSubtotal: number;
  taxableAmount: number;
  gstRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  revisionNumber: number;
  clientId: string;
  clientName: string;
  projectTitle: string;
  quotationDate: string;
  validUntil: string;
  placeOfSupply: string;
  isInterState: boolean;
  salesExecutive: string;
  lineItems: DocumentLineItem[];
  documentDiscountType: 'percentage' | 'fixed';
  documentDiscountValue: number;
  totalLineSubtotal: number;
  totalItemDiscount: number;
  documentDiscountAmount: number;
  totalTaxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  paymentTerms: string;
  deliveryTimeline: string;
  validityDays: number;
  scopeNotes: string;
  exclusions: string;
  termsAndConditions: string;
  internalNotes: string;
  status: QuotationStatus;
  rejectionReason?: string;
  convertedToInvoiceId?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  quotationNumber?: string;
  clientId: string;
  clientName: string;
  projectTitle: string;
  invoiceDate: string;
  dueDate: string;
  placeOfSupply: string;
  isInterState: boolean;
  lineItems: DocumentLineItem[];
  documentDiscountType: 'percentage' | 'fixed';
  documentDiscountValue: number;
  totalLineSubtotal: number;
  totalItemDiscount: number;
  documentDiscountAmount: number;
  totalTaxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  notes: string;
  bankDetails: BankDetails;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  clientId: string;
  clientName: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionReference: string;
  internalNotes?: string;
  status: 'Completed' | 'Refunded';
}

export interface Retainer {
  id: string;
  retainerName: string;
  clientId: string;
  clientName: string;
  includedServices: string[];
  recurringAmount: number;
  frequency: RetainerFrequency;
  startDate: string;
  expiryDate: string;
  nextBillingDate: string;
  autoGenerateInvoice: boolean;
  status: 'Active' | 'Paused' | 'Cancelled';
}

export type ExpenseRecurrence = 'One-Time' | 'Monthly' | 'Quarterly' | 'Annually' | 'Custom';
export type ExpenseStatus = 'Paid' | 'Pending' | 'Approved' | 'Rejected' | 'Outstanding';
export type ReimbursementStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Pending Payment' | 'Reimbursed';

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  category: ExpenseCategory;
  description?: string;
  vendorOrEmployee: string;
  department?: string;
  amount: number;
  taxAmount: number;
  expenseDate: string;
  paymentMethod: string;
  paymentReference?: string;
  isRecurring: boolean;
  recurrence?: ExpenseRecurrence;
  recurringStartDate?: string;
  recurringNextDueDate?: string;
  recurringEndDate?: string;
  recurringBillingCycle?: string;
  recurringStatus?: 'Active' | 'Paused' | 'Cancelled';
  notes?: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptFileSize?: string;
  status: ExpenseStatus;
  // Project Association
  projectId?: string;
  projectTitle?: string;
  receiptDataUrl?: string;
  // Reimbursement Specifics
  isReimbursement?: boolean;
  employeeName?: string;
  reimbursementStatus?: ReimbursementStatus;
  reimbursementRejectionReason?: string;
  approvalDate?: string;
  reimbursementPaymentDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiVpa: string;
}

export interface CompanySettings {
  legalEntityName: string;
  registeredAddress: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  gstin: string;
  pan: string;
  corporateEmail: string;
  corporatePhone: string;
  website: string;
  bank: BankDetails;
  defaultGstRate: number;
  defaultValidityDays: number;
  defaultPaymentTerms: string;
  quotationTerms: string;
  invoiceStatutoryNote: string;
  quotationPrefix: string;
  invoicePrefix: string;
  paymentPrefix: string;
}
