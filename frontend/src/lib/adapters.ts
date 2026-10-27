/**
 * Explicit Data Adapters between Backend Pydantic Schemas and Frontend UI Models
 */

import {
  Client,
  ServiceItem,
  Package,
  PackageItem,
  DocumentLineItem,
  Quotation,
  Invoice,
  PaymentRecord,
  Expense,
  Retainer,
  CompanySettings,
} from '../types/crm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: unknown): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export function toNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

// -------------------------------------------------------------
// CLIENT ADAPTERS
// -------------------------------------------------------------

export function adaptClient(raw: any): Client {
  return {
    id: raw.id,
    legalEntityName: raw.legalEntityName || raw.legal_entity_name || '',
    brandTradeName: raw.brandTradeName || raw.brand_trade_name || '',
    primaryContactPerson: raw.primaryContactPerson || raw.primary_contact_person || '',
    officialPhone: raw.officialPhone || raw.official_phone || '',
    mobile: raw.mobile || '',
    billingEmail: raw.billingEmail || raw.billing_email || '',
    registeredAddress: raw.registeredAddress || raw.registered_address || '',
    city: raw.city || '',
    state: raw.state || '',
    pinCode: raw.pinCode || raw.pin_code || '',
    gstRegistered: Boolean(raw.gstRegistered ?? raw.gst_registered),
    gstin: raw.gstin || '',
    pan: raw.pan || '',
    stateCode: raw.stateCode || raw.state_code || '',
    placeOfSupply: raw.placeOfSupply || raw.place_of_supply || '',
    reverseCharge: Boolean(raw.reverseCharge ?? raw.reverse_charge),
    taxExempt: Boolean(raw.taxExempt ?? raw.tax_exempt),
    taxExemptReason: raw.taxExemptReason || raw.tax_exempt_reason || '',
    clientSegment: raw.clientSegment || raw.client_segment || 'One-Off',
    industryCategory: raw.industryCategory || raw.industry_category || '',
    assignedAccountLead: raw.assignedAccountLead || raw.assigned_account_lead || '',
    internalNotes: raw.internalNotes || raw.internal_notes || '',
    defaultPaymentTerms: raw.defaultPaymentTerms || raw.default_payment_terms || '',
    status: raw.status || 'Active',
    createdAt: (raw.createdAt || raw.created_at || new Date().toISOString()).slice(0, 10),
  };
}

export function toClientPayload(data: Partial<Client>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.legalEntityName !== undefined) payload.legal_entity_name = data.legalEntityName;
  if (data.brandTradeName !== undefined) payload.brand_trade_name = data.brandTradeName;
  if (data.primaryContactPerson !== undefined) payload.primary_contact_person = data.primaryContactPerson;
  if (data.officialPhone !== undefined) payload.official_phone = data.officialPhone;
  if (data.mobile !== undefined) payload.mobile = data.mobile;
  if (data.billingEmail !== undefined) payload.billing_email = data.billingEmail;
  if (data.registeredAddress !== undefined) payload.registered_address = data.registeredAddress;
  if (data.city !== undefined) payload.city = data.city;
  if (data.state !== undefined) payload.state = data.state;
  if (data.pinCode !== undefined) payload.pin_code = data.pinCode;
  if (data.gstRegistered !== undefined) payload.gst_registered = data.gstRegistered;
  if (data.gstin !== undefined) payload.gstin = data.gstin || null;
  if (data.pan !== undefined) payload.pan = data.pan || null;
  if (data.stateCode !== undefined) payload.state_code = data.stateCode || null;
  if (data.placeOfSupply !== undefined) payload.place_of_supply = data.placeOfSupply;
  if (data.reverseCharge !== undefined) payload.reverse_charge = data.reverseCharge;
  if (data.taxExempt !== undefined) payload.tax_exempt = data.taxExempt;
  if (data.taxExemptReason !== undefined) payload.tax_exempt_reason = data.taxExemptReason || null;
  if (data.clientSegment !== undefined) payload.client_segment = data.clientSegment;
  if (data.industryCategory !== undefined) payload.industry_category = data.industryCategory;
  if (data.assignedAccountLead !== undefined) payload.assigned_account_lead = data.assignedAccountLead;
  if (data.internalNotes !== undefined) payload.internal_notes = data.internalNotes || null;
  if (data.defaultPaymentTerms !== undefined) payload.default_payment_terms = data.defaultPaymentTerms;
  if (data.status !== undefined) payload.status = data.status;
  return payload;
}

