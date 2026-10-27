'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Client, 
  ServiceItem, 
  Package, 
  Quotation, 
  Invoice, 
  PaymentRecord, 
  Retainer, 
  Expense, 
  CompanySettings,
  QuotationStatus,
  InvoiceStatus,
  PaymentMode
} from '../types/crm';
import { 
  INITIAL_COMPANY_SETTINGS,
  SEED_SERVICES
} from '../data/seedData';
import {
  clientsApi,
  servicesApi,
  packagesApi,
  quotationsApi,
  invoicesApi,
  paymentsApi,
  expensesApi,
  retainersApi,
  settingsApi,
} from '../lib/api';
import {
  adaptClient,
  toClientPayload,
  adaptService,
  toServicePayload,
  adaptPackage,
  toPackagePayload,
  adaptQuotation,
  toQuotationCreatePayload,
  adaptInvoice,
  toInvoiceCreatePayload,
  adaptPayment,
  toPaymentCreatePayload,
  adaptExpense,
  toExpensePayload,
  adaptRetainer,
  toRetainerPayload,
  adaptCompanySettings,
  toCompanySettingsPayload,
} from '../lib/adapters';
import { useAuth } from './AuthContext';

interface CrmContextType {
  clients: Client[];
  services: ServiceItem[];
  packages: Package[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  retainers: Retainer[];
  expenses: Expense[];
  settings: CompanySettings;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notifications: Array<{ id: string; title: string; time: string; read: boolean }>;
  markNotificationAsRead: (id: string) => void;
  refreshData: () => Promise<void>;
  seedCatalogueIfEmpty: () => Promise<void>;
  
  // Actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  archiveClient: (id: string) => Promise<void>;
  restoreClient: (id: string) => Promise<void>;
  
  addService: (service: Omit<ServiceItem, 'id'>) => Promise<ServiceItem>;
  updateService: (id: string, service: Partial<ServiceItem>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  addPackage: (pkg: Omit<Package, 'id'>) => Promise<Package>;
  updatePackage: (id: string, pkg: Partial<Package>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  duplicatePackage: (id: string) => Promise<Package>;
  
  addQuotation: (quote: Omit<Quotation, 'id' | 'createdAt'>) => Promise<Quotation>;
  updateQuotation: (id: string, quote: Partial<Quotation>) => Promise<void>;
  updateQuotationStatus: (id: string, status: QuotationStatus, reason?: string) => Promise<void>;
  convertQuotationToInvoice: (quotationId: string, customInvNumber?: string, customDueDate?: string) => Promise<Invoice>;
  duplicateQuotation: (id: string) => Promise<Quotation>;
  
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  duplicateInvoice: (id: string) => Promise<Invoice>;
  cancelInvoice: (id: string) => Promise<void>;
  
  recordPayment: (payment: {
    clientId: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    transactionReference: string;
    internalNotes?: string;
  }) => Promise<PaymentRecord>;

  addExpense: (expense: Omit<Expense, 'id'>) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  duplicateExpense: (id: string) => Promise<Expense>;
  approveExpenseClaim: (id: string) => Promise<void>;
  rejectExpenseClaim: (id: string, reason: string) => Promise<void>;
  markClaimReimbursed: (id: string) => Promise<void>;

  addRetainer: (ret: Omit<Retainer, 'id'>) => Promise<Retainer>;
  updateRetainer: (id: string, ret: Partial<Retainer>) => Promise<void>;
  deleteRetainer: (id: string) => Promise<void>;

  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  clearAllData: () => void;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; time: string; read: boolean }>>([]);

  // Lookup maps for fast relational resolution
  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    clients.forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  const quoteMap = useMemo(() => {
    const map: Record<string, Quotation> = {};
    quotations.forEach(q => { map[q.id] = q; });
    return map;
  }, [quotations]);

  const invoiceMap = useMemo(() => {
    const map: Record<string, Invoice> = {};
    invoices.forEach(i => { map[i.id] = i; });
    return map;
  }, [invoices]);

  // Load all 9 domain resources from backend
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [
        clientsRes,
        servicesRes,
        packagesRes,
        quotationsRes,
        invoicesRes,
        paymentsRes,
        expensesRes,
        retainersRes,
        settingsRes,
      ] = await Promise.allSettled([
        clientsApi.list({ page: 1, page_size: 100 }),
        servicesApi.list({ page: 1, page_size: 100 }),
        packagesApi.list({ page: 1, page_size: 100 }),
        quotationsApi.list({ page: 1, page_size: 100 }),
        invoicesApi.list({ page: 1, page_size: 100 }),
        paymentsApi.list({ page: 1, page_size: 100 }),
        expensesApi.list({ page: 1, page_size: 100 }),
        retainersApi.list({ page: 1, page_size: 100 }),
        settingsApi.getCompany(),
      ]);

      // 1. Process clients first so related models can look up names
      const loadedClients: Client[] = clientsRes.status === 'fulfilled'
        ? (clientsRes.value.items || []).map(adaptClient)
        : [];
      setClients(loadedClients);

      const localClientMap: Record<string, Client> = {};
      loadedClients.forEach(c => { localClientMap[c.id] = c; });

      // 2. Services
      const loadedServices: ServiceItem[] = servicesRes.status === 'fulfilled'
        ? (servicesRes.value.items || []).map(adaptService)
        : [];
      setServices(loadedServices);

      // 3. Packages
      const loadedPackages: Package[] = packagesRes.status === 'fulfilled'
        ? (packagesRes.value.items || []).map(adaptPackage)
        : [];
      setPackages(loadedPackages);

      // 4. Quotations
      const loadedQuotations: Quotation[] = quotationsRes.status === 'fulfilled'
        ? (quotationsRes.value.items || []).map((q: any) => adaptQuotation(q, localClientMap))
        : [];
      setQuotations(loadedQuotations);

      const localQuoteMap: Record<string, Quotation> = {};
      loadedQuotations.forEach(q => { localQuoteMap[q.id] = q; });

      // 5. Invoices
      const loadedInvoices: Invoice[] = invoicesRes.status === 'fulfilled'
        ? (invoicesRes.value.items || []).map((inv: any) => adaptInvoice(inv, localClientMap, localQuoteMap))
        : [];
      setInvoices(loadedInvoices);

      const localInvoiceMap: Record<string, Invoice> = {};
      loadedInvoices.forEach(i => { localInvoiceMap[i.id] = i; });

      // 6. Payments
      const loadedPayments: PaymentRecord[] = paymentsRes.status === 'fulfilled'
        ? (paymentsRes.value.items || []).map((p: any) => adaptPayment(p, localClientMap, localInvoiceMap))
        : [];
      setPayments(loadedPayments);

      // 7. Expenses
      const loadedExpenses: Expense[] = expensesRes.status === 'fulfilled'
        ? (expensesRes.value.items || []).map(adaptExpense)
        : [];
      setExpenses(loadedExpenses);

      // 8. Retainers
      const loadedRetainers: Retainer[] = retainersRes.status === 'fulfilled'
        ? (retainersRes.value.items || []).map((r: any) => adaptRetainer(r, localClientMap))
        : [];
      setRetainers(loadedRetainers);

      // 9. Company Settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        setSettings(adaptCompanySettings(settingsRes.value));
      }

      // Populate notifications for unread/action items
      const notifs: Array<{ id: string; title: string; time: string; read: boolean }> = [];
      loadedQuotations
        .filter(q => q.status === 'Accepted')
        .slice(0, 3)
        .forEach(q => {
          notifs.push({
            id: `notif-q-${q.id}`,
            title: `Quotation ${q.quotationNumber} accepted by client`,
            time: q.quotationDate || 'Recent',
            read: false,
          });
        });
      loadedInvoices
        .filter(i => i.status === 'Partially Paid' || i.status === 'Sent')
        .slice(0, 3)
        .forEach(i => {
          notifs.push({
            id: `notif-i-${i.id}`,
            title: `Invoice ${i.invoiceNumber} pending collection`,
            time: i.dueDate || 'Recent',
            read: true,
          });
        });
      setNotifications(notifs);

    } catch (err: any) {
      setError(err?.message || 'Failed to load records from CRM backend');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllData = () => {
    setClients([]);
    setQuotations([]);
    setInvoices([]);
    setPayments([]);
    setRetainers([]);
    setExpenses([]);
    setPackages([]);
    setNotifications([]);
  };

  // Optional convenience helper to populate service catalogue if database is empty
  const seedCatalogueIfEmpty = async () => {
    if (services.length > 0) return;
    setIsLoading(true);
    try {
      for (const s of SEED_SERVICES) {
        await servicesApi.create(toServicePayload(s));
      }
      await loadAllData();
    } catch (err: any) {
      setError(err?.message || 'Failed to seed initial service catalogue');
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------------------------------------
  // CLIENT ACTIONS
  // -----------------------------------------------------------

  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    const payload = toClientPayload(clientData);
    const created = await clientsApi.create(payload);
    const adapted = adaptClient(created);
    setClients(prev => [adapted, ...prev]);
    return adapted;
  };

  const updateClient = async (id: string, updated: Partial<Client>) => {
    const payload = toClientPayload(updated);
    const res = await clientsApi.update(id, payload);
    const adapted = adaptClient(res);
    setClients(prev => prev.map(c => c.id === id ? adapted : c));
  };

  const archiveClient = async (id: string) => {
    await clientsApi.archive(id);
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'Archived' } : c));
  };

  const restoreClient = async (id: string) => {
    const res = await clientsApi.update(id, { status: 'Active' });
    const adapted = adaptClient(res);
    setClients(prev => prev.map(c => c.id === id ? adapted : c));
  };

  // -----------------------------------------------------------
  // SERVICE ACTIONS
  // -----------------------------------------------------------

  const addService = async (serviceData: Omit<ServiceItem, 'id'>): Promise<ServiceItem> => {
    const payload = toServicePayload(serviceData);
    const created = await servicesApi.create(payload);
    const adapted = adaptService(created);
    setServices(prev => [adapted, ...prev]);
    return adapted;
  };

  const updateService = async (id: string, updated: Partial<ServiceItem>) => {
    const payload = toServicePayload(updated);
    const res = await servicesApi.update(id, payload);
    const adapted = adaptService(res);
    setServices(prev => prev.map(s => s.id === id ? adapted : s));
  };

  const deleteService = async (id: string) => {
    await servicesApi.delete(id);
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'Inactive' } : s));
  };

  // -----------------------------------------------------------
  // PACKAGE ACTIONS
  // -----------------------------------------------------------

  const addPackage = async (pkgData: Omit<Package, 'id'>): Promise<Package> => {
    const payload = toPackagePayload(pkgData);
    const created = await packagesApi.create(payload);
    const adapted = adaptPackage(created);
    setPackages(prev => [adapted, ...prev]);
    return adapted;
  };

  const updatePackage = async (id: string, updated: Partial<Package>) => {
    const payload = toPackagePayload(updated);
    const res = await packagesApi.update(id, payload);
    const adapted = adaptPackage(res);
    setPackages(prev => prev.map(p => p.id === id ? adapted : p));
  };

  const deletePackage = async (id: string) => {
    await packagesApi.delete(id);
    setPackages(prev => prev.filter(p => p.id !== id));
  };

  const duplicatePackage = async (id: string): Promise<Package> => {
    const pkg = packages.find(p => p.id === id);
    if (!pkg) throw new Error('Package not found');
    const newName = `${pkg.name} (Copy)`;
    return await addPackage({
      ...pkg,
      name: newName,
    });
  };

  // -----------------------------------------------------------
  // QUOTATION ACTIONS
  // -----------------------------------------------------------

  const addQuotation = async (quoteData: Omit<Quotation, 'id' | 'createdAt'>): Promise<Quotation> => {
    const payload = toQuotationCreatePayload(quoteData);
    const created = await quotationsApi.create(payload);
    const adapted = adaptQuotation(created, clientMap);
    setQuotations(prev => [adapted, ...prev]);
    return adapted;
  };

  const updateQuotation = async (id: string, updated: Partial<Quotation>) => {
    const payload: Record<string, any> = {};
    if (updated.projectTitle !== undefined) payload.project_title = updated.projectTitle;
    if (updated.validUntil !== undefined) payload.valid_until = updated.validUntil;
    if (updated.placeOfSupply !== undefined) payload.place_of_supply = updated.placeOfSupply;
    if (updated.isInterState !== undefined) payload.is_inter_state = updated.isInterState;
    if (updated.salesExecutive !== undefined) payload.sales_executive = updated.salesExecutive;
    if (updated.documentDiscountType !== undefined) payload.document_discount_type = updated.documentDiscountType;
    if (updated.documentDiscountValue !== undefined) payload.document_discount_value = updated.documentDiscountValue;
    if (updated.paymentTerms !== undefined) payload.payment_terms = updated.paymentTerms;
    if (updated.deliveryTimeline !== undefined) payload.delivery_timeline = updated.deliveryTimeline;
    if (updated.validityDays !== undefined) payload.validity_days = updated.validityDays;
    if (updated.scopeNotes !== undefined) payload.scope_notes = updated.scopeNotes;
    if (updated.exclusions !== undefined) payload.exclusions = updated.exclusions;
    if (updated.termsAndConditions !== undefined) payload.terms_and_conditions = updated.termsAndConditions;
    if (updated.internalNotes !== undefined) payload.internal_notes = updated.internalNotes;
    if (updated.status !== undefined) payload.status = updated.status;
    if (updated.rejectionReason !== undefined) payload.rejection_reason = updated.rejectionReason;

    const res = await quotationsApi.update(id, payload);
    const adapted = adaptQuotation(res, clientMap);
    setQuotations(prev => prev.map(q => q.id === id ? adapted : q));
  };

  const updateQuotationStatus = async (id: string, status: QuotationStatus, reason?: string) => {
    const res = await quotationsApi.update(id, {
      status,
      rejection_reason: reason || null,
    });
    const adapted = adaptQuotation(res, clientMap);
    setQuotations(prev => prev.map(q => q.id === id ? adapted : q));
  };

  const convertQuotationToInvoice = async (
    quotationId: string,
    customInvNumber?: string,
    customDueDate?: string
  ): Promise<Invoice> => {
    const quote = quotations.find(q => q.id === quotationId);
    if (!quote) throw new Error('Quotation not found');

    const invCount = invoices.length + 48;
    const invNumber = customInvNumber || `${settings.invoicePrefix}${String(invCount).padStart(4, '0')}`;
    const dueDate = customDueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    // Backend endpoint: POST /api/v1/quotations/{id}/convert?invoice_number=...&due_date=...
    const createdInvRaw = await quotationsApi.convert(quotationId, {
      invoice_number: invNumber,
      due_date: dueDate,
    });

    const adaptedInvoice = adaptInvoice(createdInvRaw, clientMap, quoteMap);
    setInvoices(prev => [adaptedInvoice, ...prev]);

    // Update quotation status in local state to Converted
    setQuotations(prev => prev.map(q => q.id === quotationId ? {
      ...q,
      status: 'Converted',
      convertedToInvoiceId: adaptedInvoice.id,
    } : q));

    return adaptedInvoice;
  };

  const duplicateQuotation = async (id: string): Promise<Quotation> => {
    const quote = quotations.find(q => q.id === id);
    if (!quote) throw new Error('Quotation not found');
    const newNum = `${settings.quotationPrefix}${String(Date.now()).slice(-4)}`;
    return await addQuotation({
      ...quote,
      quotationNumber: newNum,
      revisionNumber: 1,
      projectTitle: `${quote.projectTitle} (Copy)`,
      status: 'Draft',
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    });
  };

  // -----------------------------------------------------------
  // INVOICE ACTIONS
  // -----------------------------------------------------------

  const addInvoice = async (invData: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> => {
    const payload = toInvoiceCreatePayload(invData);
    const created = await invoicesApi.create(payload);
    const adapted = adaptInvoice(created, clientMap, quoteMap);
    setInvoices(prev => [adapted, ...prev]);
    return adapted;
  };

  const updateInvoice = async (id: string, updated: Partial<Invoice>) => {
    const payload: Record<string, any> = {};
    if (updated.projectTitle !== undefined) payload.project_title = updated.projectTitle;
    if (updated.dueDate !== undefined) payload.due_date = updated.dueDate;
    if (updated.placeOfSupply !== undefined) payload.place_of_supply = updated.placeOfSupply;
    if (updated.isInterState !== undefined) payload.is_inter_state = updated.isInterState;
    if (updated.documentDiscountType !== undefined) payload.document_discount_type = updated.documentDiscountType;
    if (updated.documentDiscountValue !== undefined) payload.document_discount_value = updated.documentDiscountValue;
    if (updated.notes !== undefined) payload.notes = updated.notes;
    if (updated.bankDetails !== undefined) payload.bank_details = updated.bankDetails;
    if (updated.status !== undefined) payload.status = updated.status;

    const res = await invoicesApi.update(id, payload);
    const adapted = adaptInvoice(res, clientMap, quoteMap);
    setInvoices(prev => prev.map(inv => inv.id === id ? adapted : inv));
  };

  const updateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    const res = await invoicesApi.update(id, { status });
    const adapted = adaptInvoice(res, clientMap, quoteMap);
    setInvoices(prev => prev.map(inv => inv.id === id ? adapted : inv));
  };

  const duplicateInvoice = async (id: string): Promise<Invoice> => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) throw new Error('Invoice not found');
    const newNum = `${settings.invoicePrefix}${String(Date.now()).slice(-4)}`;
    return await addInvoice({
      ...inv,
      invoiceNumber: newNum,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'Draft',
      amountPaid: 0,
      balanceDue: inv.grandTotal,
    });
  };

  const cancelInvoice = async (id: string) => {
    await updateInvoiceStatus(id, 'Cancelled');
  };

  // -----------------------------------------------------------
  // PAYMENT ACTIONS
  // -----------------------------------------------------------

  const recordPayment = async (data: {
    clientId: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    transactionReference: string;
    internalNotes?: string;
  }): Promise<PaymentRecord> => {
    const newPaymentNumber = `${settings.paymentPrefix}${String(payments.length + 15).padStart(4, '0')}`;
    const payload = toPaymentCreatePayload({
      ...data,
      paymentNumber: newPaymentNumber,
    });

    const created = await paymentsApi.create(payload);
    const adaptedPayment = adaptPayment(created, clientMap, invoiceMap);
    setPayments(prev => [adaptedPayment, ...prev]);

    // Authoritative Server Refresh: Immediately refresh affected invoice from backend
    try {
      const updatedInvRaw = await invoicesApi.get(data.invoiceId);
      const adaptedInv = adaptInvoice(updatedInvRaw, clientMap, quoteMap);
      setInvoices(prev => prev.map(inv => inv.id === data.invoiceId ? adaptedInv : inv));
    } catch {
      // Fallback
    }

    return adaptedPayment;
  };

  // -----------------------------------------------------------
  // EXPENSE ACTIONS
  // -----------------------------------------------------------

  const addExpense = async (expData: Omit<Expense, 'id'>): Promise<Expense> => {
    const expenseNum = expData.expenseNumber || `EXP-${String(Date.now()).slice(-4)}`;
    const payload = toExpensePayload({
      ...expData,
      expenseNumber: expenseNum,
    });
    const created = await expensesApi.create(payload);
    const adapted = adaptExpense(created);
    setExpenses(prev => [adapted, ...prev]);
    return adapted;
  };

  const updateExpense = async (id: string, updated: Partial<Expense>) => {
    const payload = toExpensePayload(updated);
    const res = await expensesApi.update(id, payload);
    const adapted = adaptExpense(res);
    setExpenses(prev => prev.map(e => e.id === id ? adapted : e));
  };

  const deleteExpense = async (id: string) => {
    await expensesApi.delete(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const duplicateExpense = async (id: string): Promise<Expense> => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) throw new Error('Expense not found');
    return await addExpense({
      ...exp,
      title: `${exp.title} (Copy)`,
      status: 'Pending',
      expenseDate: new Date().toISOString().split('T')[0],
    });
  };

  const approveExpenseClaim = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateExpense(id, {
      reimbursementStatus: 'Approved',
      approvalDate: today,
      status: 'Approved',
    });
  };

  const rejectExpenseClaim = async (id: string, reason: string) => {
    await updateExpense(id, {
      reimbursementStatus: 'Rejected',
      reimbursementRejectionReason: reason,
      status: 'Rejected',
    });
  };

  const markClaimReimbursed = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    await updateExpense(id, {
      reimbursementStatus: 'Reimbursed',
      reimbursementPaymentDate: today,
      status: 'Paid',
    });
  };

  // -----------------------------------------------------------
  // RETAINER ACTIONS
  // -----------------------------------------------------------

  const addRetainer = async (retData: Omit<Retainer, 'id'>): Promise<Retainer> => {
    const payload = toRetainerPayload(retData);
    const created = await retainersApi.create(payload);
    const adapted = adaptRetainer(created, clientMap);
    setRetainers(prev => [adapted, ...prev]);
    return adapted;
  };

  const updateRetainer = async (id: string, updated: Partial<Retainer>) => {
    const payload = toRetainerPayload(updated);
    const res = await retainersApi.update(id, payload);
    const adapted = adaptRetainer(res, clientMap);
    setRetainers(prev => prev.map(r => r.id === id ? adapted : r));
  };

  const deleteRetainer = async (id: string) => {
    await retainersApi.delete(id);
    setRetainers(prev => prev.filter(r => r.id !== id));
  };

  // -----------------------------------------------------------
  // SETTINGS ACTIONS
  // -----------------------------------------------------------

  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    const payload = toCompanySettingsPayload(newSettings);
    const res = await settingsApi.updateCompany(payload);
    const adapted = adaptCompanySettings(res);
    setSettings(adapted);
  };

  return (
    <CrmContext.Provider value={{
      clients,
      services,
      packages,
      quotations,
      invoices,
      payments,
      retainers,
      expenses,
      settings,
      isLoading,
      error,
      searchQuery,
      setSearchQuery,
      notifications,
      markNotificationAsRead,
      refreshData: loadAllData,
      seedCatalogueIfEmpty,
      addClient,
      updateClient,
      archiveClient,
      restoreClient,
      addService,
      updateService,
      deleteService,
      addPackage,
      updatePackage,
      deletePackage,
      duplicatePackage,
      addQuotation,
      updateQuotation,
      updateQuotationStatus,
      convertQuotationToInvoice,
      duplicateQuotation,
      addInvoice,
      updateInvoice,
      updateInvoiceStatus,
      duplicateInvoice,
      cancelInvoice,
      recordPayment,
      addExpense,
      updateExpense,
      deleteExpense,
      duplicateExpense,
      approveExpenseClaim,
      rejectExpenseClaim,
      markClaimReimbursed,
      addRetainer,
      updateRetainer,
      deleteRetainer,
      updateSettings,
      clearAllData
    }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
