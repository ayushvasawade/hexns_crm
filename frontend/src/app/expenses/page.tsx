'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Search, 
  Plus, 
  Filter, 
  Paperclip, 
  Calendar, 
  Tag, 
  CheckCircle,
  Building,
  CreditCard,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  FileText,
  UploadCloud,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Download,
  Users,
  Briefcase,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { Expense, ExpenseCategory, ExpenseRecurrence, ExpenseStatus, ReimbursementStatus } from '../../types/crm';
import { formatINR, formatDate } from '../../lib/formatters';
import { isDateInRange } from '../../lib/financialCalculations';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function ExpensesPage() {
  const { 
    expenses, 
    addExpense, 
    updateExpense, 
    deleteExpense, 
    duplicateExpense,
    approveExpenseClaim,
    rejectExpenseClaim,
    markClaimReimbursed,
    quotations,
    invoices
  } = useCrm();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'all' | 'recurring' | 'reimbursements' | 'employee_costs'>('all');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [recurrenceFilter, setRecurrenceFilter] = useState<string>('All');
  const [employeeFilter, setEmployeeFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<Expense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const [reimburseRejectExpense, setReimburseRejectExpense] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('AI subscriptions and API usage');
  const [formDescription, setFormDescription] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formDepartment, setFormDepartment] = useState('Creative');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formTaxAmount, setFormTaxAmount] = useState<number>(0);
  const [formExpenseDate, setFormExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState('Corporate Credit Card');
  const [formPaymentRef, setFormPaymentRef] = useState('');
  const [formStatus, setFormStatus] = useState<ExpenseStatus>('Paid');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurrence, setFormRecurrence] = useState<ExpenseRecurrence>('Monthly');
  const [formRecurringStartDate, setFormRecurringStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRecurringNextDue, setFormRecurringNextDue] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [formRecurringEndDate, setFormRecurringEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formReceiptName, setFormReceiptName] = useState<string>('');
  const [formReceiptSize, setFormReceiptSize] = useState<string>('');
  const [formReceiptDataUrl, setFormReceiptDataUrl] = useState<string>('');
  const [formIsReimbursement, setFormIsReimbursement] = useState(false);
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formProjectTitle, setFormProjectTitle] = useState('');

  // Categories list
  const categories: Array<'All' | ExpenseCategory> = [
    'All',
    'AI subscriptions and API usage',
    'Software subscriptions',
    'Hosting and infrastructure',
    'Marketing',
    'Electricity & Utilities',
    'Internet & Communications',
    'Employee salaries',
    'Employer-side contributions (PF, ESIC, Insurance)',
    'Employee reimbursements',
    'Contractor and freelancer payments',
    'Shoot expenses and equipment rentals',
    'Office rent and utilities',
    'Travel',
    'Miscellaneous'
  ];

  // Distinct Employees for Filter
  const uniqueEmployees = useMemo(() => {
    const names = new Set<string>();
    expenses.forEach(e => {
      if (e.employeeName) names.add(e.employeeName);
      if (e.isReimbursement && e.vendorOrEmployee) names.add(e.vendorOrEmployee);
      if (e.category === 'Employee salaries' && e.vendorOrEmployee) names.add(e.vendorOrEmployee);
    });
    return Array.from(names).sort();
  }, [expenses]);

  // Distinct Projects / Clients for Filter
  const availableProjects = useMemo(() => {
    const list: Array<{ id: string; title: string }> = [];
    const seen = new Set<string>();

    invoices.forEach(inv => {
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        list.push({ id: inv.id, title: `${inv.invoiceNumber} - ${inv.clientName}` });
      }
    });

    quotations.forEach(q => {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        list.push({ id: q.id, title: `${q.quotationNumber} - ${q.clientName}` });
      }
    });

    expenses.forEach(e => {
      if (e.projectId && !seen.has(e.projectId)) {
        seen.add(e.projectId);
        list.push({ id: e.projectId, title: e.projectTitle || e.projectId });
      }
    });

    return list;
  }, [invoices, quotations, expenses]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormCategory('AI subscriptions and API usage');
    setFormDescription('');
    setFormVendor('');
    setFormDepartment('Creative');
    setFormAmount(0);
    setFormTaxAmount(0);
    setFormExpenseDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('Corporate Credit Card');
    setFormPaymentRef('');
    setFormStatus('Paid');
    setFormIsRecurring(false);
    setFormRecurrence('Monthly');
    setFormRecurringStartDate(new Date().toISOString().split('T')[0]);
    setFormRecurringNextDue(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setFormRecurringEndDate('');
    setFormNotes('');
    setFormReceiptName('');
    setFormReceiptSize('');
    setFormReceiptDataUrl('');
    setFormIsReimbursement(false);
    setFormEmployeeName('');
    setFormProjectId('');
    setFormProjectTitle('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormDescription(exp.description || '');
    setFormVendor(exp.vendorOrEmployee);
    setFormDepartment(exp.department || 'Creative');
    setFormAmount(exp.amount);
    setFormTaxAmount(exp.taxAmount);
    setFormExpenseDate(exp.expenseDate);
    setFormPaymentMethod(exp.paymentMethod);
    setFormPaymentRef(exp.paymentReference || '');
    setFormStatus(exp.status);
    setFormIsRecurring(exp.isRecurring);
    setFormRecurrence(exp.recurrence || 'Monthly');
    setFormRecurringStartDate(exp.recurringStartDate || exp.expenseDate);
    setFormRecurringNextDue(exp.recurringNextDueDate || '');
    setFormRecurringEndDate(exp.recurringEndDate || '');
    setFormNotes(exp.notes || '');
    setFormReceiptName(exp.receiptFileName || '');
    setFormReceiptSize(exp.receiptFileSize || '');
    setFormReceiptDataUrl(exp.receiptDataUrl || '');
    setFormIsReimbursement(Boolean(exp.isReimbursement));
    setFormEmployeeName(exp.employeeName || exp.vendorOrEmployee);
    setFormProjectId(exp.projectId || '');
    setFormProjectTitle(exp.projectTitle || '');
    setIsAddModalOpen(true);
  };

  // File Upload Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormReceiptName(file.name);
      const sizeKb = Math.round(file.size / 1024);
      setFormReceiptSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormReceiptDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) {
      alert("Please enter a valid expense title and positive amount.");
      return;
    }

    const payload: Partial<Expense> = {
      expenseNumber: editingExpense ? editingExpense.expenseNumber : `EXP-${String(Date.now()).slice(-4)}`,
      title: formTitle.trim(),
      category: formCategory,
      description: formDescription.trim(),
      vendorOrEmployee: formVendor.trim() || (formIsReimbursement ? formEmployeeName : "Vendor"),
      department: formDepartment,
      amount: formAmount,
      taxAmount: formTaxAmount,
      expenseDate: formExpenseDate,
      paymentMethod: formPaymentMethod,
      paymentReference: formPaymentRef.trim(),
      isRecurring: formIsRecurring,
      recurrence: formIsRecurring ? formRecurrence : 'One-Time',
      recurringStartDate: formIsRecurring ? formRecurringStartDate : undefined,
      recurringNextDueDate: formIsRecurring ? formRecurringNextDue : undefined,
      recurringEndDate: formIsRecurring ? formRecurringEndDate : undefined,
      recurringStatus: formIsRecurring ? ('Active' as const) : undefined,
      notes: formNotes.trim(),
      receiptFileName: formReceiptName || undefined,
      receiptFileSize: formReceiptSize || undefined,
      receiptFileType: formReceiptName?.endsWith('.pdf') ? 'PDF Document' : formReceiptName ? 'Image Receipt' : undefined,
      receiptDataUrl: formReceiptDataUrl || undefined,
      status: formStatus,
      isReimbursement: formIsReimbursement || formCategory === 'Employee reimbursements',
      employeeName: (formIsReimbursement || formCategory === 'Employee reimbursements') ? (formEmployeeName || formVendor) : undefined,
      reimbursementStatus: (formIsReimbursement || formCategory === 'Employee reimbursements') 
        ? (editingExpense?.reimbursementStatus || 'Pending Approval') 
        : undefined,
      projectId: formProjectId || undefined,
      projectTitle: formProjectTitle || undefined
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, payload);
    } else {
      await addExpense(payload as any);
    }

    setIsAddModalOpen(false);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Tab Filtering
      if (activeTab === 'recurring' && !e.isRecurring) return false;
      if (activeTab === 'reimbursements' && !e.isReimbursement && e.category !== 'Employee reimbursements') return false;
      if (activeTab === 'employee_costs') {
        const isEmployeeCost = e.category === 'Employee salaries' || 
          e.category === 'Employee reimbursements' || 
          e.category === 'Employer-side contributions (PF, ESIC, Insurance)' ||
          Boolean(e.isReimbursement);
        if (!isEmployeeCost) return false;
      }

      // Date Range Filter
      if (!isDateInRange(e.expenseDate, dateRangeFilter, customStartDate, customEndDate)) {
        return false;
      }

      // Text Search
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        e.title.toLowerCase().includes(q) ||
        e.vendorOrEmployee.toLowerCase().includes(q) ||
        (e.paymentReference && e.paymentReference.toLowerCase().includes(q)) ||
        (e.expenseNumber && e.expenseNumber.toLowerCase().includes(q)) ||
        (e.projectTitle && e.projectTitle.toLowerCase().includes(q));

      // Category Filter
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;

      // Status Filter
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;

      // Recurrence Filter
      const matchesRecurrence = recurrenceFilter === 'All' || 
        (recurrenceFilter === 'Recurring' ? e.isRecurring : !e.isRecurring);

      // Employee Filter
      const matchesEmployee = employeeFilter === 'All' || 
        e.employeeName === employeeFilter || 
        e.vendorOrEmployee === employeeFilter;

      // Project Filter
      const matchesProject = projectFilter === 'All' || e.projectId === projectFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesRecurrence && matchesEmployee && matchesProject;
    });
  }, [
    expenses, 
    activeTab, 
    search, 
    categoryFilter, 
    statusFilter, 
    recurrenceFilter, 
    employeeFilter, 
    projectFilter, 
    dateRangeFilter, 
    customStartDate, 
    customEndDate
  ]);

  // Dynamic KPI Metrics calculated from filtered view
  const summaryMetrics = useMemo(() => {
    const totalBurn = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalTax = filteredExpenses.reduce((sum, e) => sum + (e.taxAmount || 0), 0);
    const paidTotal = filteredExpenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0);
    const pendingTotal = filteredExpenses.filter(e => e.status === 'Pending' || e.status === 'Outstanding').reduce((sum, e) => sum + e.amount, 0);
    const pendingReimbursements = filteredExpenses
      .filter(e => (e.isReimbursement || e.category === 'Employee reimbursements') && (e.reimbursementStatus === 'Pending Approval' || e.reimbursementStatus === 'Pending Payment'))
      .reduce((sum, e) => sum + e.amount, 0);
    const recurringMonthly = filteredExpenses
      .filter(e => e.isRecurring && e.recurringStatus !== 'Cancelled')
      .reduce((sum, e) => {
        if (e.recurrence === 'Quarterly') return sum + Math.round(e.amount / 3);
        if (e.recurrence === 'Annually') return sum + Math.round(e.amount / 12);
        return sum + e.amount;
      }, 0);

    return {
      totalBurn,
      totalTax,
      paidTotal,
      pendingTotal,
      pendingReimbursements,
      recurringMonthly
    };
  }, [filteredExpenses]);

  // Dynamic Monthly Expense Chart Data (Item 12)
  const monthlyExpenseTrend = useMemo(() => {
    const monthMap: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Default last 6 months
    const now = new Date();
    const orderedKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      orderedKeys.push(key);
      monthMap[key] = 0;
    }

    filteredExpenses.forEach(exp => {
      const ym = exp.expenseDate.slice(0, 7);
      if (monthMap[ym] !== undefined) {
        monthMap[ym] += exp.amount;
      } else {
        monthMap[ym] = exp.amount;
        if (!orderedKeys.includes(ym)) orderedKeys.push(ym);
      }
    });

    const displayKeys = orderedKeys.sort().slice(-6);
    const maxVal = Math.max(...displayKeys.map(k => monthMap[k] || 0), 10000);

    return {
      maxVal,
      data: displayKeys.map(key => {
        const [year, monthNum] = key.split('-');
        const monthLabel = months[parseInt(monthNum, 10) - 1] || key;
        return {
          key,
          label: `${monthLabel} '${year.slice(2)}`,
          amount: monthMap[key] || 0
        };
      })
    };
  }, [filteredExpenses]);

  // Employee Cost Breakdown Calculation (Item 5)
  const employeeCostBreakdown = useMemo(() => {
    const salaries = filteredExpenses
      .filter(e => e.category === 'Employee salaries')
      .reduce((sum, e) => sum + e.amount, 0);

    const employerContributions = filteredExpenses
      .filter(e => e.category === 'Employer-side contributions (PF, ESIC, Insurance)')
      .reduce((sum, e) => sum + e.amount, 0);

    const reimbursementsApproved = filteredExpenses
      .filter(e => (e.isReimbursement || e.category === 'Employee reimbursements') && (e.reimbursementStatus === 'Approved' || e.reimbursementStatus === 'Reimbursed' || e.status === 'Paid'))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalStaffCost = salaries + employerContributions + reimbursementsApproved;

    // Department breakdown
    const deptMap: Record<string, number> = {};
    filteredExpenses
      .filter(e => e.category === 'Employee salaries' || e.category === 'Employer-side contributions (PF, ESIC, Insurance)' || e.isReimbursement || e.category === 'Employee reimbursements')
      .forEach(e => {
        const dept = e.department || 'Creative';
        deptMap[dept] = (deptMap[dept] || 0) + e.amount;
      });

    return {
      salaries,
      employerContributions,
      reimbursementsApproved,
      totalStaffCost,
      deptMap
    };
  }, [filteredExpenses]);

  // CSV Export
  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No expense records to export.");
      return;
    }
    const headers = ["Expense ID", "Title", "Category", "Vendor/Employee", "Project/Ref", "Date", "Amount (INR)", "Tax (INR)", "Payment Method", "Recurrence", "Status", "Reimbursement Status"];
    const rows = filteredExpenses.map(e => [
      e.expenseNumber || e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.vendorOrEmployee}"`,
      `"${(e.projectTitle || e.projectId || '').replace(/"/g, '""')}"`,
      e.expenseDate,
      e.amount,
      e.taxAmount,
      e.paymentMethod,
      e.isRecurring ? e.recurrence || 'Recurring' : 'One-Time',
      e.status,
      e.reimbursementStatus || 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hexns_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Expenses & Cost Control Centre
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Operating expenditures, creative tools, utilities, project allocations, and employee reimbursements.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={exportToCSV}
            style={{
              padding: '0.45rem 0.85rem',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#4B5563',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button 
            type="button"
            onClick={openAddModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <Plus size={15} />
            <span>+ Log Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Dynamic from filtered state) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem'
      }}>
        <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Filtered Total Burn</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginTop: '4px' }}>
            {formatINR(summaryMetrics.totalBurn)}
          </div>
          <span style={{ fontSize: '11px', color: '#6B7280' }}>Across {filteredExpenses.length} records</span>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Paid & Cleared</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>
            {formatINR(summaryMetrics.paidTotal)}
          </div>
          <span style={{ fontSize: '11px', color: '#15803D' }}>Settled with payees</span>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Pending / Outstanding</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: summaryMetrics.pendingTotal > 0 ? '#DC2626' : '#171717', marginTop: '4px' }}>
            {formatINR(summaryMetrics.pendingTotal)}
          </div>
          <span style={{ fontSize: '11px', color: '#6B7280' }}>Awaiting clearance</span>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Pending Claims</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: summaryMetrics.pendingReimbursements > 0 ? '#D97706' : '#171717', marginTop: '4px' }}>
            {formatINR(summaryMetrics.pendingReimbursements)}
          </div>
          <span style={{ fontSize: '11px', color: '#6B7280' }}>Staff reimbursement claims</span>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
          <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Recurring Commitments</span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
            {formatINR(summaryMetrics.recurringMonthly)}/mo
          </div>
          <span style={{ fontSize: '11px', color: '#6B7280' }}>SaaS, rent & fixed tools</span>
        </div>
      </div>

      {/* Dynamic Monthly Expense Chart (Item 12) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#171717', margin: 0 }}>
              Monthly Expense Trajectory
            </h2>
            <p style={{ fontSize: '12px', color: '#737373', margin: '2px 0 0' }}>
              Calculated dynamically from expense records matching your active filters
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
            Peak: {formatINR(monthlyExpenseTrend.maxVal)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', height: '140px', paddingTop: '1rem', borderBottom: '1px solid #F3F4F6' }}>
          {monthlyExpenseTrend.data.map((item) => {
            const heightPercent = Math.min(100, Math.max(8, Math.round((item.amount / monthlyExpenseTrend.maxVal) * 100)));
            return (
              <div key={item.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: item.amount > 0 ? '#171717' : '#9CA3AF', marginBottom: '6px' }}>
                  {item.amount > 0 ? formatINR(item.amount) : '₹0'}
                </span>
                <div style={{
                  width: '100%',
                  maxWidth: '48px',
                  height: `${heightPercent}%`,
                  backgroundColor: item.amount > 0 ? '#171717' : '#E5E7EB',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                }} />
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontWeight: 500 }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: '0 0.25rem'
      }}>
        {[
          { key: 'all', label: `All Expenses (${expenses.length})` },
          { key: 'recurring', label: `Recurring & Subscriptions (${expenses.filter(e => e.isRecurring).length})` },
          { key: 'reimbursements', label: `Employee Claims (${expenses.filter(e => e.isReimbursement || e.category === 'Employee reimbursements').length})` },
          { key: 'employee_costs', label: `Employee & Payroll Cost Center` }
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key as any)}
            style={{
              padding: '0.65rem 1rem',
              fontSize: '13px',
              fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? '#171717' : '#737373',
              borderBottom: activeTab === t.key ? '2px solid #171717' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar (Employee, Project, Category, Date Range) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: '#FFFFFF',
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
            <Search size={15} color="#9CA3AF" />
            <input 
              type="text" 
              placeholder="Search title, vendor, employee, project ref or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%', color: '#171717' }}
            />
            {search && (
              <button 
                type="button" 
                onClick={() => setSearch('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Clear Filters */}
          {(categoryFilter !== 'All' || statusFilter !== 'All' || recurrenceFilter !== 'All' || employeeFilter !== 'All' || projectFilter !== 'All' || dateRangeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('All');
                setStatusFilter('All');
                setRecurrenceFilter('All');
                setEmployeeFilter('All');
                setProjectFilter('All');
                setDateRangeFilter('all');
                setCustomStartDate('');
                setCustomEndDate('');
                setSearch('');
              }}
              style={{
                fontSize: '12px',
                color: '#DC2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Dedicated Dropdown Filters Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', borderTop: '1px solid #F3F4F6', paddingTop: '0.65rem' }}>
          {/* Category Filter */}
          {activeTab !== 'employee_costs' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Category:</span>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ padding: '0.35rem 0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Employee Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Employee:</span>
            <select 
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              style={{ padding: '0.35rem 0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
            >
              <option value="All">All Employees ({uniqueEmployees.length})</option>
              {uniqueEmployees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>
          </div>

          {/* Project / Client Association Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Project:</span>
            <select 
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{ padding: '0.35rem 0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
            >
              <option value="All">All Projects / Quotations</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.35rem 0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Outstanding">Outstanding</option>
            </select>
          </div>

          {/* Date Range Preset Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Period:</span>
            <select 
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              style={{ padding: '0.35rem 0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This FY (2026-27)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Range inputs if selected */}
          {dateRangeFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)} 
                style={{ padding: '0.25rem 0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11.5px' }} 
              />
              <span style={{ fontSize: '11px', color: '#6B7280' }}>to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)} 
                style={{ padding: '0.25rem 0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11.5px' }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Employee Cost Breakdown View (Item 5) */}
      {activeTab === 'employee_costs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717', margin: 0 }}>
                  Employee Cost & Statutory Burden Summary
                </h2>
                <p style={{ fontSize: '12px', color: '#737373', margin: '2px 0 0' }}>
                  Aggregated salary disbursements, employer contributions, and approved claims.
                </p>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                Cost Tracking Mode (Not Payroll Generation)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Salary Expenses</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginTop: '4px' }}>
                  {formatINR(employeeCostBreakdown.salaries)}
                </div>
                <span style={{ fontSize: '11px', color: '#737373' }}>Base compensation paid</span>
              </div>

              <div style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Employer Contributions</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
                  {formatINR(employeeCostBreakdown.employerContributions)}
                </div>
                <span style={{ fontSize: '11px', color: '#737373' }}>PF, ESIC & Insurance</span>
              </div>

              <div style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Staff Reimbursements</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>
                  {formatINR(employeeCostBreakdown.reimbursementsApproved)}
                </div>
                <span style={{ fontSize: '11px', color: '#737373' }}>Approved / Paid claims</span>
              </div>

              <div style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: '#171717', color: '#FFFFFF' }}>
                <span style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 600, textTransform: 'uppercase' }}>Total Employee Cost</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                  {formatINR(employeeCostBreakdown.totalStaffCost)}
                </div>
                <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Aggregate manpower expenditure</span>
              </div>
            </div>

            {/* Department Breakdown */}
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#171717', marginBottom: '0.5rem' }}>
                Department-Wise Allocation
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(employeeCostBreakdown.deptMap).map(([dept, cost]) => (
                  <div key={dept} style={{ padding: '0.75rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#737373', fontWeight: 600 }}>{dept}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>{formatINR(cost)}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {employeeCostBreakdown.totalStaffCost > 0 ? `${Math.round((cost / employeeCostBreakdown.totalStaffCost) * 100)}% of payroll` : '0%'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Expenses Register Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Expense ID & Title</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Vendor / Person</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Project / Quote</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Amount (INR)</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Receipt</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => (
                <tr 
                  key={exp.id}
                  style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.1s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {/* Expense Title */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div 
                      onClick={() => setSelectedExpenseForDetail(exp)}
                      style={{ fontWeight: 600, color: '#171717', cursor: 'pointer' }}
                    >
                      {exp.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#737373', fontFamily: 'monospace' }}>
                      {exp.expenseNumber || exp.id}
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      color: '#374151',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}>
                      {exp.category}
                    </span>
                  </td>

                  {/* Vendor / Employee */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 500, color: '#171717' }}>
                      {exp.employeeName || exp.vendorOrEmployee}
                    </div>
                    {exp.department && (
                      <div style={{ fontSize: '11px', color: '#737373' }}>Dept: {exp.department}</div>
                    )}
                  </td>

                  {/* Project / Quotation Link */}
                  <td style={{ padding: '0.85rem 1rem', fontSize: '12px' }}>
                    {exp.projectTitle || exp.projectId ? (
                      <span style={{ color: '#2563EB', fontWeight: 500 }}>
                        {exp.projectTitle || exp.projectId}
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '0.85rem 1rem', color: '#4B5563', whiteSpace: 'nowrap' }}>
                    {formatDate(exp.expenseDate)}
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#171717', whiteSpace: 'nowrap' }}>
                    {formatINR(exp.amount)}
                  </td>

                  {/* Receipt Preview Attachment */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {exp.receiptDataUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewReceiptUrl(exp.receiptDataUrl || null)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 7px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #BFDBFE',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>
                    ) : exp.receiptFileName ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        backgroundColor: '#F3F4F6',
                        color: '#4B5563',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        <Paperclip size={11} />
                        <span>{exp.receiptFileName.endsWith('.pdf') ? 'PDF' : 'Receipt'}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#D1D5DB' }}>None</span>
                    )}
                  </td>

                  {/* Status (incorporates reimbursement workflow if applicable) */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {exp.isReimbursement || exp.category === 'Employee reimbursements' ? (
                      <div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: exp.reimbursementStatus === 'Approved' ? '#EFF6FF' :
                                           exp.reimbursementStatus === 'Reimbursed' ? '#F0FDF4' :
                                           exp.reimbursementStatus === 'Rejected' ? '#FEF2F2' : '#FFFBEB',
                          color: exp.reimbursementStatus === 'Approved' ? '#1D4ED8' :
                                 exp.reimbursementStatus === 'Reimbursed' ? '#15803D' :
                                 exp.reimbursementStatus === 'Rejected' ? '#B91C1C' : '#B45309'
                        }}>
                          {exp.reimbursementStatus || 'Pending Approval'}
                        </span>
                        {exp.reimbursementRejectionReason && (
                          <div style={{ fontSize: '10px', color: '#DC2626', marginTop: '2px' }}>
                            {exp.reimbursementRejectionReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge status={exp.status} />
                    )}
                  </td>

                  {/* Actions (Approve/Reject Reimbursement or Standard CRUD) */}
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Reimbursement Specific Action Buttons */}
                      {(exp.isReimbursement || exp.category === 'Employee reimbursements') && (
                        <>
                          {(!exp.reimbursementStatus || exp.reimbursementStatus === 'Pending Approval') && (
                            <>
                              <button
                                type="button"
                                onClick={() => approveExpenseClaim(exp.id)}
                                title="Approve Claim"
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#15803D',
                                  cursor: 'pointer'
                                }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReimburseRejectExpense(exp);
                                  setRejectReason('');
                                }}
                                title="Reject Claim"
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#DC2626',
                                  cursor: 'pointer'
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {exp.reimbursementStatus === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => markClaimReimbursed(exp.id)}
                              title="Mark Reimbursed"
                              style={{
                                padding: '2px 6px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#1D4ED8',
                                cursor: 'pointer'
                              }}
                            >
                              Mark Reimbursed
                            </button>
                          )}
                        </>
                      )}

                      {/* Standard Expense Actions */}
                      {(!exp.isReimbursement && exp.category !== 'Employee reimbursements' && exp.status !== 'Paid') && (
                        <button
                          type="button"
                          onClick={() => updateExpense(exp.id, { status: 'Paid' })}
                          title="Mark as Paid"
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#15803D',
                            cursor: 'pointer'
                          }}
                        >
                          Mark Paid
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedExpenseForDetail(exp)}
                        title="View Details"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(exp)}
                        title="Edit Expense"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateExpense(exp.id)}
                        title="Duplicate"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmExpense(exp)}
                        title="Delete"
                        style={{ padding: '4px', color: '#EF4444', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#737373' }}>
                    <Wallet size={32} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 600, color: '#171717', marginBottom: '4px' }}>No expenses found</p>
                    <p style={{ fontSize: '13px', marginBottom: '1rem' }}>
                      No records matched your search and active filters.
                    </p>
                    <button
                      type="button"
                      onClick={openAddModal}
                      style={{
                        padding: '0.45rem 1rem',
                        backgroundColor: '#171717',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      + Log First Expense
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingExpense ? `Edit Expense: ${editingExpense.expenseNumber}` : "Log New Business Expense"}
        subtitle="Record corporate disbursements, software licenses, project gear, or team reimbursements."
        maxWidth="680px"
      >
        <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Expense Title *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Midjourney Pro + ChatGPT Team Subscription"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13.5px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Expense Category *</label>
              <select 
                value={formCategory}
                onChange={(e) => {
                  const cat = e.target.value as ExpenseCategory;
                  setFormCategory(cat);
                  if (cat === 'Employee reimbursements') {
                    setFormIsReimbursement(true);
                  }
                }}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              >
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Vendor or Recipient *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. OpenAI Inc / Reliance Jio / Freelance Animator"
                value={formVendor}
                onChange={(e) => setFormVendor(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Project & Department Linking */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Project / Client Association</label>
              <select
                value={formProjectId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setFormProjectId(selectedId);
                  const matched = availableProjects.find(p => p.id === selectedId);
                  setFormProjectTitle(matched ? matched.title : '');
                }}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              >
                <option value="">General Corporate / Overhead (No Project)</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Department</label>
              <select
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              >
                <option value="Creative">Creative</option>
                <option value="Production">Production</option>
                <option value="Marketing">Marketing</option>
                <option value="Technology">Technology</option>
                <option value="Operations">Operations</option>
                <option value="Management">Management</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Amount in INR (₹) *</label>
              <input 
                type="number" 
                required
                min={1}
                placeholder="0"
                value={formAmount || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormAmount(val);
                  setFormTaxAmount(Math.round(val * 0.18));
                }}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>GST / Tax (₹)</label>
              <input 
                type="number" 
                value={formTaxAmount || ''}
                onChange={(e) => setFormTaxAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Expense Date *</label>
              <input 
                type="date" 
                required
                value={formExpenseDate}
                onChange={(e) => setFormExpenseDate(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Method</label>
              <select 
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              >
                <option value="Corporate Credit Card">Corporate Credit Card</option>
                <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Reference / UTR</label>
              <input 
                type="text" 
                placeholder="UTR26101902..."
                value={formPaymentRef}
                onChange={(e) => setFormPaymentRef(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Status</label>
              <select 
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Outstanding">Outstanding</option>
              </select>
            </div>
          </div>

          {/* Reimbursement Specific Toggle */}
          <div style={{ padding: '0.85rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#171717' }}>
              <input 
                type="checkbox"
                checked={formIsReimbursement}
                onChange={(e) => setFormIsReimbursement(e.target.checked)}
              />
              <span>This is an Employee Reimbursement Claim</span>
            </label>

            {formIsReimbursement && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563' }}>Employee / Claimant Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Sarah Jenkins (Lead Designer)"
                  value={formEmployeeName}
                  onChange={(e) => setFormEmployeeName(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px', fontSize: '12.5px' }}
                />
              </div>
            )}
          </div>

          {/* Recurrence Options */}
          <div style={{ padding: '0.85rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#171717' }}>
              <input 
                type="checkbox"
                checked={formIsRecurring}
                onChange={(e) => setFormIsRecurring(e.target.checked)}
              />
              <span>This is a recurring subscription or periodic contract</span>
            </label>

            {formIsRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Frequency</label>
                  <select 
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value as any)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px', fontSize: '12.5px' }}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Next Due Date</label>
                  <input 
                    type="date"
                    value={formRecurringNextDue}
                    onChange={(e) => setFormRecurringNextDue(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px', fontSize: '12.5px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>End / Expiry Date</label>
                  <input 
                    type="date"
                    value={formRecurringEndDate}
                    onChange={(e) => setFormRecurringEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px', fontSize: '12.5px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Receipt Attachment UI */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '4px' }}>
              Receipt / Tax Invoice Attachment
            </label>
            {formReceiptName ? (
              <div style={{
                padding: '0.65rem 0.85rem',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                backgroundColor: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip size={15} color="#2563EB" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>{formReceiptName}</span>
                  <span style={{ fontSize: '11.5px', color: '#6B7280' }}>({formReceiptSize || 'Document'})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {formReceiptDataUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptUrl(formReceiptDataUrl)}
                      style={{ border: 'none', background: 'transparent', color: '#2563EB', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      View
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFormReceiptName('');
                      setFormReceiptSize('');
                      setFormReceiptDataUrl('');
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem',
                border: '1px dashed #D1D5DB',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#FAFAFA'
              }}>
                <UploadCloud size={24} color="#9CA3AF" />
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#171717', marginTop: '4px' }}>
                  Click to select invoice/receipt file
                </span>
                <span style={{ fontSize: '11px', color: '#737373' }}>PDF, PNG, JPG (Local preview state)</span>
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Internal Notes</label>
            <textarea 
              rows={2}
              placeholder="e.g. Billed under Q3 performance campaign budget approved by Director."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#374151', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1.25rem', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reimbursement Rejection Modal (Item 4) */}
      {reimburseRejectExpense && (
        <Modal
          isOpen={Boolean(reimburseRejectExpense)}
          onClose={() => setReimburseRejectExpense(null)}
          title="Reject Reimbursement Claim"
          subtitle={`Claimant: ${reimburseRejectExpense.employeeName || reimburseRejectExpense.vendorOrEmployee} — ${formatINR(reimburseRejectExpense.amount)}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '13px', color: '#4B5563' }}>
              Please provide a clear reason for rejecting this claim. This explanation will be recorded in the expense audit register.
            </p>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#171717' }}>Rejection Reason *</label>
              <textarea 
                rows={3}
                required
                placeholder="e.g. Missing GST tax receipt, personal item included, or outside approved project budget."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', border: '1px solid #E5E7EB', borderRadius: '6px', marginTop: '4px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setReimburseRejectExpense(null)}
                style={{ padding: '0.45rem 0.85rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReason.trim()) {
                    alert("Please provide a reason for rejecting the reimbursement.");
                    return;
                  }
                  rejectExpenseClaim(reimburseRejectExpense.id, rejectReason.trim());
                  setReimburseRejectExpense(null);
                }}
                style={{ padding: '0.45rem 1rem', backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receipt Image Preview Modal */}
      {previewReceiptUrl && (
        <Modal
          isOpen={Boolean(previewReceiptUrl)}
          onClose={() => setPreviewReceiptUrl(null)}
          title="Attached Receipt Preview"
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {previewReceiptUrl.startsWith('data:image/') ? (
              <img 
                src={previewReceiptUrl} 
                alt="Receipt Preview" 
                style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '6px', objectFit: 'contain', border: '1px solid #E5E7EB' }} 
              />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '6px', width: '100%' }}>
                <FileText size={48} color="#2563EB" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#171717' }}>PDF Document Attached</p>
                <p style={{ fontSize: '12px', color: '#6B7280' }}>PDF preview is supported via standard download / viewer.</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreviewReceiptUrl(null)}
              style={{ padding: '0.45rem 1.25rem', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Close Preview
            </button>
          </div>
        </Modal>
      )}

      {/* Expense Detail Slide-Over / Modal */}
      {selectedExpenseForDetail && (
        <Modal
          isOpen={Boolean(selectedExpenseForDetail)}
          onClose={() => setSelectedExpenseForDetail(null)}
          title={`Expense: ${selectedExpenseForDetail.title}`}
          subtitle={`Identifier: ${selectedExpenseForDetail.expenseNumber || selectedExpenseForDetail.id}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Amount Incurred</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#171717', marginTop: '2px' }}>
                  {formatINR(selectedExpenseForDetail.amount)}
                </div>
                <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                  Tax Component: {formatINR(selectedExpenseForDetail.taxAmount || 0)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Payment / Claim Status</span>
                <div style={{ marginTop: '4px' }}>
                  <Badge status={selectedExpenseForDetail.status} />
                </div>
                <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px' }}>
                  Method: {selectedExpenseForDetail.paymentMethod}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Vendor / Payee</span>
                <div style={{ fontWeight: 600, color: '#171717', marginTop: '2px' }}>{selectedExpenseForDetail.vendorOrEmployee}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>Category: {selectedExpenseForDetail.category}</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Dates & Recurrence</span>
                <div style={{ fontWeight: 600, color: '#171717', marginTop: '2px' }}>{formatDate(selectedExpenseForDetail.expenseDate)}</div>
                <div style={{ fontSize: '12px', color: selectedExpenseForDetail.isRecurring ? '#2563EB' : '#6B7280' }}>
                  {selectedExpenseForDetail.isRecurring ? `Recurring (${selectedExpenseForDetail.recurrence || 'Monthly'})` : 'One-Time Transaction'}
                </div>
              </div>
            </div>

            {selectedExpenseForDetail.projectTitle && (
              <div style={{ padding: '0.65rem', backgroundColor: '#EFF6FF', borderRadius: '4px', fontSize: '12px', color: '#1D4ED8' }}>
                <strong>Linked Project / Quote:</strong> {selectedExpenseForDetail.projectTitle}
              </div>
            )}

            {selectedExpenseForDetail.paymentReference && (
              <div style={{ padding: '0.65rem', backgroundColor: '#F3F4F6', borderRadius: '4px', fontSize: '12px' }}>
                <strong>Bank / Transaction Reference:</strong> {selectedExpenseForDetail.paymentReference}
              </div>
            )}

            {selectedExpenseForDetail.notes && (
              <div>
                <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Internal Notes</span>
                <p style={{ fontSize: '13px', color: '#374151', marginTop: '3px' }}>{selectedExpenseForDetail.notes}</p>
              </div>
            )}

            {selectedExpenseForDetail.receiptFileName && (
              <div style={{
                padding: '0.75rem',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFFFFF'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Paperclip size={16} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{selectedExpenseForDetail.receiptFileName}</div>
                    <div style={{ fontSize: '11px', color: '#737373' }}>Attached Receipt / Invoice ({selectedExpenseForDetail.receiptFileSize || 'Doc'})</div>
                  </div>
                </div>
                {selectedExpenseForDetail.receiptDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedExpenseForDetail.receiptDataUrl;
                      setSelectedExpenseForDetail(null);
                      setPreviewReceiptUrl(url || null);
                    }}
                    style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    View Receipt
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  const exp = selectedExpenseForDetail;
                  setSelectedExpenseForDetail(null);
                  openEditModal(exp);
                }}
                style={{ padding: '0.45rem 0.85rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#171717', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  duplicateExpense(selectedExpenseForDetail.id);
                  setSelectedExpenseForDetail(null);
                }}
                style={{ padding: '0.45rem 0.85rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#FFFFFF', color: '#171717', cursor: 'pointer' }}
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => setSelectedExpenseForDetail(null)}
                style={{ padding: '0.45rem 1rem', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpense && (
        <Modal
          isOpen={Boolean(deleteConfirmExpense)}
          onClose={() => setDeleteConfirmExpense(null)}
          title="Delete Expense Record"
          subtitle={`Are you sure you want to permanently remove "${deleteConfirmExpense.title}"?`}
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '13px', color: '#4B5563' }}>
              This will remove the expense from all financial summaries and cost calculations. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                style={{ padding: '0.45rem 0.85rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, backgroundColor: '#FFFFFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteExpense(deleteConfirmExpense.id);
                  setDeleteConfirmExpense(null);
                }}
                style={{ padding: '0.45rem 1rem', backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Delete Expense
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