// -------------------------------------------------------------
// SERVICE ADAPTERS
// -------------------------------------------------------------

export function adaptService(raw: any): ServiceItem {
  return {
    id: raw.id,
    serviceName: raw.serviceName || raw.service_name || '',
    category: raw.category || '',
    groupCategory: raw.groupCategory || raw.group_category || undefined,
    description: raw.description || '',
    billingUnit: raw.billingUnit || raw.billing_unit || 'Per Unit',
    sacCode: raw.sacCode || raw.sac_code || '998311',
    minPrice: toNumber(raw.minPrice ?? raw.min_price),
    defaultPrice: toNumber(raw.defaultPrice ?? raw.default_price),
    maxPrice: toNumber(raw.maxPrice ?? raw.max_price),
    internalCostPrice: toNumber(raw.internalCostPrice ?? raw.internal_cost_price),
    gstRate: toNumber(raw.gstRate ?? raw.gst_rate, 18),
    status: raw.status || 'Active',
  };
}

export function toServicePayload(data: Partial<ServiceItem>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.serviceName !== undefined) payload.service_name = data.serviceName;
  if (data.category !== undefined) payload.category = data.category;
  if (data.groupCategory !== undefined) payload.group_category = data.groupCategory || null;
  if (data.description !== undefined) payload.description = data.description;
  if (data.billingUnit !== undefined) payload.billing_unit = data.billingUnit;
  if (data.sacCode !== undefined) payload.sac_code = data.sacCode;
  if (data.minPrice !== undefined) payload.min_price = toNumber(data.minPrice);
  if (data.defaultPrice !== undefined) payload.default_price = toNumber(data.defaultPrice);
  if (data.maxPrice !== undefined) payload.max_price = toNumber(data.maxPrice);
  if (data.internalCostPrice !== undefined) payload.internal_cost_price = toNumber(data.internalCostPrice);
  if (data.gstRate !== undefined) payload.gst_rate = toNumber(data.gstRate, 18);
  if (data.status !== undefined) payload.status = data.status;
  return payload;
}

// -------------------------------------------------------------
// PACKAGE ADAPTERS
// -------------------------------------------------------------

export function adaptPackage(raw: any): Package {
  return {
    id: raw.id,
    name: raw.name || '',
    description: raw.description || '',
    standardPrice: toNumber(raw.standardPrice ?? raw.standard_price),
    packageDiscount: toNumber(raw.packageDiscount ?? raw.package_discount),
    finalPrice: toNumber(raw.finalPrice ?? raw.final_price),
    minPrice: raw.minPrice != null || raw.min_price != null ? toNumber(raw.minPrice ?? raw.min_price) : undefined,
    duration: raw.duration || undefined,
    scope: raw.scope || undefined,
    gstRate: toNumber(raw.gstRate ?? raw.gst_rate, 18),
    presentationMode: raw.presentationMode || raw.presentation_mode || 'Itemized',
    status: raw.status || 'Active',
    items: (raw.items || []).map((it: any): PackageItem => ({
      serviceId: it.serviceId || it.service_id || '',
      serviceName: it.serviceName || it.service_name || '',
      quantity: toNumber(it.quantity, 1),
      unit: it.unit || '',
      defaultUnitPrice: toNumber(it.defaultUnitPrice ?? it.default_unit_price),
    })),
  };
}

