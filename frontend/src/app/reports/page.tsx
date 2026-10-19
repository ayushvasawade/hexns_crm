'use client';

import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Download, 
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { formatINR, formatDate } from '../../lib/formatters';
import { calculateFinancialMetrics, isDateInRange } from '../../lib/financialCalculations';
import { generateReportPDF, generateExcelWorkbook } from '../../lib/exportUtils';

export default function ReportsPage() {
  const { invoices, quotations, expenses, clients, settings } = useCrm();

  const [dateRange, setDateRange] = useState('this_year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('All');
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'service_profit' | 'sales' | 'pipeline' | 'collections' | 'gst' | 'expenses'>('pnl');

  // Filtered invoices, quotations & expenses based on date & client
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesClient = selectedClientFilter === 'All' || inv.clientId === selectedClientFilter;
      const matchesDate = isDateInRange(inv.invoiceDate, dateRange, customStartDate, customEndDate);
      return matchesClient && matchesDate;
    });
  }, [invoices, selectedClientFilter, dateRange, customStartDate, customEndDate]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesClient = selectedClientFilter === 'All' || q.clientId === selectedClientFilter;
      const dateToCheck = q.quotationDate || q.createdAt?.slice(0, 10) || '';
      const matchesDate = isDateInRange(dateToCheck, dateRange, customStartDate, customEndDate);
      return matchesClient && matchesDate;
    });
  }, [quotations, selectedClientFilter, dateRange, customStartDate, customEndDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      return isDateInRange(e.expenseDate, dateRange, customStartDate, customEndDate);
    });
  }, [expenses, dateRange, customStartDate, customEndDate]);

  // Consistent Financial Aggregates using shared calculation utility
  const metrics = useMemo(() => {
    return calculateFinancialMetrics(filteredInvoices, filteredExpenses, filteredQuotations);
  }, [filteredInvoices, filteredExpenses, filteredQuotations]);

  // Actual Line-Item Aggregation by Service Category & Service (Item 7)
  const serviceWiseReport = useMemo(() => {
    const serviceMap: Record<string, {
      name: string;
      category: string;
      quantity: number;
      taxableRevenue: number;
      discountGiven: number;
      invoicesCount: number;
      hasCostData: boolean;
    }> = {};

    filteredInvoices.forEach(inv => {
      if (inv.lineItems && Array.isArray(inv.lineItems)) {
        inv.lineItems.forEach(item => {
          const key = item.serviceName || item.description || 'Custom Deliverable';
          if (!serviceMap[key]) {
            serviceMap[key] = {
              name: key,
              category: item.category || 'General Creative Deliverables',
              quantity: 0,
              taxableRevenue: 0,
              discountGiven: 0,
              invoicesCount: 0,
              hasCostData: false
            };
          }
          serviceMap[key].quantity += item.quantity || 1;
          serviceMap[key].taxableRevenue += item.taxableAmount || (item.quantity * item.defaultPrice);
          serviceMap[key].discountGiven += item.itemDiscountAmount || 0;
          serviceMap[key].invoicesCount += 1;
        });
      }
    });

    return Object.values(serviceMap).sort((a, b) => b.taxableRevenue - a.taxableRevenue);
  }, [filteredInvoices]);

  // Category-level breakdown aggregated from actual line items
  const categoryWiseBreakdown = useMemo(() => {
    const catMap: Record<string, { category: string; revenue: number; itemsCount: number }> = {};
    serviceWiseReport.forEach(s => {
      if (!catMap[s.category]) {
        catMap[s.category] = { category: s.category, revenue: 0, itemsCount: 0 };
      }
      catMap[s.category].revenue += s.taxableRevenue;
      catMap[s.category].itemsCount += s.quantity;
    });
    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
  }, [serviceWiseReport]);

  // Quotation metrics
  const totalBidsCount = filteredQuotations.length;
  const wonBidsCount = filteredQuotations.filter(q => q.status === 'Accepted' || q.status === 'Converted').length;
  const lostBidsCount = filteredQuotations.filter(q => q.status === 'Rejected').length;
  const underReviewCount = filteredQuotations.filter(q => q.status === 'Sent' || q.status === 'Viewed' || q.status === 'Draft').length;
  const conversionRate = totalBidsCount > 0 ? Math.round((wonBidsCount / totalBidsCount) * 100) : 0;
  const winLossRatio = lostBidsCount > 0 ? (wonBidsCount / lostBidsCount).toFixed(1) : `${wonBidsCount}:0`;

  // Aged Debtors calculation
  const now = new Date().getTime();
  const agingCurrent = filteredInvoices.filter(i => {
    if (i.balanceDue <= 0) return false;
    const diffDays = (now - new Date(i.dueDate).getTime()) / (1000 * 3600 * 24);
    return diffDays <= 30;
  }).reduce((acc, i) => acc + i.balanceDue, 0);

  const aging31to60 = filteredInvoices.filter(i => {
    if (i.balanceDue <= 0) return false;
    const diffDays = (now - new Date(i.dueDate).getTime()) / (1000 * 3600 * 24);
    return diffDays > 30 && diffDays <= 60;
  }).reduce((acc, i) => acc + i.balanceDue, 0);

  const aging60Plus = filteredInvoices.filter(i => {
    if (i.balanceDue <= 0) return false;
    const diffDays = (now - new Date(i.dueDate).getTime()) / (1000 * 3600 * 24);
    return diffDays > 60;
  }).reduce((acc, i) => acc + i.balanceDue, 0);

  // Dynamic GST Reconciliation derived strictly from invoice data (Item 8)
  const gstSummary = useMemo(() => {
    let intraStateTaxableTurnover = 0;
    let interStateTaxableTurnover = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let intraStateInvoiceCount = 0;
    let interStateInvoiceCount = 0;

    filteredInvoices.forEach(inv => {
      const isInterState = (inv.igstAmount || 0) > 0;
      if (isInterState) {
        interStateTaxableTurnover += inv.totalTaxableAmount;
        totalIgst += inv.igstAmount || 0;
        interStateInvoiceCount += 1;
      } else {
        intraStateTaxableTurnover += inv.totalTaxableAmount;
        totalCgst += inv.cgstAmount || 0;
        totalSgst += inv.sgstAmount || 0;
        intraStateInvoiceCount += 1;
      }
    });

    const totalCollected = totalCgst + totalSgst + totalIgst;
    const eligibleItc = filteredExpenses.reduce((acc, e) => acc + (e.taxAmount || 0), 0);
    const netGstPayable = Math.max(0, totalCollected - eligibleItc);

    return {
      intraStateTaxableTurnover,
      interStateTaxableTurnover,
      totalCgst,
      totalSgst,
      totalIgst,
      totalCollected,
      eligibleItc,
      netGstPayable,
      intraStateInvoiceCount,
      interStateInvoiceCount
    };
  }, [filteredInvoices, filteredExpenses]);

  // Export to Real Excel (.xlsx) (Item 11)
  const handleExportExcel = () => {
    if (activeReportTab === 'pnl') {
      const headers = ['Section', 'Financial Component', 'Amount (INR)', 'Notes'];
      const rows = [
        ['1. Revenue', 'Total Taxable Billings (excl GST)', metrics.totalTaxableRevenue, 'Core agency income'],
        ['1. Revenue', 'Gross Total Invoiced (incl GST)', metrics.totalInvoicedGross, 'Total receivables billed'],
        ['2. Direct Costs', 'Project Direct Costs', metrics.directProjectCosts, 'Freelancers, shoot equipment & project expenses'],
        ['3. Gross Profit', 'Estimated Gross Profit', metrics.grossProfit, 'Taxable Revenue minus Direct Costs'],
        ['4. Operations', 'Total Operating Expenses', metrics.totalOperatingExpenses, 'Salaries, SaaS, marketing & overhead'],
        ['5. Net Profit', 'Net Operating Profit (EBITDA)', metrics.netProfit, 'Taxable Revenue minus Operating Expenses'],
        ['6. Margins', 'Net Profit Margin %', `${metrics.netMarginPercent}%`, 'Derived from taxable revenue base']
      ];
      generateExcelWorkbook('HEXNS_Profit_and_Loss_Report', [{ sheetName: 'P&L Statement', headers, rows }]);
    } else if (activeReportTab === 'service_profit') {
      const headers = ['Service Deliverable', 'Category', 'Units Billed', 'Taxable Revenue (INR)', 'Discounts (INR)', 'Invoice Count'];
      const rows = serviceWiseReport.map(s => [
        s.name,
        s.category,
        s.quantity,
        s.taxableRevenue,
        s.discountGiven,
        s.invoicesCount
      ]);
      generateExcelWorkbook('HEXNS_Service_Profitability_Report', [{ sheetName: 'Service Breakdown', headers, rows }]);
    } else if (activeReportTab === 'gst') {
      const headers = ['Tax Component', 'Rate', 'Taxable Turnover (INR)', 'Tax Collected (INR)', 'Invoices Count'];
      const rows = [
        ['Central GST (CGST)', '9%', gstSummary.intraStateTaxableTurnover, gstSummary.totalCgst, gstSummary.intraStateInvoiceCount],
        ['State GST (SGST)', '9%', gstSummary.intraStateTaxableTurnover, gstSummary.totalSgst, gstSummary.intraStateInvoiceCount],
        ['Integrated GST (IGST)', '18%', gstSummary.interStateTaxableTurnover, gstSummary.totalIgst, gstSummary.interStateInvoiceCount],
        ['Total Output GST', '—', metrics.totalTaxableRevenue, gstSummary.totalCollected, filteredInvoices.length],
        ['Input Tax Credit (ITC)', '—', 0, gstSummary.eligibleItc, filteredExpenses.length],
        ['Net Payable to Govt', '—', 0, gstSummary.netGstPayable, 0]
      ];
      generateExcelWorkbook('HEXNS_GSTR1_Tax_Report', [{ sheetName: 'GSTR-1 Summary', headers, rows }]);
    } else if (activeReportTab === 'sales') {
      const headers = ['Client Entity', 'Trade Name', 'Place of Supply', 'Taxable Base (INR)', 'Gross Billed (INR)', 'Collected (INR)', 'Balance Due (INR)', 'Invoices Count'];
      const rows = clients.map(c => {
        const cInvs = filteredInvoices.filter(i => i.clientId === c.id);
        const billed = cInvs.reduce((acc, i) => acc + i.grandTotal, 0);
        const taxable = cInvs.reduce((acc, i) => acc + i.totalTaxableAmount, 0);
        const paid = cInvs.reduce((acc, i) => acc + i.amountPaid, 0);
        const due = cInvs.reduce((acc, i) => acc + i.balanceDue, 0);
        return [c.legalEntityName, c.brandTradeName || c.legalEntityName, c.placeOfSupply, taxable, billed, paid, due, cInvs.length];
      });
      generateExcelWorkbook('HEXNS_Client_Sales_Report', [{ sheetName: 'Client Sales', headers, rows }]);
    } else if (activeReportTab === 'pipeline') {
      const headers = ['Quotation #', 'Client Name', 'Project Title', 'Valid Until', 'Grand Total (INR)', 'Status'];
      const rows = filteredQuotations.map(q => [
        q.quotationNumber,
        q.clientName,
        q.projectTitle,
        q.validUntil,
        q.grandTotal,
        q.status
      ]);
      generateExcelWorkbook('HEXNS_Pipeline_Report', [{ sheetName: 'Quotation Pipeline', headers, rows }]);
    } else if (activeReportTab === 'collections') {
      const headers = ['Invoice #', 'Client Name', 'Invoice Date', 'Due Date', 'Grand Total (INR)', 'Collected (INR)', 'Balance Due (INR)', 'Status'];
      const rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        inv.clientName,
        inv.invoiceDate,
        inv.dueDate,
        inv.grandTotal,
        inv.amountPaid,
        inv.balanceDue,
        inv.status
      ]);
      generateExcelWorkbook('HEXNS_Collections_Aging_Report', [{ sheetName: 'Collections & Aging', headers, rows }]);
    } else {
      const headers = ['Expense ID', 'Title', 'Category', 'Payee', 'Date', 'Amount (INR)', 'Tax Credit (INR)', 'Payment Method', 'Status'];
      const rows = filteredExpenses.map(e => [
        e.expenseNumber || e.id,
        e.title,
        e.category,
        e.vendorOrEmployee,
        e.expenseDate,
        e.amount,
        e.taxAmount,
        e.paymentMethod,
        e.status
      ]);
      generateExcelWorkbook('HEXNS_Operating_Expenses_Report', [{ sheetName: 'Expenses', headers, rows }]);
    }
  };

  // Export to Real PDF (Item 10)
  const handleExportPDF = () => {
    let title = 'Financial Performance & P&L Statement';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    const summaryData: Record<string, number | string> = {
      'Taxable Revenue': formatINR(metrics.totalTaxableRevenue),
      'Operating Costs': formatINR(metrics.totalOperatingExpenses),
      'Net Profit': formatINR(metrics.netProfit),
      'Net Margin': `${metrics.netMarginPercent}%`
    };

    if (activeReportTab === 'pnl') {
      title = 'Profit & Loss Statement (Taxable Revenue Basis)';
      headers = ['Category', 'Financial Component', 'Taxable Revenue (₹)', 'Expenses (₹)', 'Net (₹)'];
      rows = [
        ['Revenue', 'Taxable Billings (excl GST)', metrics.totalTaxableRevenue, 0, metrics.totalTaxableRevenue],
        ['Direct Costs', 'Direct Project Expenses', 0, metrics.directProjectCosts, -metrics.directProjectCosts],
        ['Gross Profit', 'Estimated Gross Profit', metrics.totalTaxableRevenue, metrics.directProjectCosts, metrics.grossProfit],
        ['Operating Costs', 'Salaries, Tools, Rent & Overhead', 0, metrics.totalOperatingExpenses, -metrics.totalOperatingExpenses],
        ['Net Operating Profit', 'EBITDA Equivalent', metrics.totalTaxableRevenue, metrics.totalOperatingExpenses, metrics.netProfit]
      ];
    } else if (activeReportTab === 'service_profit') {
      title = 'Service-Wise Revenue & Billing Performance';
      headers = ['Service Deliverable', 'Category', 'Units Billed', 'Taxable Revenue (₹)', 'Discounts (₹)'];
      rows = serviceWiseReport.map(s => [s.name, s.category, s.quantity, s.taxableRevenue, s.discountGiven]);
    } else if (activeReportTab === 'gst') {
      title = 'GSTR-1 Tax Summary & Liability Statement';
      headers = ['Tax Head', 'Rate', 'Taxable Base Turnover (₹)', 'Tax Collected (₹)', 'Invoices'];
      rows = [
        ['Central GST (CGST)', '9%', gstSummary.intraStateTaxableTurnover, gstSummary.totalCgst, gstSummary.intraStateInvoiceCount],
        ['State GST (SGST)', '9%', gstSummary.intraStateTaxableTurnover, gstSummary.totalSgst, gstSummary.intraStateInvoiceCount],
        ['Integrated GST (IGST)', '18%', gstSummary.interStateTaxableTurnover, gstSummary.totalIgst, gstSummary.interStateInvoiceCount],
        ['Total Output GST', '—', metrics.totalTaxableRevenue, gstSummary.totalCollected, filteredInvoices.length]
      ];
    } else if (activeReportTab === 'sales') {
      title = 'Client-Wise Billings & Receivables Ledger';
      headers = ['Client Entity', 'Place of Supply', 'Taxable Base (₹)', 'Gross Billed (₹)', 'Collected (₹)', 'Due (₹)'];
      rows = clients.map(c => {
        const cInvs = filteredInvoices.filter(i => i.clientId === c.id);
        const taxable = cInvs.reduce((acc, i) => acc + i.totalTaxableAmount, 0);
        const billed = cInvs.reduce((acc, i) => acc + i.grandTotal, 0);
        const paid = cInvs.reduce((acc, i) => acc + i.amountPaid, 0);
        const due = cInvs.reduce((acc, i) => acc + i.balanceDue, 0);
        return [c.legalEntityName, c.placeOfSupply, taxable, billed, paid, due];
      });
    } else if (activeReportTab === 'pipeline') {
      title = 'Quotation Pipeline & Conversion Report';
      headers = ['Quotation #', 'Client Name', 'Project Title', 'Valid Until', 'Bid Amount (₹)', 'Status'];
      rows = filteredQuotations.map(q => [q.quotationNumber, q.clientName, q.projectTitle, q.validUntil, q.grandTotal, q.status]);
    } else if (activeReportTab === 'collections') {
      title = 'Collections Register & Aged Receivables';
      headers = ['Invoice #', 'Client Name', 'Due Date', 'Total (₹)', 'Collected (₹)', 'Balance Due (₹)', 'Status'];
      rows = filteredInvoices.map(i => [i.invoiceNumber, i.clientName, i.dueDate, i.grandTotal, i.amountPaid, i.balanceDue, i.status]);
    } else {
      title = 'Operating Expenses Audit Register';
      headers = ['Expense ID', 'Title', 'Category', 'Payee', 'Date', 'Amount (₹)', 'Status'];
      rows = filteredExpenses.map(e => [e.expenseNumber || e.id, e.title, e.category, e.vendorOrEmployee, e.expenseDate, e.amount, e.status]);
    }

    const dateLabel = dateRange === 'custom' ? `${customStartDate} to ${customEndDate}` : dateRange.replace('_', ' ').toUpperCase();
    generateReportPDF(title, dateLabel, summaryData, headers, rows, settings);
  };

  // CSV Fallback export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const dateStr = new Date().toISOString().split('T')[0];

    if (activeReportTab === 'pnl') {
      headers = ['Category', 'Component', 'Taxable Revenue', 'Operating Expense', 'Net EBITDA'];
      rows = [
        ['1. Revenue', 'Total Taxable Billings', metrics.totalTaxableRevenue, 0, metrics.totalTaxableRevenue],
        ['2. Direct Costs', 'Project Direct Costs', 0, metrics.directProjectCosts, -metrics.directProjectCosts],
        ['3. Operations', 'Salaries, Tools & Overhead', 0, metrics.totalOperatingExpenses, -metrics.totalOperatingExpenses],
        ['4. Net Profit', 'Net Operating Profit', metrics.totalTaxableRevenue, metrics.totalOperatingExpenses, metrics.netProfit]
      ];
    } else if (activeReportTab === 'service_profit') {
      headers = ['Service Deliverable', 'Category', 'Units Billed', 'Taxable Revenue', 'Discounts'];
      rows = serviceWiseReport.map(s => [`"${s.name}"`, `"${s.category}"`, s.quantity, s.taxableRevenue, s.discountGiven]);
    } else if (activeReportTab === 'gst') {
      headers = ['Tax Head', 'Applicable Rate', 'Taxable Base Turnover', 'Tax Collected'];
      rows = [
        ['Central GST (CGST)', '9%', gstSummary.intraStateTaxableTurnover, gstSummary.totalCgst],
        ['State GST (SGST)', '9%', gstSummary.intraStateTaxableTurnover, gstSummary.totalSgst],
        ['Integrated GST (IGST)', '18%', gstSummary.interStateTaxableTurnover, gstSummary.totalIgst],
        ['Total Output GST', '—', metrics.totalTaxableRevenue, gstSummary.totalCollected]
      ];
    } else if (activeReportTab === 'sales') {
      headers = ['Client Entity', 'Place of Supply', 'Gross Billed (INR)', 'Collected (INR)', 'Balance Due (INR)'];
      rows = clients.map(c => {
        const cInvs = filteredInvoices.filter(i => i.clientId === c.id);
        const billed = cInvs.reduce((acc, i) => acc + i.grandTotal, 0);
        const paid = cInvs.reduce((acc, i) => acc + i.amountPaid, 0);
        const due = cInvs.reduce((acc, i) => acc + i.balanceDue, 0);
        return [`"${c.legalEntityName}"`, `"${c.placeOfSupply}"`, billed, paid, due];
      });
    } else if (activeReportTab === 'pipeline') {
      headers = ['Quotation #', 'Client Name', 'Project Title', 'Valid Until', 'Grand Total', 'Status'];
      rows = filteredQuotations.map(q => [q.quotationNumber, `"${q.clientName}"`, `"${q.projectTitle}"`, q.validUntil, q.grandTotal, q.status]);
    } else if (activeReportTab === 'collections') {
      headers = ['Invoice #', 'Client Name', 'Invoice Date', 'Due Date', 'Grand Total', 'Collected', 'Balance Due', 'Status'];
      rows = filteredInvoices.map(inv => [inv.invoiceNumber, `"${inv.clientName}"`, inv.invoiceDate, inv.dueDate, inv.grandTotal, inv.amountPaid, inv.balanceDue, inv.status]);
    } else {
      headers = ['Expense Title', 'Category', 'Vendor / Payee', 'Amount', 'Tax Credit (ITC)', 'Status'];
      rows = filteredExpenses.map(e => [`"${e.title}"`, `"${e.category}"`, `"${e.vendorOrEmployee}"`, e.amount, e.taxAmount, e.status]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HEXNS_${activeReportTab.toUpperCase()}_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Financial Reports & Tax Intelligence
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Verified financial health, P&L statements, service profitability, dynamic GSTR-1, and aged receivables.
          </p>
        </div>

        {/* Global Filter & Export Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Functional Date Range Selector */}
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', background: '#FFFFFF', color: '#171717' }}
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">FY 2026-27 (YTD)</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {dateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)} 
                style={{ padding: '0.3rem 0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }} 
              />
              <span style={{ fontSize: '11px', color: '#737373' }}>to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)} 
                style={{ padding: '0.3rem 0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px' }} 
              />
            </div>
          )}

          {/* Client Entity Filter */}
          <select 
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', background: '#FFFFFF', color: '#171717' }}
          >
            <option value="All">All Client Entities</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.brandTradeName || c.legalEntityName}</option>
            ))}
          </select>

          {/* Real Export Actions */}
          <button 
            type="button"
            onClick={handleExportPDF}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              color: '#171717',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FileText size={14} color="#DC2626" />
            <span>PDF Export</span>
          </button>

          <button 
            type="button"
            onClick={handleExportExcel}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              color: '#171717',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={14} color="#15803D" />
            <span>Excel (.xlsx)</span>
          </button>

          <button 
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Confidentiality Warning Strip */}
      <div style={{
        padding: '0.65rem 1rem',
        backgroundColor: '#FFFBEB',
        border: '1px solid #FEF3C7',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        fontSize: '12.5px',
        color: '#B45309'
      }}>
        <ShieldAlert size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Financial Integrity Notice:</strong> Collected GST is statutory output tax liability owed to the government and is excluded from business revenue and profit calculations.
        </span>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.25rem', overflowX: 'auto' }}>
        {[
          { id: 'pnl', label: '1. Profit & Loss (P&L)' },
          { id: 'service_profit', label: '2. Service Profitability' },
          { id: 'sales', label: '3. Sales & Billings' },
          { id: 'pipeline', label: '4. Quotation Pipeline' },
          { id: 'collections', label: '5. Collections & Aging' },
          { id: 'gst', label: '6. GST Summary (GSTR-1)' },
          { id: 'expenses', label: '7. Operating Expenses' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveReportTab(tab.id as any)}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '13px',
              fontWeight: activeReportTab === tab.id ? 700 : 500,
              color: activeReportTab === tab.id ? '#171717' : '#737373',
              borderBottom: activeReportTab === tab.id ? '2px solid #171717' : 'none',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROFIT & LOSS */}
      {activeReportTab === 'pnl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Executive Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Net Revenue (Taxable)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#171717', marginTop: '2px' }}>
                {formatINR(metrics.totalTaxableRevenue)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#15803D' }}>Excludes ₹{formatINR(metrics.totalGstOutput).replace('₹', '')} GST</span>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Direct Project Costs</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                {formatINR(metrics.directProjectCosts)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Linked project expenses</span>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Gross Profit</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: metrics.grossProfit >= 0 ? '#15803D' : '#DC2626', marginTop: '2px' }}>
                {formatINR(metrics.grossProfit)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#2563EB' }}>Gross Margin: {metrics.grossMarginPercent}%</span>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Total Operating Expenses</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                {formatINR(metrics.totalOperatingExpenses)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Salaries, rent, SaaS & tools</span>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Net Operating Profit (EBITDA)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: metrics.netProfit >= 0 ? '#15803D' : '#DC2626', marginTop: '2px' }}>
                {formatINR(metrics.netProfit)}
              </div>
              <span style={{ fontSize: '11.5px', color: '#15803D' }}>Net Margin: {metrics.netMarginPercent}%</span>
            </div>
          </div>

          {/* Consolidated Income Statement Table */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginBottom: '1rem' }}>
              Consolidated Income Statement (Aggregated from actual records)
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                  <td style={{ padding: '8px 12px' }}>1. Operating Income / Agency Billings (excl. GST)</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatINR(metrics.totalTaxableRevenue)}</td>
                </tr>

                {/* Actual Service Category Breakdown */}
                {categoryWiseBreakdown.map((cat, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 24px', color: '#4B5563' }}>• {cat.category} ({cat.itemsCount} deliverables)</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right' }}>{formatINR(cat.revenue)}</td>
                  </tr>
                ))}

                {categoryWiseBreakdown.length === 0 && (
                  <tr>
                    <td style={{ padding: '6px 24px', color: '#737373' }}>• No invoice items found in this date period</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right' }}>₹0</td>
                  </tr>
                )}

                <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                  <td style={{ padding: '8px 12px', color: '#DC2626' }}>2. Operating Expenses & Cost of Services</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#DC2626' }}>− {formatINR(metrics.totalOperatingExpenses)}</td>
                </tr>
                {filteredExpenses.slice(0, 6).map((exp, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '6px 24px', color: '#4B5563' }}>• {exp.title} ({exp.category})</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right' }}>{formatINR(exp.amount)}</td>
                  </tr>
                ))}

                <tr style={{ borderTop: '2px solid #171717', borderBottom: '2px solid #171717', fontWeight: 800, fontSize: '14px' }}>
                  <td style={{ padding: '10px 12px' }}>Net Operating Profit (EBITDA)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: metrics.netProfit >= 0 ? '#15803D' : '#DC2626' }}>
                    {formatINR(metrics.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICE-WISE PROFITABILITY (Item 7) */}
      {activeReportTab === 'service_profit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Service-Wise Revenue & Pricing Analysis
                </h2>
                <p style={{ fontSize: '12px', color: '#737373', margin: '2px 0 0' }}>
                  Aggregated from actual invoice line items without synthetic multipliers.
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#171717' }}>
                {serviceWiseReport.length} Unique Services Billed
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Service Deliverable</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Units Billed</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Taxable Revenue</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Discounts Given</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Cost Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceWiseReport.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '8px 12px', color: '#4B5563' }}>{item.category}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#171717' }}>
                        {formatINR(item.taxableRevenue)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: item.discountGiven > 0 ? '#DC2626' : '#9CA3AF' }}>
                        {item.discountGiven > 0 ? formatINR(item.discountGiven) : '₹0'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          backgroundColor: '#F3F4F6',
                          color: '#4B5563'
                        }}>
                          Internal cost not specified
                        </span>
                      </td>
                    </tr>
                  ))}
                  {serviceWiseReport.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                        No invoice line items found for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALES & BILLINGS */}
      {activeReportTab === 'sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Total Gross Billing</span>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>{formatINR(metrics.totalInvoicedGross)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Inclusive of 18% GST</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Realized Collections</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>{formatINR(metrics.totalCollections)}</div>
              <span style={{ fontSize: '11px', color: '#15803D' }}>{Math.round((metrics.totalCollections / (metrics.totalInvoicedGross || 1)) * 100)}% Collection Rate</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600 }}>Pending Receivables</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: metrics.totalOutstanding > 0 ? '#DC2626' : '#15803D', marginTop: '2px' }}>
                {formatINR(metrics.totalOutstanding)}
              </div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Unpaid client invoices</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: '14px' }}>
              Client-Wise Sales Breakdown
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Client Entity</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Place of Supply</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Taxable Base</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Invoiced</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Collected</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Balance Due</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const cInvs = filteredInvoices.filter(i => i.clientId === c.id);
                  const taxable = cInvs.reduce((acc, i) => acc + i.totalTaxableAmount, 0);
                  const billed = cInvs.reduce((acc, i) => acc + i.grandTotal, 0);
                  const paid = cInvs.reduce((acc, i) => acc + i.amountPaid, 0);
                  const due = cInvs.reduce((acc, i) => acc + i.balanceDue, 0);

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{c.legalEntityName}</div>
                        <div style={{ fontSize: '11.5px', color: '#737373' }}>{c.brandTradeName}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#4B5563' }}>{c.placeOfSupply}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatINR(taxable)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{formatINR(billed)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>{formatINR(paid)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: due > 0 ? '#DC2626' : '#15803D', fontWeight: 700 }}>{formatINR(due)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: due === 0 ? '#F0FDF4' : '#FEF2F2',
                          color: due === 0 ? '#15803D' : '#DC2626'
                        }}>
                          {due === 0 ? 'Clear' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PIPELINE & CONVERSION */}
      {activeReportTab === 'pipeline' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Quotation Conversion Pipeline & Win/Loss Ratio</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Total Bids Created</span>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{totalBidsCount}</div>
            </div>
            <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Accepted / Won</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803D' }}>{wonBidsCount}</div>
            </div>
            <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Under Review</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>{underReviewCount}</div>
            </div>
            <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Win Conversion</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803D' }}>{conversionRate}%</div>
            </div>
            <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Win/Loss Ratio</span>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#171717' }}>{winLossRatio}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Quotation #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Client & Project</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Valid Until</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Bid Amount</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>{q.quotationNumber}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{q.clientName}</div>
                      <div style={{ fontSize: '11.5px', color: '#737373' }}>{q.projectTitle}</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#4B5563' }}>{formatDate(q.validUntil)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{formatINR(q.grandTotal)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: q.status === 'Accepted' || q.status === 'Converted' ? '#F0FDF4' : q.status === 'Rejected' ? '#FEF2F2' : '#EFF6FF',
                        color: q.status === 'Accepted' || q.status === 'Converted' ? '#15803D' : q.status === 'Rejected' ? '#DC2626' : '#1D4ED8'
                      }}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COLLECTIONS & AGING */}
      {activeReportTab === 'collections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Aging Matrix Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Current (0 - 30 Days)</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>{formatINR(agingCurrent)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Within credit terms</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Past Due (31 - 60 Days)</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>{formatINR(aging31to60)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Follow-up notice sent</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Critical Overdue (60+ Days)</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>{formatINR(aging60Plus)}</div>
              <span style={{ fontSize: '11px', color: '#DC2626' }}>Escalated to management</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Total Receivables</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#171717', marginTop: '2px' }}>{formatINR(metrics.totalOutstanding)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Aged debtor sum</span>
            </div>
          </div>

          {/* Overdue Accounts Table */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '0.75rem' }}>Outstanding Invoices Register</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Invoice #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Client</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Due Date</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Bill</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance Due</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Aging</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const daysOver = Math.round((now - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24));
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '8px 12px' }}>{inv.clientName}</td>
                      <td style={{ padding: '8px 12px', color: '#4B5563' }}>{formatDate(inv.dueDate)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatINR(inv.grandTotal)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#15803D' }}>{formatINR(inv.amountPaid)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: inv.balanceDue > 0 ? '#DC2626' : '#15803D' }}>
                        {formatINR(inv.balanceDue)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {inv.balanceDue <= 0 ? (
                          <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>Settled</span>
                        ) : daysOver > 0 ? (
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>{daysOver}d Overdue</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>On Schedule</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: GST TAX RECONCILIATION (Derived from actual invoice data - Item 8) */}
      {activeReportTab === 'gst' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Total Output GST Invoiced</span>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{formatINR(gstSummary.totalCollected)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Across {filteredInvoices.length} invoices</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Eligible Input Tax Credit (ITC)</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>{formatINR(gstSummary.eligibleItc)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Paid on vendor bills</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Net GST Payable (Cash Ledger)</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>{formatINR(gstSummary.netGstPayable)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Output GST minus ITC</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Inter-State IGST Component</span>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{formatINR(gstSummary.totalIgst)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Outside Home State</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '0.75rem' }}>GSTR-1 Dynamic Tax Summary Table</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Tax Component</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Rate</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Taxable Turnover</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Tax Collected (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Invoices</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px' }}>Central GST (CGST) - Intra-State</td>
                  <td style={{ padding: '8px' }}>9%</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(gstSummary.intraStateTaxableTurnover)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatINR(gstSummary.totalCgst)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{gstSummary.intraStateInvoiceCount}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px' }}>State GST (SGST) - Intra-State</td>
                  <td style={{ padding: '8px' }}>9%</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(gstSummary.intraStateTaxableTurnover)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatINR(gstSummary.totalSgst)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{gstSummary.intraStateInvoiceCount}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px' }}>Integrated GST (IGST) - Inter-State</td>
                  <td style={{ padding: '8px' }}>18%</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(gstSummary.interStateTaxableTurnover)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatINR(gstSummary.totalIgst)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{gstSummary.interStateInvoiceCount}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #171717', fontWeight: 800 }}>
                  <td style={{ padding: '8px' }}>Total GST Liabilities</td>
                  <td style={{ padding: '8px' }}>—</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(metrics.totalTaxableRevenue)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(gstSummary.totalCollected)}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{filteredInvoices.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: OPERATING EXPENSES */}
      {activeReportTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Total Operating Costs</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>{formatINR(metrics.totalOperatingExpenses)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>All active expenses</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Input Tax Credit (ITC)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>{formatINR(gstSummary.eligibleItc)}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Eligible GST offsets</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600 }}>Total Expense Records</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#171717', marginTop: '2px' }}>{filteredExpenses.length}</div>
              <span style={{ fontSize: '11px', color: '#737373' }}>Matching active period</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: '14px' }}>
              Expenses by Category & Payee
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Expense Title</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Vendor / Staff</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount (INR)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>GST Credit</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{e.title}</td>
                    <td style={{ padding: '8px 12px', color: '#4B5563' }}>{e.category}</td>
                    <td style={{ padding: '8px 12px', color: '#171717' }}>{e.vendorOrEmployee}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{formatINR(e.amount)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#15803D' }}>{formatINR(e.taxAmount)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: e.status === 'Paid' ? '#F0FDF4' : '#FFFBEB',
                        color: e.status === 'Paid' ? '#15803D' : '#D97706'
                      }}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
