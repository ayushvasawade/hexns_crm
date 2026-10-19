'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  SEED_CLIENTS, 
  SEED_SERVICES, 
  SEED_PACKAGES, 
  SEED_QUOTATIONS, 
  SEED_INVOICES, 
  SEED_PAYMENTS, 
  SEED_RETAINERS, 
  SEED_EXPENSES, 
  INITIAL_COMPANY_SETTINGS 
} from '../data/seedData';

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
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notifications: Array<{ id: string; title: string; time: string; read: boolean }>;
  markNotificationAsRead: (id: string) => void;
  
  // Actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  archiveClient: (id: string) => void;
  
  restoreClient: (id: string) => void;
  
  addService: (service: Omit<ServiceItem, 'id'>) => ServiceItem;
  updateService: (id: string, service: Partial<ServiceItem>) => void;
  
  addPackage: (pkg: Omit<Package, 'id'>) => Package;
  updatePackage: (id: string, pkg: Partial<Package>) => void;
  deletePackage: (id: string) => void;
  duplicatePackage: (id: string) => Package;
  
  addQuotation: (quote: Omit<Quotation, 'id' | 'createdAt'>) => Quotation;
  updateQuotation: (id: string, quote: Partial<Quotation>) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus, reason?: string) => void;
  convertQuotationToInvoice: (quotationId: string) => Invoice;
  duplicateQuotation: (id: string) => Quotation;
  
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Invoice;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  duplicateInvoice: (id: string) => Invoice;
  cancelInvoice: (id: string) => void;
  
  recordPayment: (payment: {
    clientId: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    transactionReference: string;
    internalNotes?: string;
  }) => PaymentRecord;

  addExpense: (expense: Omit<Expense, 'id'>) => Expense;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  duplicateExpense: (id: string) => Expense;
  approveExpenseClaim: (id: string) => void;
  rejectExpenseClaim: (id: string, reason: string) => void;
  markClaimReimbursed: (id: string) => void;

  addRetainer: (ret: Omit<Retainer, 'id'>) => Retainer;
  updateRetainer: (id: string, ret: Partial<Retainer>) => void;
  deleteRetainer: (id: string) => void;

  updateSettings: (newSettings: Partial<CompanySettings>) => void;
  clearAllData: () => void;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(SEED_CLIENTS);
  const [services, setServices] = useState<ServiceItem[]>(SEED_SERVICES);
  const [packages, setPackages] = useState<Package[]>(SEED_PACKAGES);
  const [quotations, setQuotations] = useState<Quotation[]>(SEED_QUOTATIONS);
  const [invoices, setInvoices] = useState<Invoice[]>(SEED_INVOICES);
  const [payments, setPayments] = useState<PaymentRecord[]>(SEED_PAYMENTS);
  const [retainers, setRetainers] = useState<Retainer[]>(SEED_RETAINERS);
  const [expenses, setExpenses] = useState<Expense[]>(SEED_EXPENSES);
  const [settings, setSettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; time: string; read: boolean }>>([]);

  // Load from localStorage if present (v2 storage without synthetic data)
  useEffect(() => {
    try {
      // Clean up legacy v1 mock keys if present
      localStorage.removeItem('hexns_quotations');
      localStorage.removeItem('hexns_invoices');
      localStorage.removeItem('hexns_clients');

      const savedQuotes = localStorage.getItem('hexns_v2_quotations');
      if (savedQuotes) setQuotations(JSON.parse(savedQuotes));
      const savedInvoices = localStorage.getItem('hexns_v2_invoices');
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
      const savedClients = localStorage.getItem('hexns_v2_clients');
      if (savedClients) setClients(JSON.parse(savedClients));
      const savedPayments = localStorage.getItem('hexns_v2_payments');
      if (savedPayments) setPayments(JSON.parse(savedPayments));
      const savedExpenses = localStorage.getItem('hexns_v2_expenses');
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      const savedRetainers = localStorage.getItem('hexns_v2_retainers');
      if (savedRetainers) setRetainers(JSON.parse(savedRetainers));
    } catch {
      // Fallback to memory state
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hexns_v2_clients', JSON.stringify(clients));
    } catch {}
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem('hexns_v2_quotations', JSON.stringify(quotations));
    } catch {}
  }, [quotations]);

  useEffect(() => {
    try {
      localStorage.setItem('hexns_v2_invoices', JSON.stringify(invoices));
    } catch {}
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem('hexns_v2_payments', JSON.stringify(payments));
    } catch {}
  }, [payments]);

  const clearAllData = () => {
    setClients([]);
    setQuotations([]);
    setInvoices([]);
    setPayments([]);
    setRetainers([]);
    setExpenses([]);
    setPackages([]);
    setNotifications([]);
    try {
      localStorage.removeItem('hexns_v2_clients');
      localStorage.removeItem('hexns_v2_quotations');
      localStorage.removeItem('hexns_v2_invoices');
      localStorage.removeItem('hexns_v2_payments');
      localStorage.removeItem('hexns_v2_expenses');
      localStorage.removeItem('hexns_v2_retainers');
    } catch {}
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const archiveClient = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'Archived' } : c));
  };

  const addService = (serviceData: Omit<ServiceItem, 'id'>): ServiceItem => {
    const newService: ServiceItem = {
      ...serviceData,
      id: `srv-${Date.now()}`
    };
    setServices(prev => [newService, ...prev]);
    return newService;
  };

  const updateService = (id: string, updated: Partial<ServiceItem>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const addPackage = (pkgData: Omit<Package, 'id'>): Package => {
    const newPkg: Package = {
      ...pkgData,
      id: `pkg-${Date.now()}`
    };
    setPackages(prev => [newPkg, ...prev]);
    return newPkg;
  };

  const updatePackage = (id: string, updated: Partial<Package>) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
  };

  const addQuotation = (quoteData: Omit<Quotation, 'id' | 'createdAt'>): Quotation => {
    const newQuote: Quotation = {
      ...quoteData,
      id: `q-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setQuotations(prev => [newQuote, ...prev]);
    return newQuote;
  };

  const updateQuotation = (id: string, updated: Partial<Quotation>) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q));
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus, reason?: string) => {
    setQuotations(prev => prev.map(q => {
      if (q.id === id) {
        return { 
          ...q, 
          status, 
          rejectionReason: reason || q.rejectionReason 
        };
      }
      return q;
    }));
  };

  const convertQuotationToInvoice = (quotationId: string): Invoice => {
    const quote = quotations.find(q => q.id === quotationId);
    if (!quote) throw new Error("Quotation not found");

    const invCount = invoices.length + 47;
    const invNumber = `${settings.invoicePrefix}${String(invCount).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      quotationId: quote.id,
      quotationNumber: quote.quotationNumber,
      clientId: quote.clientId,
      clientName: quote.clientName,
      projectTitle: quote.projectTitle,
      invoiceDate: today,
      dueDate: dueDate,
      placeOfSupply: quote.placeOfSupply,
      isInterState: quote.isInterState,
      lineItems: [...quote.lineItems],
      documentDiscountType: quote.documentDiscountType,
      documentDiscountValue: quote.documentDiscountValue,
      totalLineSubtotal: quote.totalLineSubtotal,
      totalItemDiscount: quote.totalItemDiscount,
      documentDiscountAmount: quote.documentDiscountAmount,
      totalTaxableAmount: quote.totalTaxableAmount,
      cgstAmount: quote.cgstAmount,
      sgstAmount: quote.sgstAmount,
      igstAmount: quote.igstAmount,
      grandTotal: quote.grandTotal,
      amountPaid: 0,
      balanceDue: quote.grandTotal,
      status: "Sent",
      notes: `Generated from accepted quotation ${quote.quotationNumber}. Payment terms: ${quote.paymentTerms}`,
      bankDetails: settings.bank,
      createdAt: today
    };

    // Update quote status to Converted and link invoice ID
    setQuotations(prev => prev.map(q => q.id === quotationId ? {
      ...q,
      status: "Converted",
      convertedToInvoiceId: newInvoice.id
    } : q));

    setInvoices(prev => [newInvoice, ...prev]);
    return newInvoice;
  };

  const addInvoice = (invData: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const newInv: Invoice = {
      ...invData,
      id: `inv-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInvoices(prev => [newInv, ...prev]);
    return newInv;
  };

  const updateInvoice = (id: string, updated: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updated } : inv));
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
  };

  const recordPayment = (data: {
    clientId: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMode: PaymentMode;
    transactionReference: string;
    internalNotes?: string;
  }): PaymentRecord => {
    const invoice = invoices.find(inv => inv.id === data.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    const newPaymentNumber = `${settings.paymentPrefix}${String(payments.length + 14).padStart(4, '0')}`;
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentNumber: newPaymentNumber,
      clientId: data.clientId,
      clientName: invoice.clientName,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentDate: data.paymentDate,
      amount: data.amount,
      paymentMode: data.paymentMode,
      transactionReference: data.transactionReference,
      internalNotes: data.internalNotes,
      status: "Completed"
    };

    // Update invoice balance and status
    const newPaidAmount = invoice.amountPaid + data.amount;
    const newBalance = Math.max(0, invoice.grandTotal - newPaidAmount);
    const newStatus: InvoiceStatus = newBalance === 0 ? "Paid" : "Partially Paid";

    setInvoices(prev => prev.map(inv => inv.id === data.invoiceId ? {
      ...inv,
      amountPaid: newPaidAmount,
      balanceDue: newBalance,
      status: newStatus
    } : inv));

    setPayments(prev => [newPayment, ...prev]);
    return newPayment;
  };

  const restoreClient = (id: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'Active' } : c));
  };

  const deletePackage = (id: string) => {
    setPackages(prev => prev.filter(p => p.id !== id));
  };

  const duplicatePackage = (id: string): Package => {
    const pkg = packages.find(p => p.id === id);
    if (!pkg) throw new Error("Package not found");
    const newPkg: Package = {
      ...pkg,
      id: `pkg-${Date.now()}`,
      name: `${pkg.name} (Copy)`
    };
    setPackages(prev => [newPkg, ...prev]);
    return newPkg;
  };

  const duplicateQuotation = (id: string): Quotation => {
    const quote = quotations.find(q => q.id === id);
    if (!quote) throw new Error("Quotation not found");
    const newNum = `${settings.quotationPrefix}${String(Date.now()).slice(-4)}`;
    const newQuote: Quotation = {
      ...quote,
      id: `q-${Date.now()}`,
      quotationNumber: newNum,
      revisionNumber: 1,
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'Draft',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setQuotations(prev => [newQuote, ...prev]);
    return newQuote;
  };

  const duplicateInvoice = (id: string): Invoice => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) throw new Error("Invoice not found");
    const newNum = `${settings.invoicePrefix}${String(Date.now()).slice(-4)}`;
    const newInv: Invoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      invoiceNumber: newNum,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      amountPaid: 0,
      balanceDue: inv.grandTotal,
      status: 'Draft',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInvoices(prev => [newInv, ...prev]);
    return newInv;
  };

  const cancelInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'Cancelled' } : inv));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const duplicateExpense = (id: string): Expense => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) throw new Error("Expense not found");
    const newExp: Expense = {
      ...exp,
      id: `exp-${Date.now()}`,
      expenseNumber: `EXP-${String(Date.now()).slice(-4)}`,
      title: `${exp.title} (Copy)`,
      status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setExpenses(prev => [newExp, ...prev]);
    return newExp;
  };

  const deleteRetainer = (id: string) => {
    setRetainers(prev => prev.filter(r => r.id !== id));
  };

  const addExpense = (expData: Omit<Expense, 'id'>): Expense => {
    const newExp: Expense = {
      ...expData,
      id: `exp-${Date.now()}`,
      expenseNumber: expData.expenseNumber || `EXP-${String(Date.now()).slice(-4)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setExpenses(prev => [newExp, ...prev]);
    return newExp;
  };

  const updateExpense = (id: string, updated: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updated, updatedAt: new Date().toISOString().split('T')[0] } : e));
  };

  const approveExpenseClaim = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setExpenses(prev => prev.map(e => e.id === id ? {
      ...e,
      reimbursementStatus: 'Approved',
      approvalDate: today,
      status: 'Approved',
      updatedAt: today
    } : e));
  };

  const rejectExpenseClaim = (id: string, reason: string) => {
    const today = new Date().toISOString().split('T')[0];
    setExpenses(prev => prev.map(e => e.id === id ? {
      ...e,
      reimbursementStatus: 'Rejected',
      reimbursementRejectionReason: reason,
      status: 'Rejected',
      updatedAt: today
    } : e));
  };

  const markClaimReimbursed = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setExpenses(prev => prev.map(e => e.id === id ? {
      ...e,
      reimbursementStatus: 'Reimbursed',
      reimbursementPaymentDate: today,
      status: 'Paid',
      updatedAt: today
    } : e));
  };

  const addRetainer = (retData: Omit<Retainer, 'id'>): Retainer => {
    const newRet: Retainer = {
      ...retData,
      id: `ret-${Date.now()}`
    };
    setRetainers(prev => [newRet, ...prev]);
    return newRet;
  };

  const updateRetainer = (id: string, updated: Partial<Retainer>) => {
    setRetainers(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
  };

  const updateSettings = (updated: Partial<CompanySettings>) => {
    setSettings(prev => ({ ...prev, ...updated }));
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
      searchQuery,
      setSearchQuery,
      notifications,
      markNotificationAsRead,
      addClient,
      updateClient,
      archiveClient,
      restoreClient,
      addService,
      updateService,
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
    throw new Error("useCrm must be used within a CrmProvider");
  }
  return context;
};