export function toPackagePayload(data: Partial<Package>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.standardPrice !== undefined) payload.standard_price = toNumber(data.standardPrice);
  if (data.packageDiscount !== undefined) payload.package_discount = toNumber(data.packageDiscount);
  if (data.finalPrice !== undefined) payload.final_price = toNumber(data.finalPrice);
  if (data.minPrice !== undefined) payload.min_price = data.minPrice != null ? toNumber(data.minPrice) : null;
  if (data.duration !== undefined) payload.duration = data.duration || null;
  if (data.scope !== undefined) payload.scope = data.scope || null;
  if (data.gstRate !== undefined) payload.gst_rate = toNumber(data.gstRate, 18);
  if (data.presentationMode !== undefined) payload.presentation_mode = data.presentationMode;
  if (data.status !== undefined) payload.status = data.status;
  if (data.items !== undefined) {
    payload.items = data.items
      .filter(it => isValidUuid(it.serviceId))
      .map(it => ({
        service_id: it.serviceId,
        quantity: toNumber(it.quantity, 1),
        unit: it.unit,
        default_unit_price: toNumber(it.defaultUnitPrice),
      }));
  }
  return payload;
}

// -------------------------------------------------------------
// LINE ITEM ADAPTERS
// -------------------------------------------------------------

export function adaptLineItem(it: any): DocumentLineItem {
  return {
    id: it.id || `li-${Math.random().toString(36).slice(2, 9)}`,
    serviceId: it.serviceId || it.service_id || undefined,
    serviceName: it.serviceName || it.service_name || '',
    category: it.category || undefined,
    description: it.description || '',
    sacCode: it.sacCode || it.sac_code || '998311',
    quantity: toNumber(it.quantity, 1),
    billingUnit: it.billingUnit || it.billing_unit || 'Per Unit',
    minPrice: toNumber(it.minPrice ?? it.min_price),
    defaultPrice: toNumber(it.defaultPrice ?? it.default_price),
    maxPrice: toNumber(it.maxPrice ?? it.max_price),
    selectedTier: it.selectedTier || it.selected_tier || 'DEFAULT',
    negotiatedUnitPrice: toNumber(it.negotiatedUnitPrice ?? it.negotiated_unit_price),
    isBelowMinWarning: Boolean(it.isBelowMinWarning ?? it.is_below_min_warning),
    itemDiscountType: it.itemDiscountType || it.item_discount_type || 'fixed',
    itemDiscountValue: toNumber(it.itemDiscountValue ?? it.item_discount_value),
    itemDiscountAmount: toNumber(it.itemDiscountAmount ?? it.item_discount_amount),
    lineSubtotal: toNumber(it.lineSubtotal ?? it.line_subtotal),
    taxableAmount: toNumber(it.taxableAmount ?? it.taxable_amount),
    gstRate: toNumber(it.gstRate ?? it.gst_rate, 18),
    taxAmount: toNumber(it.taxAmount ?? it.tax_amount),
    lineTotal: toNumber(it.lineTotal ?? it.line_total),
  };
}

export function toLineItemPayload(it: DocumentLineItem): Record<string, any> {
  return {
    service_id: isValidUuid(it.serviceId) ? it.serviceId : null,
    service_name: it.serviceName,
    category: it.category || null,
    description: it.description || '',
    sac_code: it.sacCode || '998311',
    quantity: toNumber(it.quantity, 1),
    billing_unit: it.billingUnit || 'Per Unit',
    min_price: toNumber(it.minPrice),
    default_price: toNumber(it.defaultPrice),
    max_price: toNumber(it.maxPrice),
    selected_tier: it.selectedTier || 'DEFAULT',
    negotiated_unit_price: toNumber(it.negotiatedUnitPrice),
    item_discount_type: it.itemDiscountType || 'fixed',
    item_discount_value: toNumber(it.itemDiscountValue),
    gst_rate: toNumber(it.gstRate, 18),
  };
}

// -------------------------------------------------------------
// QUOTATION ADAPTERS
// -------------------------------------------------------------

