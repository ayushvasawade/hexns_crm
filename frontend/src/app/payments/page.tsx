'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  Search, 
  Plus, 
  CheckCircle2, 
  ArrowUpRight, 
  FileText,
  Clock,
  Building,
  Check,
  Download
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { formatINR, formatDate } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function PaymentsPage() {
  const { payments, invoices, clients, recordPayment } = useCrm();

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoices.find(i => i.balanceDue > 0)?.id || invoices[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<any>('NEFT / RTGS / IMPS');
  const [reference, setReference] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);

  // Total collected summary
  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    recordPayment({
      clientId: selectedInvoice.clientId,
      invoiceId: selectedInvoice.id,
      amount: numAmt,
      paymentDate,
      paymentMode,
      transactionReference: reference || `UTR-${Date.now().toString().slice(-6)}`,
      internalNotes
    });

    setIsAddModalOpen(false);
    setAmount('');
    setReference('');
    setInternalNotes('');
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.transactionReference.toLowerCase().includes(search.toLowerCase());

    const matchesMode = modeFilter === 'All' || p.paymentMode === modeFilter;
    return matchesSearch && matchesMode;
  });

  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Client Name', 'Invoice #', 'Payment Date', 'Payment Mode', 'Transaction Reference', 'Amount (INR)', 'Status'];
    const rows = filteredPayments.map(p => [
      p.paymentNumber,
      `"${p.clientName.replace(/"/g, '""')}"`,
      p.invoiceNumber,
      p.paymentDate,
      p.paymentMode,
      `"${p.transactionReference.replace(/"/g, '""')}"`,
      p.amount,
      p.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HEXNS_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Payment Receipts & Collections Ledger
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Total Verified Cash Collections: <strong style={{ color: '#15803D' }}>{formatINR(totalCollected)}</strong> across {payments.length} receipts.
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
          <button 
            onClick={() => {
              const unpaid = invoices.find(i => i.balanceDue > 0);
              if (unpaid) {
                setSelectedInvoiceId(unpaid.id);
                setAmount(String(unpaid.balanceDue));
              }
              setIsAddModalOpen(true);
            }}
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
            <span>+ Record Payment</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
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
            placeholder="Search receipt #, client, invoice, or UTR reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '12px', color: '#737373' }}>Mode:</span>
          <select 
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
          >
            <option value="All">All Modes</option>
            <option value="NEFT / RTGS / IMPS">NEFT / RTGS / IMPS</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Payments Ledger Table */}
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
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Receipt #</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Client Entity</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Against Invoice</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Payment Date</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Payment Mode</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Transaction Ref / UTR</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Amount Collected</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#171717' }}>
                    {p.paymentNumber}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                    {p.clientName}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Link href={`/invoices/${p.invoiceId}`} style={{ color: '#2563EB', fontWeight: 600 }}>
                      {p.invoiceNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#4B5563' }}>
                    {formatDate(p.paymentDate)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#F3F4F6', borderRadius: '4px', fontWeight: 500 }}>
                      {p.paymentMode}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '12px', color: '#4B5563' }}>
                    {p.transactionReference}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#15803D' }}>
                    {formatINR(p.amount)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Badge status={p.status} />
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Client Collection"
        subtitle="Log settlement receipt against an existing invoice."
      >
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Select Outstanding Invoice *</label>
            <select 
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                const inv = invoices.find(i => i.id === e.target.value);
                if (inv) setAmount(String(inv.balanceDue));
              }}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            >
              {invoices.map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} — {i.clientName} (Total: {formatINR(i.grandTotal)} | Due: {formatINR(i.balanceDue)})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px' }}>
              <div>Client Entity: <strong>{selectedInvoice.clientName}</strong></div>
              <div>Invoice Grand Total: {formatINR(selectedInvoice.grandTotal)} | Already Paid: {formatINR(selectedInvoice.amountPaid)}</div>
              <div style={{ color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
                Remaining Balance Due: {formatINR(selectedInvoice.balanceDue)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Amount Received (₹) *</label>
              <input 
                type="number"
                required
                max={selectedInvoice?.balanceDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Receipt Date</label>
              <input 
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Mode</label>
              <select 
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option>NEFT / RTGS / IMPS</option>
                <option>UPI</option>
                <option>Cheque</option>
                <option>Cash</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>UTR / Reference Number</label>
              <input 
                type="text"
                placeholder="e.g. HDFC9821094821"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Internal Notes</label>
            <input 
              type="text"
              placeholder="e.g. Cleared into Goregaon HDFC current account"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1.25rem', background: '#15803D', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Confirm Collection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
