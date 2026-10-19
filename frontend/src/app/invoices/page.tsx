'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Eye, 
  CreditCard, 
  Copy, 
  Printer, 
  XCircle, 
  AlertCircle,
  CheckCircle2,
  FileText,
  Download
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { Invoice, InvoiceStatus } from '../../types/crm';
import { formatINR, formatDate } from '../../lib/formatters';
import { isDateInRange } from '../../lib/financialCalculations';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, updateInvoiceStatus, recordPayment, addInvoice } = useCrm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Add Payment Modal State
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<any>('NEFT / RTGS / IMPS');
  const [payRef, setPayRef] = useState('');

  // Filter Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.projectTitle.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const matchesDate = isDateInRange(inv.invoiceDate, dateRangeFilter, customStartDate, customEndDate);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleDuplicate = (inv: Invoice) => {
    const count = invoices.length + 48;
    const newNum = `HEX/26-27/INV-${String(count).padStart(4, '0')}`;
    const newInv = addInvoice({
      ...inv,
      invoiceNumber: newNum,
      invoiceDate: new Date().toISOString().split('T')[0],
      amountPaid: 0,
      balanceDue: inv.grandTotal,
      status: 'Draft'
    });
    router.push(`/invoices/${newInv.id}`);
  };

  const handleExportCSV = () => {
    const headers = ['Invoice #', 'Quotation #', 'Client Name', 'Project Title', 'Invoice Date', 'Due Date', 'Taxable Base', 'Total GST', 'Grand Total', 'Amount Paid', 'Balance Due', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.quotationNumber || '—',
      `"${inv.clientName.replace(/"/g, '""')}"`,
      `"${inv.projectTitle.replace(/"/g, '""')}"`,
      inv.invoiceDate,
      inv.dueDate,
      inv.totalTaxableAmount,
      inv.cgstAmount + inv.sgstAmount + inv.igstAmount,
      inv.grandTotal,
      inv.amountPaid,
      inv.balanceDue,
      inv.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HEXNS_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoiceForPayment) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordPayment({
      clientId: activeInvoiceForPayment.clientId,
      invoiceId: activeInvoiceForPayment.id,
      amount: amt,
      paymentDate: payDate,
      paymentMode: payMode,
      transactionReference: payRef || `UTR-${Date.now().toString().slice(-6)}`,
      internalNotes: "Settlement logged via Invoices directory."
    });

    setActiveInvoiceForPayment(null);
    setPayAmount('');
    setPayRef('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Tax Invoices & Accounts Receivable
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Issue GST-compliant tax invoices, track collections, and manage outstanding balances.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #E5E7EB',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <Link 
            href="/invoices/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <Plus size={15} />
            <span>+ New Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        backgroundColor: '#FFFFFF',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={15} color="#9CA3AF" />
          <input 
            type="text" 
            placeholder="Search invoice #, client name, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
          />
        </div>

        {/* Date Filter & Status Pill Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select 
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            style={{ padding: '0.35rem 0.65rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#171717', backgroundColor: '#FFFFFF' }}
          >
            <option value="all">All Dates</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This FY (2026-27)</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRangeFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)} 
                style={{ padding: '0.25rem 0.4rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11px' }} 
              />
              <span style={{ fontSize: '11px', color: '#737373' }}>to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)} 
                style={{ padding: '0.25rem 0.4rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11px' }} 
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {['All', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Draft'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: statusFilter === st ? 600 : 500,
                  backgroundColor: statusFilter === st ? '#171717' : '#F9FAFB',
                  color: statusFilter === st ? '#FFFFFF' : '#4B5563',
                  border: '1px solid',
                  borderColor: statusFilter === st ? '#171717' : '#E5E7EB',
                  cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
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
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Invoice #</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Client & Project</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Invoice Date</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Due Date</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Grand Total</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Amount Paid</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Balance Due</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => (
                <tr 
                  key={inv.id}
                  style={{ borderBottom: '1px solid #F3F4F6' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Link href={`/invoices/${inv.id}`} style={{ fontWeight: 700, color: '#2563EB' }}>
                      {inv.invoiceNumber}
                    </Link>
                    {inv.quotationNumber && (
                      <div style={{ fontSize: '11px', color: '#737373' }}>From {inv.quotationNumber}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: '#171717' }}>{inv.clientName}</div>
                    <div style={{ fontSize: '11.5px', color: '#737373' }}>{inv.projectTitle}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#4B5563' }}>
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: inv.status === 'Overdue' ? '#DC2626' : '#4B5563', fontWeight: inv.status === 'Overdue' ? 600 : 400 }}>
                    {formatDate(inv.dueDate)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#171717' }}>
                    {formatINR(inv.grandTotal)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#15803D', fontWeight: 600 }}>
                    {formatINR(inv.amountPaid)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: inv.balanceDue > 0 ? '#DC2626' : '#15803D' }}>
                    {formatINR(inv.balanceDue)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Badge status={inv.status} />
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Link 
                        href={`/invoices/${inv.id}`}
                        title="View / Print Tax Invoice"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px' }}
                      >
                        <Eye size={15} />
                      </Link>

                      {inv.balanceDue > 0 && (
                        <button 
                          onClick={() => {
                            setActiveInvoiceForPayment(inv);
                            setPayAmount(String(inv.balanceDue));
                          }}
                          title="Record Payment"
                          style={{
                            padding: '3px 8px',
                            backgroundColor: '#15803D',
                            color: '#FFFFFF',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CreditCard size={12} />
                          <span>Pay</span>
                        </button>
                      )}

                      <button 
                        onClick={() => handleDuplicate(inv)}
                        title="Duplicate Invoice"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px' }}
                      >
                        <Copy size={14} />
                      </button>

                      {inv.status !== 'Cancelled' && (
                        <button 
                          onClick={() => updateInvoiceStatus(inv.id, 'Cancelled')}
                          title="Cancel Invoice"
                          style={{ padding: '4px', color: '#9CA3AF', borderRadius: '4px' }}
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {activeInvoiceForPayment && (
        <Modal
          isOpen={Boolean(activeInvoiceForPayment)}
          onClose={() => setActiveInvoiceForPayment(null)}
          title={`Record Payment for ${activeInvoiceForPayment.invoiceNumber}`}
          subtitle={`Client: ${activeInvoiceForPayment.clientName}`}
        >
          <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px' }}>
              <div>Invoice Total: <strong>{formatINR(activeInvoiceForPayment.grandTotal)}</strong></div>
              <div>Already Collected: <strong style={{ color: '#15803D' }}>{formatINR(activeInvoiceForPayment.amountPaid)}</strong></div>
              <div style={{ color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
                Outstanding Due: {formatINR(activeInvoiceForPayment.balanceDue)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Amount (₹) *</label>
                <input 
                  type="number"
                  required
                  max={activeInvoiceForPayment.balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Date</label>
                <input 
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Mode</label>
                <select 
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                >
                  <option>NEFT / RTGS / IMPS</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Reference / UTR #</label>
                <input 
                  type="text"
                  placeholder="e.g. HDFC882910298"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setActiveInvoiceForPayment(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ padding: '0.5rem 1.25rem', background: '#15803D', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
              >
                Record Payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