export function adaptQuotation(raw: any, clientMap: Record<string, Client>): Quotation {
  const clientId = raw.clientId || raw.client_id || '';
  const client = clientMap[clientId];
  const clientName = client?.legalEntityName || client?.brandTradeName || 'Client';

  return {
    id: raw.id,
    quotationNumber: raw.quotationNumber || raw.quotation_number || '',
    revisionNumber: raw.revisionNumber ?? raw.revision_number ?? 1,
    clientId,
    clientName,
    projectTitle: raw.projectTitle || raw.project_title || '',
    quotationDate: raw.quotationDate || raw.quotation_date || '',
    validUntil: raw.validUntil || raw.valid_until || '',
    placeOfSupply: raw.placeOfSupply || raw.place_of_supply || '',
    isInterState: Boolean(raw.isInterState ?? raw.is_inter_state),
    salesExecutive: raw.salesExecutive || raw.sales_executive || '',
    lineItems: (raw.lineItems || raw.lines || []).map(adaptLineItem),
    documentDiscountType: raw.documentDiscountType || raw.document_discount_type || 'percentage',
    documentDiscountValue: toNumber(raw.documentDiscountValue ?? raw.document_discount_value),
    totalLineSubtotal: toNumber(raw.totalLineSubtotal ?? raw.total_line_subtotal),
    totalItemDiscount: toNumber(raw.totalItemDiscount ?? raw.total_item_discount),
    documentDiscountAmount: toNumber(raw.documentDiscountAmount ?? raw.document_discount_amount),
    totalTaxableAmount: toNumber(raw.totalTaxableAmount ?? raw.total_taxable_amount),
    cgstAmount: toNumber(raw.cgstAmount ?? raw.cgst_amount),
    sgstAmount: toNumber(raw.sgstAmount ?? raw.sgst_amount),
    igstAmount: toNumber(raw.igstAmount ?? raw.igst_amount),
    grandTotal: toNumber(raw.grandTotal ?? raw.grand_total),
    paymentTerms: raw.paymentTerms || raw.payment_terms || '',
    deliveryTimeline: raw.deliveryTimeline || raw.delivery_timeline || '',
    validityDays: toNumber(raw.validityDays ?? raw.validity_days, 15),
    scopeNotes: raw.scopeNotes || raw.scope_notes || '',
    exclusions: raw.exclusions || '',
    termsAndConditions: raw.termsAndConditions || raw.terms_and_conditions || '',
    internalNotes: raw.internalNotes || raw.internal_notes || '',
    status: raw.status || 'Draft',
    rejectionReason: raw.rejectionReason || raw.rejection_reason || undefined,
    convertedToInvoiceId: raw.convertedToInvoiceId || raw.converted_to_invoice_id || undefined,
    createdAt: (raw.createdAt || raw.created_at || new Date().toISOString()).slice(0, 10),
  };
}

export function toQuotationCreatePayload(data: Omit<Quotation, 'id' | 'createdAt'>): Record<string, any> {
  return {
    client_id: data.clientId,
    quotation_number: data.quotationNumber,
    project_title: data.projectTitle,
    quotation_date: data.quotationDate,
    valid_until: data.validUntil,
    place_of_supply: data.placeOfSupply,
    is_inter_state: Boolean(data.isInterState),
    sales_executive: data.salesExecutive || '',
    document_discount_type: data.documentDiscountType || 'percentage',
    document_discount_value: toNumber(data.documentDiscountValue),
    payment_terms: data.paymentTerms || '',
    delivery_timeline: data.deliveryTimeline || '',
    validity_days: toNumber(data.validityDays, 15),
    scope_notes: data.scopeNotes || '',
    exclusions: data.exclusions || '',
    terms_and_conditions: data.termsAndConditions || '',
    internal_notes: data.internalNotes || '',
    status: data.status || 'Draft',
    line_items: data.lineItems.map(toLineItemPayload),
  };
}

// -------------------------------------------------------------
// INVOICE ADAPTERS
// -------------------------------------------------------------

