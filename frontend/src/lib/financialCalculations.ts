import { Invoice, Expense, Quotation, ServiceItem } from '../types/crm';

export type DateRangePreset = 
  | 'All Time'
  | 'This Month'
  | 'Last Month'
  | 'This Quarter'
  | 'This Financial Year (FY 26-27)'
  | 'Custom';

/**
 * Checks whether an ISO date string (YYYY-MM-DD) falls within the selected preset
 */
export function isDateInRange(
  dateStr: string | undefined, 
  preset: string, 
  customStart?: string, 
  customEnd?: string
): boolean {
  if (!dateStr) return false;
  if (preset === 'All Time' || !preset) return true;

  const d = new Date(dateStr);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  if (preset === 'This Month') {
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }

  if (preset === 'Last Month') {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
  }

  if (preset === 'This Quarter' || preset === 'This Quarter (Q3 2026)') {
    const currentQ = Math.floor(currentMonth / 3);
    const dQ = Math.floor(d.getMonth() / 3);
    return d.getFullYear() === currentYear && dQ === currentQ;
  }

  if (preset === 'This Financial Year (FY 26-27)' || preset === 'FY 2026-27 (YTD)') {
    // Indian FY runs from 1 April 2026 to 31 March 2027
    const fyStart = new Date('2026-04-01');
    const fyEnd = new Date('2027-03-31T23:59:59');
    return d >= fyStart && d <= fyEnd;
  }

  if (preset === 'Last 30 Days') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d >= thirtyDaysAgo && d <= now;
  }

  if (preset === 'Custom' && (customStart || customEnd)) {
    if (customStart && d < new Date(customStart)) return false;
    if (customEnd && d > new Date(customEnd + 'T23:59:59')) return false;
    return true;
  }

  return true;
}

export interface FinancialMetrics {
  // Sales & Billings
  totalSalesWon: number; // Accepted & converted quotations grandTotal
  totalInvoicedGross: number; // Invoices grandTotal (incl. GST)
  totalTaxableRevenue: number; // Invoices totalTaxableAmount (EXCLUDING GST)
  totalGstOutput: number; // CGST + SGST + IGST
  totalCollections: number; // Amount paid by clients
  totalOutstanding: number; // Balance due
  overdueAmount: number; // Balance due on overdue invoices

  // Expenses & Costs
  totalOperatingExpenses: number; // All expenses
  employeeExpenses: number; // Salaries, reimbursements, employer-side contributions
  directProjectCosts: number; // Shoot expenses, equipment rentals, freelancers, line-item internal costs
  inputTaxCredit: number; // GST paid on expense vouchers

  // Profitability (Calculated strictly from Taxable Revenue EXCLUDING GST)
  grossProfit: number; // Taxable Revenue - Direct Project Costs
  grossMarginPercent: number; // (Gross Profit / Taxable Revenue) * 100
  netProfit: number; // Taxable Revenue - Total Operating Expenses
  netMarginPercent: number; // (Net Profit / Taxable Revenue) * 100
}

/**
 * Standard centralized financial formula calculator
 * Never treats collected GST as revenue or profit.
 */
