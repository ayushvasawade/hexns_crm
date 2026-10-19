'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Printer, 
  CreditCard, 
  CheckCircle2, 
  FileText,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { formatINR, formatDate, numberToWordsINR } from '../../../lib/formatters';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { generateInvoicePDF } from '../../../lib/exportUtils';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { invoices, payments, settings, recordPayment } = useCrm();

  const invoice = invoices.find(inv => inv.id === resolvedParams.id);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(invoice ? String(invoice.balanceDue) : '');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<any>('NEFT / RTGS / IMPS');
  const [payRef, setPayRef] = useState('');

  if (!invoice) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Invoice Not Found</h2>
        <Link href="/invoices" style={{ color: '#2563EB', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to Invoices List
        </Link>
      </div>
    );
  }

  // Related payments
  const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    recordPayment({
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      amount: amt,
      paymentDate: payDate,
      paymentMode: payMode,
      transactionReference: payRef || `UTR-${Date.now().toString().slice(-6)}`,
      internalNotes: "Settlement logged from Invoice Detail screen."
    });

    setShowPayModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Action Bar (Hidden during print) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/invoices" style={{ padding: '6px', border: '1px solid #E5E7EB', borderRadius: '6px', color: '#4B5563', display: 'flex' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#171717' }}>{invoice.invoiceNumber}</h1>
              <Badge status={invoice.status} />
            </div>
            <p style={{ fontSize: '13px', color: '#737373' }}>
              Client: <strong>{invoice.clientName}</strong> • Due: {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => generateInvoicePDF(invoice, settings)}
            style={{
              padding: '0.45rem 0.85rem',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>

          <button 
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '0.45rem 0.85rem',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#171717',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print Tax Invoice</span>
          </button>

          {invoice.balanceDue > 0 && (
            <button 
              onClick={() => {
                setPayAmount(String(invoice.balanceDue));
                setShowPayModal(true);
              }}
              style={{
                padding: '0.45rem 1rem',
                backgroundColor: '#15803D',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CreditCard size={14} />
              <span>Record Settlement</span>
            </button>
          )}
        </div>
      </div>

      {/* A4 Printable Tax Invoice */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        maxWidth: '850px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #171717', paddingBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#171717', letterSpacing: '-0.02em' }}>
              {settings.legalEntityName}
            </h2>
            <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px', lineHeight: '1.4' }}>
              {settings.registeredAddress}, {settings.city}, {settings.state} — {settings.pinCode}<br />
              GSTIN: <strong>{settings.gstin}</strong> | PAN: {settings.pan}<br />
              Email: {settings.corporateEmail} | Web: {settings.website}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#171717', letterSpacing: '0.05em' }}>
              TAX INVOICE
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
              {invoice.invoiceNumber}
            </div>
            <div style={{ fontSize: '12px', color: '#737373' }}>Invoice Date: {formatDate(invoice.invoiceDate)}</div>
            <div style={{ fontSize: '12px', color: '#737373' }}>Payment Due: {formatDate(invoice.dueDate)}</div>
            {invoice.quotationNumber && (
              <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>
                Ref Quote: {invoice.quotationNumber}
              </div>
            )}
          </div>
        </div>

        {/* Billed To & Supply */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '13px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Details of Receiver (Billed To):</span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>
              {invoice.clientName}
            </div>
            <div style={{ color: '#4B5563' }}>Place of Supply: <strong>{invoice.placeOfSupply}</strong></div>
            <div style={{ color: '#4B5563' }}>Tax Type: {invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Project Reference:</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>{invoice.projectTitle}</div>
            <div style={{ color: '#4B5563', marginTop: '4px' }}>Reverse Charge: <strong>No</strong></div>
            <div style={{ color: '#4B5563' }}>Status: <strong>{invoice.status}</strong></div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #171717', borderBottom: '1px solid #171717' }}>
              <th style={{ padding: '8px' }}>#</th>
              <th style={{ padding: '8px' }}>Description of Service</th>
              <th style={{ padding: '8px' }}>SAC</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Taxable Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '8px', color: '#737373' }}>{idx + 1}</td>
                <td style={{ padding: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{item.serviceName}</div>
                  <div style={{ fontSize: '11.5px', color: '#737373' }}>{item.description}</div>
                </td>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.sacCode}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity} {item.billingUnit}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(item.negotiatedUnitPrice)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                  {formatINR(item.taxableAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary & Amount in Words */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '420px', fontSize: '12px', color: '#4B5563' }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#171717' }}>Total in Words:</span>
            <div style={{ fontWeight: 700, color: '#171717', fontSize: '12.5px', marginTop: '2px' }}>
              {numberToWordsINR(invoice.grandTotal)}
            </div>
            <p style={{ marginTop: '8px', fontSize: '11.5px', color: '#737373' }}>
              {settings.invoiceStatutoryNote}
            </p>
          </div>

          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(invoice.totalTaxableAmount)}</span>
            </div>
            {!invoice.isInterState ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                  <span>CGST (9%):</span>
                  <span>{formatINR(invoice.cgstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                  <span>SGST (9%):</span>
                  <span>{formatINR(invoice.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563EB' }}>
                <span>IGST (18%):</span>
                <span>{formatINR(invoice.igstAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #171717', paddingTop: '6px', marginTop: '4px' }}>
              <span style={{ fontWeight: 800 }}>Invoice Total:</span>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>{formatINR(invoice.grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D', fontWeight: 600, fontSize: '12.5px' }}>
              <span>Amount Paid:</span>
              <span>{formatINR(invoice.amountPaid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: invoice.balanceDue > 0 ? '#DC2626' : '#15803D', fontWeight: 700, fontSize: '13.5px', borderTop: '1px dashed #E5E7EB', paddingTop: '4px' }}>
              <span>Balance Due:</span>
              <span>{formatINR(invoice.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Payment History Table (if any) */}
        {invoicePayments.length > 0 && (
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>
              Settlement History
            </span>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '4px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Receipt #</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Mode</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>Reference / UTR</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {invoicePayments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600 }}>{p.paymentNumber}</td>
                    <td style={{ padding: '4px 8px' }}>{formatDate(p.paymentDate)}</td>
                    <td style={{ padding: '4px 8px' }}>{p.paymentMode}</td>
                    <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{p.transactionReference}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#15803D' }}>{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bank Settlement & Signature */}
        <div style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '12px'
        }}>
          <div>
            <strong>Electronic Bank Settlement Details:</strong><br />
            Bank: {settings.bank.bankName}<br />
            Account Name: {settings.bank.accountHolder}<br />
            Current A/C No: {settings.bank.accountNumber}<br />
            IFSC Code: {settings.bank.ifsc} | UPI: {settings.bank.upiVpa}
          </div>

          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ height: '35px', borderBottom: '1px dashed #737373', marginBottom: '4px' }} />
            <span>Authorized Signatory</span><br />
            <strong style={{ fontSize: '11px' }}>{settings.legalEntityName}</strong>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={`Record Payment for ${invoice.invoiceNumber}`}
        subtitle={`Outstanding Due: ${formatINR(invoice.balanceDue)}`}
      >
        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Amount (₹) *</label>
            <input 
              type="number"
              required
              max={invoice.balanceDue}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Date</label>
              <input 
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
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
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>UTR / Reference Number</label>
            <input 
              type="text"
              placeholder="e.g. HDFC882910298"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowPayModal(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1.25rem', background: '#15803D', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Confirm Settlement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