export function adaptInvoice(raw: any, clientMap: Record<string, Client>, quoteMap: Record<string, Quotation>): Invoice {
  const clientId = raw.clientId || raw.client_id || '';
  const client = clientMap[clientId];
  const clientName = client?.legalEntityName || client?.brandTradeName || 'Client';

  const quotationId = raw.quotationId || raw.quotation_id || undefined;
  const quote = quotationId ? quoteMap[quotationId] : undefined;
  const quotationNumber = quote?.quotationNumber || undefined;

  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber || raw.invoice_number || '',
    quotationId,
    quotationNumber,
    clientId,
    clientName,
    projectTitle: raw.projectTitle || raw.project_title || '',
    invoiceDate: raw.invoiceDate || raw.invoice_date || '',
    dueDate: raw.dueDate || raw.due_date || '',
    placeOfSupply: raw.placeOfSupply || raw.place_of_supply || '',
    isInterState: Boolean(raw.isInterState ?? raw.is_inter_state),
    lineItems: (raw.lineItems || raw.lines || []).map(adaptLineItem),
    documentDiscountType: raw.documentDiscountType || raw.document_discount_type || 'percentage',
    documentDiscountValue: toNumber(raw.documentDiscountValue ?? raw.document_discount_value),
    totalLineSubtotal: toNumber(raw.totalLineSubtotal ?? raw.total_line_subtotal),
    totalItemDiscount: toNumber(raw.totalItemDiscount ?? raw.total_item_discount),
    documentDiscountAmount: toNumber(raw.documentDiscountAmount ?? raw.document_discount_amount),
    totalTaxableAmount: toNumber(raw.totalTaxableAmount ?? raw.total_taxable_amount),
    cgstAmount: toNumber(raw.cgstAmount ?? raw.cgst_amount),
    sgstAmount: toNumber(raw.sgstAmount ?? raw.sgst_amount),
    igstAmount: toNumber(raw.igstAmount ?? raw.igst_amount),
    grandTotal: toNumber(raw.grandTotal ?? raw.grand_total),
    amountPaid: toNumber(raw.amountPaid ?? raw.amount_paid),
    balanceDue: toNumber(raw.balanceDue ?? raw.balance_due),
    status: raw.status || 'Draft',
    notes: raw.notes || '',
    bankDetails: raw.bankDetails || raw.bank_details || {},
    createdAt: (raw.createdAt || raw.created_at || new Date().toISOString()).slice(0, 10),
  };
}

export function toInvoiceCreatePayload(data: Omit<Invoice, 'id' | 'createdAt'>): Record<string, any> {
  return {
    client_id: data.clientId,
    invoice_number: data.invoiceNumber,
    quotation_id: isValidUuid(data.quotationId) ? data.quotationId : null,
    project_title: data.projectTitle,
    invoice_date: data.invoiceDate,
    due_date: data.dueDate,
    place_of_supply: data.placeOfSupply,
    is_inter_state: Boolean(data.isInterState),
    document_discount_type: data.documentDiscountType || 'percentage',
    document_discount_value: toNumber(data.documentDiscountValue),
    notes: data.notes || '',
    bank_details: data.bankDetails || {},
    status: data.status || 'Draft',
    line_items: data.lineItems.map(toLineItemPayload),
  };
}

// -------------------------------------------------------------
// PAYMENT ADAPTERS
// -------------------------------------------------------------

export function adaptPayment(raw: any, clientMap: Record<string, Client>, invoiceMap: Record<string, Invoice>): PaymentRecord {
  const clientId = raw.clientId || raw.client_id || '';
  const invoiceId = raw.invoiceId || raw.invoice_id || '';
  const client = clientMap[clientId];
  const invoice = invoiceMap[invoiceId];

  return {
    id: raw.id,
    paymentNumber: raw.paymentNumber || raw.payment_number || '',
    clientId,
    clientName: client?.legalEntityName || client?.brandTradeName || 'Client',
    invoiceId,
    invoiceNumber: invoice?.invoiceNumber || '',
    paymentDate: raw.paymentDate || raw.payment_date || '',
    amount: toNumber(raw.amount),
    paymentMode: raw.paymentMode || raw.payment_mode || 'NEFT / RTGS / IMPS',
    transactionReference: raw.transactionReference || raw.transaction_reference || '',
    internalNotes: raw.internalNotes || raw.internal_notes || undefined,
    status: raw.status || 'Completed',
  };
}