export function calculateFinancialMetrics(
  invoices: Invoice[],
  expenses: Expense[],
  quotations: Quotation[],
  servicesList?: ServiceItem[]
): FinancialMetrics {
  // Sales / Quotations
  const totalSalesWon = quotations
    .filter(q => q.status === 'Accepted' || q.status === 'Converted')
    .reduce((acc, q) => acc + q.grandTotal, 0);

  // Invoices
  const totalInvoicedGross = invoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const totalTaxableRevenue = invoices.reduce((acc, i) => acc + (i.totalTaxableAmount || 0), 0);
  const totalGstOutput = invoices.reduce((acc, i) => acc + (i.cgstAmount + i.sgstAmount + i.igstAmount), 0);
  const totalCollections = invoices.reduce((acc, i) => acc + (i.amountPaid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.balanceDue || 0), 0);

  const overdueAmount = invoices
    .filter(i => i.status === 'Overdue')
    .reduce((acc, i) => acc + (i.balanceDue || 0), 0);

  // Expenses
  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const inputTaxCredit = expenses.reduce((acc, e) => acc + (e.taxAmount || 0), 0);

  // Employee Costs: Salaries + Reimbursements + Employer Contributions
  const employeeExpenses = expenses
    .filter(e => 
      e.category === 'Employee salaries' || 
      e.category === 'Employee reimbursements' || 
      e.category === 'Employer-side contributions (PF, ESIC, Insurance)' ||
      Boolean(e.isReimbursement)
    )
    .reduce((acc, e) => acc + e.amount, 0);

  // Direct Project Costs: Freelancers + Shoot equipment + Internal cost prices of invoiced services
  const directExpenseCosts = expenses
    .filter(e => 
      e.category === 'Contractor and freelancer payments' || 
      e.category === 'Shoot expenses and equipment rentals' ||
      Boolean(e.projectId)
    )
    .reduce((acc, e) => acc + e.amount, 0);

  // Also accumulate internalCostPrice from invoiced line items where present
  let lineItemsDirectCost = 0;
  invoices.forEach(inv => {
    inv.lineItems?.forEach(li => {
      // Find service definition if internalCostPrice is missing
      let cost = li.minPrice ? Math.round(li.minPrice * 0.6) : 0;
      if (servicesList) {
        const srv = servicesList.find(s => s.id === li.serviceId || s.serviceName === li.serviceName);
        if (srv && srv.internalCostPrice) cost = srv.internalCostPrice;
      }
      lineItemsDirectCost += cost * (li.quantity || 1);
    });
  });

  const directProjectCosts = Math.max(directExpenseCosts, lineItemsDirectCost);

  // Profitability
  const grossProfit = totalTaxableRevenue - directProjectCosts;
  const grossMarginPercent = totalTaxableRevenue > 0 
    ? Math.round((grossProfit / totalTaxableRevenue) * 100) 
    : 0;

  const netProfit = totalTaxableRevenue - totalOperatingExpenses;
  const netMarginPercent = totalTaxableRevenue > 0 
    ? Math.round((netProfit / totalTaxableRevenue) * 100) 
    : 0;

  return {
    totalSalesWon,
    totalInvoicedGross,
    totalTaxableRevenue,
    totalGstOutput,
    totalCollections,
    totalOutstanding,
    overdueAmount,
    totalOperatingExpenses,
    employeeExpenses,
    directProjectCosts,
    inputTaxCredit,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netMarginPercent
  };
}

export interface MonthlyChartPoint {
  monthKey: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "Oct 26"
  taxableRevenue: number;
  invoicedGross: number;
  collected: number;
  expenses: number;
  netProfit: number;
}

/**
 * Builds dynamic monthly data points for charting across all invoices and expenses
 */
export function buildDynamicMonthlyChartData(
  invoices: Invoice[],
  expenses: Expense[]
): MonthlyChartPoint[] {
  // Collect all unique year-months from both datasets
  const monthMap: Record<string, {
    taxableRevenue: number;
    invoicedGross: number;
    collected: number;
    expenses: number;
    netProfit: number;
  }> = {};

  // Standard FY 26-27 base months so chart always has chronological baseline
  const baselineMonths = [
    '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', 
    '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03'
  ];

  baselineMonths.forEach(m => {
    monthMap[m] = { taxableRevenue: 0, invoicedGross: 0, collected: 0, expenses: 0, netProfit: 0 };
  });

  invoices.forEach(inv => {
    if (!inv.invoiceDate) return;
    const m = inv.invoiceDate.slice(0, 7);
    if (!monthMap[m]) {
      monthMap[m] = { taxableRevenue: 0, invoicedGross: 0, collected: 0, expenses: 0, netProfit: 0 };
    }
    monthMap[m].taxableRevenue += inv.totalTaxableAmount || 0;
    monthMap[m].invoicedGross += inv.grandTotal || 0;
    monthMap[m].collected += inv.amountPaid || 0;
  });

  expenses.forEach(exp => {
    if (!exp.expenseDate) return;
    const m = exp.expenseDate.slice(0, 7);
    if (!monthMap[m]) {
      monthMap[m] = { taxableRevenue: 0, invoicedGross: 0, collected: 0, expenses: 0, netProfit: 0 };
    }
    monthMap[m].expenses += exp.amount || 0;
  });

  // Calculate net profit per month
  Object.keys(monthMap).forEach(m => {
    monthMap[m].netProfit = monthMap[m].taxableRevenue - monthMap[m].expenses;
  });

  // Sort chronologically and take up to current months or active months
  const sortedKeys = Object.keys(monthMap).sort();

  return sortedKeys.map(k => {
    const [year, month] = k.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('en-IN', { month: 'short' }) + ' ' + year.slice(-2);

    return {
      monthKey: k,
      monthLabel,
      taxableRevenue: monthMap[k].taxableRevenue,
      invoicedGross: monthMap[k].invoicedGross,
      collected: monthMap[k].collected,
      expenses: monthMap[k].expenses,
      netProfit: monthMap[k].netProfit
    };
  });
}
