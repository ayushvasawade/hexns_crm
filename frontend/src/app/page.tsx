'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  FileText,
  DollarSign,
  Users,
  CreditCard,
  Layers,
  ChevronRight
} from 'lucide-react';
import styles from './page.module.css';
import { useCrm } from '../context/CrmContext';
import { formatINR, formatDate } from '../lib/formatters';
import { 
  calculateFinancialMetrics, 
  buildDynamicMonthlyChartData, 
  isDateInRange 
} from '../lib/financialCalculations';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export default function DashboardPage() {
  const { clients, quotations, invoices, payments, services, expenses, addClient, recordPayment } = useCrm();
  const [dateRange, setDateRange] = useState('All Time');

  // Modals for Quick Actions
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Quick Client Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientBrand, setNewClientBrand] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientMobile, setNewClientMobile] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientGstin, setNewClientGstin] = useState('');
  const [newClientState, setNewClientState] = useState('Maharashtra');

  // Quick Payment Form State
  const [payInvoiceId, setPayInvoiceId] = useState(invoices[0]?.id || '');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');

  // Filter records by selected date range
  const filteredQuotations = React.useMemo(() => {
    return quotations.filter(q => isDateInRange(q.quotationDate, dateRange));
  }, [quotations, dateRange]);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(inv => isDateInRange(inv.invoiceDate, dateRange));
  }, [invoices, dateRange]);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(exp => isDateInRange(exp.expenseDate, dateRange));
  }, [expenses, dateRange]);

  // Centralized Financial Metrics (Taxable Revenue base, GST excluded from profit)
  const metrics = React.useMemo(() => {
    return calculateFinancialMetrics(filteredInvoices, filteredExpenses, filteredQuotations, services);
  }, [filteredInvoices, filteredExpenses, filteredQuotations, services]);

  const totalQuotesCount = filteredQuotations.length;
  const pendingQuotesCount = filteredQuotations.filter(q => q.status === 'Sent' || q.status === 'Viewed' || q.status === 'Draft').length;
  const acceptedQuotesCount = filteredQuotations.filter(q => q.status === 'Accepted' || q.status === 'Converted').length;

  const paidInvoicesCount = filteredInvoices.filter(inv => inv.status === 'Paid').length;
  const partialInvoicesCount = filteredInvoices.filter(inv => inv.status === 'Partially Paid').length;
  const overdueInvoicesCount = filteredInvoices.filter(inv => inv.status === 'Overdue').length;

  const avgQuotationValue = totalQuotesCount > 0 
    ? filteredQuotations.reduce((acc, q) => acc + q.grandTotal, 0) / totalQuotesCount 
    : 0;

  const conversionRate = totalQuotesCount > 0 
    ? Math.round((acceptedQuotesCount / totalQuotesCount) * 100) 
    : 0;

  // Dynamic monthly chart data
  const monthlyChartData = React.useMemo(() => {
    const raw = buildDynamicMonthlyChartData(invoices, expenses);
    // Show months with activity or up to last 6 months
    const activeMonths = raw.filter(m => m.taxableRevenue > 0 || m.expenses > 0 || m.collected > 0);
    return activeMonths.length >= 3 ? activeMonths.slice(-6) : raw.slice(2, 8); // Apr - Sep baseline
  }, [invoices, expenses]);

  // Dynamic Service Category Breakdown from actual invoiced line items
  const serviceCategoryBreakdown = React.useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
      inv.lineItems?.forEach(li => {
        const cat = li.category || 'General Deliverables';
        catMap[cat] = (catMap[cat] || 0) + (li.taxableAmount || li.lineSubtotal || 0);
      });
    });

    const totalCatRevenue = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        share: Math.round((amount / totalCatRevenue) * 100)
      }))
      .sort((a, b) => b.amount - a.amount);

    return sorted.length > 0 ? sorted.slice(0, 5) : [
      { name: 'No services billed in period', amount: 0, share: 0 }
    ];
  }, [filteredInvoices]);

  // Handle Quick Add Client
  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    await addClient({
      legalEntityName: newClientName,
      brandTradeName: newClientBrand || newClientName,
      primaryContactPerson: newClientContact || "Account Lead",
      officialPhone: "+91 22 2800 0000",
      mobile: newClientMobile || "+91 98000 00000",
      billingEmail: newClientEmail || "accounts@client.com",
      registeredAddress: "Commercial Tower, Andheri East",
      city: "Mumbai",
      state: newClientState,
      pinCode: "400069",
      gstRegistered: Boolean(newClientGstin),
      gstin: newClientGstin || "27AABCT0000A1Z5",
      pan: newClientGstin ? newClientGstin.substring(2, 12) : "AABCT0000A",
      stateCode: newClientState === 'Maharashtra' ? '27' : '29',
      placeOfSupply: `${newClientState} (${newClientState === 'Maharashtra' ? '27' : '29'})`,
      reverseCharge: false,
      taxExempt: false,
      clientSegment: 'One-Off',
      industryCategory: 'General Business',
      assignedAccountLead: 'Vikram Malhotra',
      defaultPaymentTerms: '50% Advance + 50% Before Delivery',
      status: 'Active'
    });
    setShowAddClientModal(false);
    setNewClientName('');
    setNewClientBrand('');
    setNewClientContact('');
    setNewClientMobile('');
    setNewClientEmail('');
    setNewClientGstin('');
  };

  // Handle Quick Payment
  const handleQuickAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoices.find(i => i.id === payInvoiceId);
    if (!inv || !payAmount) return;
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    await recordPayment({
      clientId: inv.clientId,
      invoiceId: inv.id,
      amount: amountNum,
      paymentDate: payDate,
      paymentMode: "NEFT / RTGS / IMPS",
      transactionReference: payRef || `UTR-${Date.now().toString().slice(-6)}`,
      internalNotes: "Quick payment logged via dashboard."
    });

    setShowAddPaymentModal(false);
    setPayAmount('');
    setPayRef('');
  };

  const selectedInvForPayment = invoices.find(i => i.id === payInvoiceId);

  return (
    <div className={styles.dashboard}>
      {/* Top Header & Actions */}
      <div className={styles.topBar}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Finance & Sales Overview</h1>
          <p className={styles.subtitle}>
            HEXNS Mediaworks billing performance, cash collections, and pipeline analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select 
            className={styles.dateFilter}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option>All Time</option>
            <option>This Quarter (Q3 2026)</option>
            <option>Last 30 Days</option>
            <option>This Financial Year (FY 26-27)</option>
          </select>

          <div className={styles.quickActions}>
            <button 
              onClick={() => setShowAddClientModal(true)} 
              className={styles.actionBtn}
            >
              <Users size={14} />
              <span>+ New Client</span>
            </button>
            <Link href="/quotations/new" className={`${styles.actionBtn} ${styles.primaryAction}`}>
              <Plus size={14} />
              <span>+ New Quotation</span>
            </Link>
            <Link href="/invoices/new" className={styles.actionBtn}>
              <FileText size={14} />
              <span>+ New Invoice</span>
            </Link>
            <button 
              onClick={() => setShowAddPaymentModal(true)} 
              className={styles.actionBtn}
            >
              <CreditCard size={14} />
              <span>+ Add Payment</span>
            </button>
            <Link href="/services" className={styles.actionBtn}>
              <Layers size={14} />
              <span>+ Add Service</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (8 Cards including Gross Profit & Employee Expenses) */}
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Sales (Won)</span>
            <TrendingUp size={16} color="var(--success)" />
          </div>
          <div className={styles.kpiValue}>{formatINR(metrics.totalSalesWon)}</div>
          <div className={`${styles.kpiSub} ${styles.kpiSubPositive}`}>
            {acceptedQuotesCount} accepted quotations
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Taxable Revenue</span>
            <FileText size={16} color="var(--accent)" />
          </div>
          <div className={styles.kpiValue}>{formatINR(metrics.totalTaxableRevenue)}</div>
          <div className={styles.kpiSub}>
            Excl. {formatINR(metrics.totalGstOutput)} GST liability
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Collected</span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div className={styles.kpiValue}>{formatINR(metrics.totalCollections)}</div>
          <div className={`${styles.kpiSub} ${styles.kpiSubPositive}`}>
            {metrics.totalInvoicedGross > 0 ? `${Math.round((metrics.totalCollections / metrics.totalInvoicedGross) * 100)}% collections` : '0%'}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Total Outstanding</span>
            <Clock size={16} color={metrics.totalOutstanding > 0 ? "var(--warning)" : "var(--text-muted)"} />
          </div>
          <div className={styles.kpiValue}>{formatINR(metrics.totalOutstanding)}</div>
          <div className={`${styles.kpiSub} ${metrics.overdueAmount > 0 ? styles.kpiSubNegative : ''}`}>
            {metrics.overdueAmount > 0 ? `${formatINR(metrics.overdueAmount)} Overdue` : 'Zero overdue'}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Operating Expenses</span>
            <AlertCircle size={16} color="var(--danger)" />
          </div>
          <div className={styles.kpiValue} style={{ color: 'var(--danger)' }}>{formatINR(metrics.totalOperatingExpenses)}</div>
          <div className={styles.kpiSub}>
            {filteredExpenses.length} expense vouchers logged
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Employee Expenses</span>
            <Users size={16} color="#7C3AED" />
          </div>
          <div className={styles.kpiValue} style={{ color: '#7C3AED' }}>{formatINR(metrics.employeeExpenses)}</div>
          <div className={styles.kpiSub}>
            Salaries, claims & benefits
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Estimated Gross Profit</span>
            <TrendingUp size={16} color={metrics.grossProfit >= 0 ? "var(--success)" : "var(--danger)"} />
          </div>
          <div className={styles.kpiValue} style={{ color: metrics.grossProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatINR(metrics.grossProfit)}
          </div>
          <div className={styles.kpiSub}>
            {metrics.grossMarginPercent}% Gross Margin
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span>Net Operating Profit</span>
            <DollarSign size={16} color={metrics.netProfit >= 0 ? "var(--success)" : "var(--danger)"} />
          </div>
          <div className={styles.kpiValue} style={{ color: metrics.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatINR(metrics.netProfit)}
          </div>
          <div className={`${styles.kpiSub} ${styles.kpiSubPositive}`}>
            {metrics.netMarginPercent}% Net Margin (on Taxable Rev)
          </div>
        </div>
      </div>

      {/* Secondary KPI Strip */}
      <div className={styles.secondaryKpiGrid}>
        <div className={styles.smallKpiCard}>
          <span className={styles.smallKpiLabel}>Total Quotations</span>
          <span className={styles.smallKpiValue}>{totalQuotesCount}</span>
        </div>
        <div className={styles.smallKpiCard}>
          <span className={styles.smallKpiLabel}>Pending Quotes</span>
          <span className={styles.smallKpiValue}>{pendingQuotesCount}</span>
        </div>
        <div className={styles.smallKpiCard}>
          <span className={styles.smallKpiLabel}>Accepted Quotes</span>
          <span className={styles.smallKpiValue}>{acceptedQuotesCount}</span>
        </div>
        <div className={styles.smallKpiCard}>
          <span className={styles.smallKpiLabel}>Paid Invoices</span>
          <span className={styles.smallKpiValue}>{paidInvoicesCount}</span>
        </div>
        <div className={styles.smallKpiCard}>
          <span className={styles.smallKpiLabel}>Partially Paid</span>
          <span className={styles.smallKpiValue}>{partialInvoicesCount}</span>
        </div>
        <div className={styles.smallKpiCard}>
          <span className={styles.smallKpiLabel}>Avg Quote Value</span>
          <span className={styles.smallKpiValue}>{formatINR(avgQuotationValue)}</span>
        </div>
      </div>

      {/* Charts & Visualizations */}
      <div className={styles.chartsGrid}>
        {/* Dynamic Monthly Revenue vs Expenses & Profit Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h2 className={styles.chartTitle}>Monthly Revenue vs Expenses & Profit</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Financial Year 2026-27 (Dynamic Records)</span>
            </div>
            <div className={styles.chartLegend}>
              <span><span className={styles.legendDot} style={{ backgroundColor: '#171717' }} /> Taxable Rev</span>
              <span><span className={styles.legendDot} style={{ backgroundColor: '#DC2626' }} /> Expenses</span>
              <span><span className={styles.legendDot} style={{ backgroundColor: '#15803D' }} /> Profit</span>
            </div>
          </div>

          {/* Clean Dynamic SVG Bar Chart */}
          <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
            {(() => {
              const maxVal = Math.max(1, ...monthlyChartData.map(d => Math.max(d.taxableRevenue, d.expenses, Math.abs(d.netProfit))));
              return monthlyChartData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                  <div style={{ width: '100%', display: 'flex', gap: '3px', alignItems: 'flex-end', justifyContent: 'center', height: '160px' }}>
                    {/* Taxable Revenue Bar */}
                    <div 
                      title={`Revenue (${d.monthLabel}): ${formatINR(d.taxableRevenue)}`}
                      style={{ 
                        width: '12px', 
                        height: `${Math.max(4, (d.taxableRevenue / maxVal) * 100)}%`, 
                        backgroundColor: '#171717', 
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease'
                      }} 
                    />
                    {/* Expenses Bar */}
                    <div 
                      title={`Expenses (${d.monthLabel}): ${formatINR(d.expenses)}`}
                      style={{ 
                        width: '12px', 
                        height: `${Math.max(4, (d.expenses / maxVal) * 100)}%`, 
                        backgroundColor: '#DC2626', 
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease'
                      }} 
                    />
                    {/* Profit Bar */}
                    <div 
                      title={`Net Profit (${d.monthLabel}): ${formatINR(d.netProfit)}`}
                      style={{ 
                        width: '12px', 
                        height: `${Math.max(4, (Math.max(0, d.netProfit) / maxVal) * 100)}%`, 
                        backgroundColor: '#15803D', 
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease'
                      }} 
                    />
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{d.monthLabel}</span>
                </div>
              ));
            })()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Taxable Rev: <strong>{formatINR(metrics.totalTaxableRevenue)}</strong></span>
            <span>Operating Burn: <strong style={{ color: '#DC2626' }}>{formatINR(metrics.totalOperatingExpenses)}</strong></span>
            <span>Net EBITDA: <strong style={{ color: '#15803D' }}>{formatINR(metrics.netProfit)}</strong></span>
          </div>
        </div>

        {/* Breakdown Card: Conversion Rate & Category Revenue */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h2 className={styles.chartTitle}>Pipeline & Category Revenue</h2>
          </div>

          {/* Conversion Gauge Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              border: '5px solid var(--accent)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              color: 'var(--text-primary)'
            }}>
              {conversionRate}%
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Win Conversion Rate</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {acceptedQuotesCount} of {totalQuotesCount} bids approved in period
              </div>
            </div>
          </div>

          {/* Revenue by Top Service Verticals (Dynamic) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Billed Revenue by Service Vertical
            </span>
            {serviceCategoryBreakdown.map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 500 }}>{cat.name}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatINR(cat.amount)} ({cat.share}%)</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.share}%`, height: '100%', backgroundColor: idx === 0 ? '#171717' : idx === 1 ? '#2563EB' : idx === 2 ? '#10B981' : '#F59E0B' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Section: Recent Quotes & Recent Invoices */}
      <div className={styles.tablesGrid}>
        {/* Recent Quotations Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Recent Quotations</h2>
            <Link href="/quotations" className={styles.viewAllLink}>
              View All ({quotations.length}) →
            </Link>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Client</th>
                  <th>Grand Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#737373', fontSize: '13px' }}>
                      No quotations created yet. Click <strong>+ New Quotation</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  quotations.slice(0, 4).map(q => (
                    <tr key={q.id}>
                      <td>
                        <Link href={`/quotations/${q.id}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {q.quotationNumber}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(q.quotationDate)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{q.clientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.projectTitle}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatINR(q.grandTotal)}</td>
                      <td>
                        <Badge status={q.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Recent Invoices</h2>
            <Link href="/invoices" className={styles.viewAllLink}>
              View All ({invoices.length}) →
            </Link>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#737373', fontSize: '13px' }}>
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.slice(0, 4).map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <Link href={`/invoices/${inv.id}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {inv.invoiceNumber}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Due: {formatDate(inv.dueDate)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{inv.clientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total: {formatINR(inv.grandTotal)}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: inv.balanceDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {formatINR(inv.balanceDue)}
                      </td>
                      <td>
                        <Badge status={inv.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Second Tables Section: Recent Payments & Overdue Accounts */}
      <div className={styles.tablesGrid}>
        {/* Recent Payment Receipts */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Recent Collections / Receipts</h2>
            <Link href="/payments" className={styles.viewAllLink}>
              View Ledger ({payments.length}) →
            </Link>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Client</th>
                  <th>Mode / Ref</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#737373', fontSize: '13px' }}>
                      No payment receipts logged yet.
                    </td>
                  </tr>
                ) : (
                  payments.slice(0, 4).map(p => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 600, color: '#171717' }}>{p.paymentNumber}</span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.clientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Against {p.invoiceNumber}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 500 }}>{p.paymentMode}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.transactionReference}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Client Accounts */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Overdue & Outstanding Accounts</h2>
            <Link href="/invoices" className={styles.viewAllLink}>
              View All Invoices →
            </Link>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Invoice #</th>
                  <th>Due Date</th>
                  <th>Outstanding</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.filter(i => i.balanceDue > 0).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#15803D', fontSize: '13px', fontWeight: 600 }}>
                      ✓ All client accounts are fully settled. Zero overdue receivables!
                    </td>
                  </tr>
                ) : (
                  invoices.filter(i => i.balanceDue > 0).slice(0, 4).map(inv => (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.clientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inv.projectTitle}</div>
                      </td>
                      <td>
                        <Link href={`/invoices/${inv.id}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td style={{ fontSize: '12px', color: inv.status === 'Overdue' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: inv.status === 'Overdue' ? 600 : 400 }}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                        {formatINR(inv.balanceDue)}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setPayInvoiceId(inv.id);
                            setPayAmount(String(inv.balanceDue));
                            setShowAddPaymentModal(true);
                          }}
                          style={{
                            padding: '3px 8px',
                            backgroundColor: '#171717',
                            color: '#FFFFFF',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Add Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title="Quick Add Client"
        subtitle="Create a new client entity with GST and Place of Supply."
      >
        <form onSubmit={handleQuickAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Legal Entity Name *
            </label>
            <input 
              type="text" 
              required
              placeholder="e.g. Apex Consumer Brands Pvt Ltd"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Brand / Trade Name</label>
              <input 
                type="text" 
                placeholder="Apex Living"
                value={newClientBrand}
                onChange={(e) => setNewClientBrand(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Contact Person</label>
              <input 
                type="text" 
                placeholder="Ramesh Pillai"
                value={newClientContact}
                onChange={(e) => setNewClientContact(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile Phone</label>
              <input 
                type="text" 
                placeholder="+91 98200 11223"
                value={newClientMobile}
                onChange={(e) => setNewClientMobile(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Billing Email</label>
              <input 
                type="email" 
                placeholder="finance@apex.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>GSTIN (15 characters)</label>
              <input 
                type="text" 
                placeholder="27AAAPL1234F1Z8"
                maxLength={15}
                value={newClientGstin}
                onChange={(e) => setNewClientGstin(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Place of Supply State</label>
              <select 
                value={newClientState}
                onChange={(e) => setNewClientState(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value="Maharashtra">Maharashtra (27 - Intra-State CGST/SGST)</option>
                <option value="Karnataka">Karnataka (29 - Inter-State IGST)</option>
                <option value="Gujarat">Gujarat (24 - Inter-State IGST)</option>
                <option value="Delhi">Delhi (07 - Inter-State IGST)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowAddClientModal(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Save Client
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Payment Modal */}
      <Modal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        title="Record Client Payment"
        subtitle="Log a receipt and automatically decrement the invoice balance."
      >
        <form onSubmit={handleQuickAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Select Unpaid Invoice *
            </label>
            <select 
              value={payInvoiceId}
              onChange={(e) => setPayInvoiceId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            >
              {invoices.filter(i => i.balanceDue > 0).map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} — {i.clientName} (Due: {formatINR(i.balanceDue)})
                </option>
              ))}
            </select>
          </div>

          {selectedInvForPayment && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', fontSize: '12.5px' }}>
              <div>Client: <strong>{selectedInvForPayment.clientName}</strong></div>
              <div>Invoice Total: {formatINR(selectedInvForPayment.grandTotal)} | Already Paid: {formatINR(selectedInvForPayment.amountPaid)}</div>
              <div style={{ color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                Remaining Balance: {formatINR(selectedInvForPayment.balanceDue)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Amount (₹) *</label>
              <input 
                type="number" 
                required
                placeholder="47200"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Date</label>
              <input 
                type="date" 
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Transaction Reference / UTR
            </label>
            <input 
              type="text" 
              placeholder="e.g. HDFC9821092837 or UPI Ref"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowAddPaymentModal(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