export function toPaymentCreatePayload(data: {
  paymentNumber: string;
  clientId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  transactionReference: string;
  internalNotes?: string;
}): Record<string, any> {
  return {
    payment_number: data.paymentNumber,
    client_id: data.clientId,
    invoice_id: data.invoiceId,
    payment_date: data.paymentDate,
    amount: toNumber(data.amount),
    payment_mode: data.paymentMode,
    transaction_reference: data.transactionReference,
    internal_notes: data.internalNotes || null,
  };
}

// -------------------------------------------------------------
// EXPENSE ADAPTERS
// -------------------------------------------------------------

export function adaptExpense(raw: any): Expense {
  return {
    id: raw.id,
    expenseNumber: raw.expenseNumber || raw.expense_number || '',
    title: raw.title || '',
    category: raw.category || 'Miscellaneous',
    description: raw.description || undefined,
    vendorOrEmployee: raw.vendorOrEmployee || raw.vendor_or_employee || '',
    department: raw.department || undefined,
    amount: toNumber(raw.amount),
    taxAmount: toNumber(raw.taxAmount ?? raw.tax_amount),
    expenseDate: raw.expenseDate || raw.expense_date || '',
    paymentMethod: raw.paymentMethod || raw.payment_method || 'Corporate Credit Card',
    paymentReference: raw.paymentReference || raw.payment_reference || undefined,
    isRecurring: Boolean(raw.isRecurring ?? raw.is_recurring),
    recurrence: raw.recurrence || undefined,
    recurringStartDate: raw.recurringStartDate || raw.recurring_start_date || undefined,
    recurringNextDueDate: raw.recurringNextDueDate || raw.recurring_next_due_date || undefined,
    recurringEndDate: raw.recurringEndDate || raw.recurring_end_date || undefined,
    recurringBillingCycle: raw.recurringBillingCycle || raw.recurring_billing_cycle || undefined,
    recurringStatus: raw.recurringStatus || raw.recurring_status || undefined,
    notes: raw.notes || undefined,
    receiptFileName: raw.receiptFileName || raw.receipt_file_name || undefined,
    receiptFileType: raw.receiptFileType || raw.receipt_file_type || undefined,
    receiptFileSize: raw.receiptFileSize || raw.receipt_file_size || undefined,
    status: raw.status || 'Pending',
    projectId: raw.projectId || raw.project_id || undefined,
    projectTitle: raw.projectTitle || raw.project_title || undefined,
    isReimbursement: Boolean(raw.isReimbursement ?? raw.is_reimbursement),
    employeeName: raw.employeeName || raw.employee_name || undefined,
    reimbursementStatus: raw.reimbursementStatus || raw.reimbursement_status || undefined,
    reimbursementRejectionReason: raw.reimbursementRejectionReason || raw.reimbursement_rejection_reason || undefined,
    approvalDate: raw.approvalDate || raw.approval_date || undefined,
    reimbursementPaymentDate: raw.reimbursementPaymentDate || raw.reimbursement_payment_date || undefined,
    createdAt: (raw.createdAt || raw.created_at || '').slice(0, 10),
    updatedAt: (raw.updatedAt || raw.updated_at || '').slice(0, 10),
  };
}

export function toExpensePayload(data: Partial<Expense>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.expenseNumber !== undefined) payload.expense_number = data.expenseNumber;
  if (data.title !== undefined) payload.title = data.title;
  if (data.category !== undefined) payload.category = data.category;
  if (data.description !== undefined) payload.description = data.description || null;
  if (data.vendorOrEmployee !== undefined) payload.vendor_or_employee = data.vendorOrEmployee;
  if (data.department !== undefined) payload.department = data.department || null;
  if (data.amount !== undefined) payload.amount = toNumber(data.amount);
  if (data.taxAmount !== undefined) payload.tax_amount = toNumber(data.taxAmount);
  if (data.expenseDate !== undefined) payload.expense_date = data.expenseDate;
  if (data.paymentMethod !== undefined) payload.payment_method = data.paymentMethod;
  if (data.paymentReference !== undefined) payload.payment_reference = data.paymentReference || null;
  if (data.isRecurring !== undefined) payload.is_recurring = data.isRecurring;
  if (data.recurrence !== undefined) payload.recurrence = data.recurrence || null;
  if (data.recurringStartDate !== undefined) payload.recurring_start_date = data.recurringStartDate || null;
  if (data.recurringNextDueDate !== undefined) payload.recurring_next_due_date = data.recurringNextDueDate || null;
  if (data.recurringEndDate !== undefined) payload.recurring_end_date = data.recurringEndDate || null;
  if (data.recurringBillingCycle !== undefined) payload.recurring_billing_cycle = data.recurringBillingCycle || null;
  if (data.recurringStatus !== undefined) payload.recurring_status = data.recurringStatus || null;
  if (data.notes !== undefined) payload.notes = data.notes || null;
  if (data.receiptFileName !== undefined) payload.receipt_file_name = data.receiptFileName || null;
  if (data.receiptFileType !== undefined) payload.receipt_file_type = data.receiptFileType || null;
  if (data.receiptFileSize !== undefined) payload.receipt_file_size = data.receiptFileSize || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.isReimbursement !== undefined) payload.is_reimbursement = data.isReimbursement;
  if (data.employeeName !== undefined) payload.employee_name = data.employeeName || null;
  if (data.reimbursementStatus !== undefined) payload.reimbursement_status = data.reimbursementStatus || null;
  if (data.reimbursementRejectionReason !== undefined) payload.reimbursement_rejection_reason = data.reimbursementRejectionReason || null;
  if (data.approvalDate !== undefined) payload.approval_date = data.approvalDate || null;
  if (data.reimbursementPaymentDate !== undefined) payload.reimbursement_payment_date = data.reimbursementPaymentDate || null;
  return payload;
}

// -------------------------------------------------------------
// RETAINER ADAPTERS
// -------------------------------------------------------------

export function adaptRetainer(raw: any, clientMap: Record<string, Client>): Retainer {
  const clientId = raw.clientId || raw.client_id || '';
  const client = clientMap[clientId];
  const clientName = client?.legalEntityName || client?.brandTradeName || 'Client';

  return {
    id: raw.id,
    retainerName: raw.retainerName || raw.retainer_name || '',
    clientId,
    clientName,
    includedServices: raw.includedServices || raw.included_services || [],
    recurringAmount: toNumber(raw.recurringAmount ?? raw.recurring_amount),
    frequency: raw.frequency || 'Monthly',
    startDate: raw.startDate || raw.start_date || '',
    expiryDate: raw.expiryDate || raw.expiry_date || '',
    nextBillingDate: raw.nextBillingDate || raw.next_billing_date || '',
    autoGenerateInvoice: Boolean(raw.autoGenerateInvoice ?? raw.auto_generate_invoice),
    status: raw.status || 'Active',
  };
}

export function toRetainerPayload(data: Partial<Retainer>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.retainerName !== undefined) payload.retainer_name = data.retainerName;
  if (data.clientId !== undefined) payload.client_id = data.clientId;
  if (data.includedServices !== undefined) payload.included_services = data.includedServices;
  if (data.recurringAmount !== undefined) payload.recurring_amount = toNumber(data.recurringAmount);
  if (data.frequency !== undefined) payload.frequency = data.frequency;
  if (data.startDate !== undefined) payload.start_date = data.startDate;
  if (data.expiryDate !== undefined) payload.expiry_date = data.expiryDate;
  if (data.nextBillingDate !== undefined) payload.next_billing_date = data.nextBillingDate;
  if (data.autoGenerateInvoice !== undefined) payload.auto_generate_invoice = data.autoGenerateInvoice;
  if (data.status !== undefined) payload.status = data.status;
  return payload;
}

// -------------------------------------------------------------
// COMPANY SETTINGS ADAPTERS
// -------------------------------------------------------------

export function adaptCompanySettings(raw: any): CompanySettings {
  return {
    legalEntityName: raw.legalEntityName || raw.legal_entity_name || '',
    registeredAddress: raw.registeredAddress || raw.registered_address || '',
    city: raw.city || '',
    state: raw.state || '',
    stateCode: raw.stateCode || raw.state_code || '',
    pinCode: raw.pinCode || raw.pin_code || '',
    gstin: raw.gstin || '',
    pan: raw.pan || '',
    corporateEmail: raw.corporateEmail || raw.corporate_email || '',
    corporatePhone: raw.corporatePhone || raw.corporate_phone || '',
    website: raw.website || '',
    bank: raw.bank || {
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upiVpa: '',
    },
    defaultGstRate: toNumber(raw.defaultGstRate ?? raw.default_gst_rate, 18),
    defaultValidityDays: toNumber(raw.defaultValidityDays ?? raw.default_validity_days, 15),
    defaultPaymentTerms: raw.defaultPaymentTerms || raw.default_payment_terms || '',
    quotationTerms: raw.quotationTerms || raw.quotation_terms || '',
    invoiceStatutoryNote: raw.invoiceStatutoryNote || raw.invoice_statutory_note || '',
    quotationPrefix: raw.quotationPrefix || raw.quotation_prefix || 'HEX/26-27/Q-',
    invoicePrefix: raw.invoicePrefix || raw.invoice_prefix || 'HEX/26-27/INV-',
    paymentPrefix: raw.paymentPrefix || raw.payment_prefix || 'HEX/26-27/REC-',
  };
}

export function toCompanySettingsPayload(data: Partial<CompanySettings>): Record<string, any> {
  const payload: Record<string, any> = {};
  if (data.legalEntityName !== undefined) payload.legal_entity_name = data.legalEntityName;
  if (data.registeredAddress !== undefined) payload.registered_address = data.registeredAddress;
  if (data.city !== undefined) payload.city = data.city;
  if (data.state !== undefined) payload.state = data.state;
  if (data.stateCode !== undefined) payload.state_code = data.stateCode;
  if (data.pinCode !== undefined) payload.pin_code = data.pinCode;
  if (data.gstin !== undefined) payload.gstin = data.gstin;
  if (data.pan !== undefined) payload.pan = data.pan;
  if (data.corporateEmail !== undefined) payload.corporate_email = data.corporateEmail;
  if (data.corporatePhone !== undefined) payload.corporate_phone = data.corporatePhone;
  if (data.website !== undefined) payload.website = data.website;
  if (data.bank !== undefined) payload.bank = data.bank;
  if (data.defaultGstRate !== undefined) payload.default_gst_rate = toNumber(data.defaultGstRate, 18);
  if (data.defaultValidityDays !== undefined) payload.default_validity_days = toNumber(data.defaultValidityDays, 15);
  if (data.defaultPaymentTerms !== undefined) payload.default_payment_terms = data.defaultPaymentTerms;
  if (data.quotationTerms !== undefined) payload.quotation_terms = data.quotationTerms;
  if (data.invoiceStatutoryNote !== undefined) payload.invoice_statutory_note = data.invoiceStatutoryNote;
  if (data.quotationPrefix !== undefined) payload.quotation_prefix = data.quotationPrefix;
  if (data.invoicePrefix !== undefined) payload.invoice_prefix = data.invoicePrefix;
  if (data.paymentPrefix !== undefined) payload.payment_prefix = data.paymentPrefix;
  return payload;
}
