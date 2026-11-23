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
import { LetterheadLayout } from '../../../components/document/LetterheadLayout';
import { PricingSelector } from '../../../components/document/PricingSelector';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { invoices, packages, payments, settings, recordPayment, updateInvoice } = useCrm();

  const decodedId = decodeURIComponent(resolvedParams.id).toLowerCase();
  const invoice = invoices.find(inv => inv.id.toLowerCase() === decodedId || inv.invoiceNumber?.toLowerCase() === decodedId);
  const [editingPricing, setEditingPricing] = useState(false);
  const [draftLines, setDraftLines] = useState(invoice?.lineItems || []);
  const [draftApplyGst, setDraftApplyGst] = useState(invoice?.applyGst !== false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageSearchTerm, setPackageSearchTerm] = useState('');
  React.useEffect(() => {
    if (invoice) {
      setDraftLines(invoice.lineItems);
      setDraftApplyGst(invoice.applyGst !== false);
    }
  }, [invoice]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(invoice ? String(invoice.balanceDue) : '');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<any>('NEFT / RTGS / IMPS');
  const [payRef, setPayRef] = useState('');

  // Edit Bank Details State
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [editUpiVpa, setEditUpiVpa] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  const openEditBankModal = () => {
    const b = invoice?.bankDetails || {};
    setEditBankName(b.bankName || '');
    setEditAccountHolder(b.accountHolder || '');
    setEditAccountNumber(b.accountNumber || '');
    setEditIfsc(b.ifsc || '');
    setEditUpiVpa(b.upiVpa || (b as any).upiId || '');
    setShowEditBankModal(true);
  };

  const handleUseSavedCompanyBank = () => {
    if (settings.bank) {
      setEditBankName(settings.bank.bankName || '');
      setEditAccountHolder(settings.bank.accountHolder || '');
      setEditAccountNumber(settings.bank.accountNumber || '');
      setEditIfsc(settings.bank.ifsc || '');
      setEditUpiVpa(settings.bank.upiVpa || '');
    }
  };

  const handleClearEditBank = () => {
    setEditBankName('');
    setEditAccountHolder('');
    setEditAccountNumber('');
    setEditIfsc('');
    setEditUpiVpa('');
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setIsSavingBank(true);
    try {
      await updateInvoice(invoice.id, {
        bankDetails: {
          bankName: editBankName.trim(),
          accountHolder: editAccountHolder.trim(),
          accountNumber: editAccountNumber.trim(),
          ifsc: editIfsc.trim(),
          branch: '',
          upiVpa: editUpiVpa.trim(),
        }
      });
      setShowEditBankModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

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

  const updateDraftLine = (index: number, tier: 'MIN' | 'DEFAULT' | 'CUSTOM' | 'MAX', value?: number) => {
    setDraftLines(lines => lines.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const price = tier === 'MIN' ? line.minPrice : tier === 'DEFAULT' ? line.defaultPrice : tier === 'MAX' ? line.maxPrice : (value ?? line.negotiatedUnitPrice);
      return { ...line, selectedTier: tier, negotiatedUnitPrice: price, isBelowMinWarning: line.minPrice > 0 && price < line.minPrice };
    }));
  };

  const addPackageToDraft = () => {
    const pkg = packages.find(item => item.id === selectedPackageId);
    if (!pkg) return;

    const minPrice = pkg.minPrice ?? 0;
    const selectedTier: 'DEFAULT' | 'MIN' | 'CUSTOM' = pkg.finalPrice > 0 ? 'DEFAULT' : minPrice > 0 ? 'MIN' : 'CUSTOM';
    const unitPrice = pkg.finalPrice > 0 ? pkg.finalPrice : minPrice;
    setDraftLines(lines => [...lines, {
      id: `pkg-${Date.now()}`,
      packageId: pkg.id,
      serviceName: pkg.name,
      category: 'Package',
      description: pkg.description,
      sacCode: '998311',
      quantity: 1,
      billingUnit: pkg.duration || 'Package',
      minPrice,
      defaultPrice: pkg.finalPrice,
      maxPrice: pkg.standardPrice,
      selectedTier,
      negotiatedUnitPrice: unitPrice,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal: unitPrice,
      taxableAmount: unitPrice,
      gstRate: pkg.gstRate,
      taxAmount: Math.round(unitPrice * (pkg.gstRate / 100)),
      lineTotal: Math.round(unitPrice * (1 + pkg.gstRate / 100)),
    }]);
    setSelectedPackageId('');
  };

  const savePricing = async () => {
    await updateInvoice(invoice.id, { lineItems: draftLines, applyGst: draftApplyGst });
    setEditingPricing(false);
  };

  // Related payments
  const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    try {
      await recordPayment({
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        amount: amt,
        paymentDate: payDate,
        paymentMode: payMode,
        transactionReference: payRef || `UTR-${Date.now().toString().slice(-6)}`,
        internalNotes: "Settlement logged from Invoice Detail screen."
      });

      setShowPayModal(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="document-view-page">
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
              {invoice.applyGst === false && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: '1px solid #E5E7EB'
                }}>
                  GST-Free
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#737373' }}>
              Client: <strong>{invoice.clientName}</strong> • Due: {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              try {
                generateInvoicePDF(invoice, settings);
              } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to generate invoice PDF';
                alert(message);
              }
            }}
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

          <button
            type="button"
            onClick={openEditBankModal}
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
            <span>Edit Bank Details</span>
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
          {invoice.amountPaid === 0 && (
            <button type="button" onClick={editingPricing ? savePricing : () => setEditingPricing(true)} style={{ padding: '0.45rem 0.85rem', backgroundColor: editingPricing ? '#15803D' : '#FFFFFF', color: editingPricing ? '#FFFFFF' : '#171717', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600 }}>
              {editingPricing ? 'Save Pricing' : 'Edit Pricing'}
            </button>
          )}
        </div>
      </div>

      {/* A4 Letterhead Printable Tax Invoice */}
      <LetterheadLayout>
        {/* Document Header & Reference */}
        <div className="print-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #171717', paddingBottom: '0.85rem' }}>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#171717', letterSpacing: '0.04em' }}>
              {invoice.applyGst === false ? 'INVOICE' : 'TAX INVOICE'}
            </span>
            <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '3px', fontFamily: 'monospace', color: '#2563EB' }}>
              {invoice.invoiceNumber}
            </div>
            {invoice.quotationNumber && (
              <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '2px' }}>
                Ref Quotation: {invoice.quotationNumber}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
            <div>Invoice Date: <strong style={{ color: '#171717' }}>{formatDate(invoice.invoiceDate)}</strong></div>
            <div>Payment Due: <strong style={{ color: '#171717' }}>{formatDate(invoice.dueDate)}</strong></div>
            <div style={{ fontSize: '11px', color: '#737373' }}>Status: <strong>{invoice.status}</strong></div>
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
            <div style={{ color: '#4B5563' }}>Tax Type: {invoice.applyGst === false ? 'GST-Free (No Tax)' : (invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)')}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Project Reference:</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>{invoice.projectTitle}</div>
            <div style={{ color: '#4B5563', marginTop: '4px' }}>Reverse Charge: <strong>No</strong></div>
            <div style={{ color: '#4B5563' }}>Status: <strong>{invoice.status}</strong></div>
          </div>
        </div>

        {editingPricing && (
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            <input
              type="search"
              value={packageSearchTerm}
              onChange={(event) => setPackageSearchTerm(event.target.value)}
              placeholder="Search packages..."
              style={{ flex: 1, minWidth: '160px', padding: '0.45rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
            />
            <select
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
              style={{ flex: 1, minWidth: '160px', padding: '0.45rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
            >
              <option value="">Add a package...</option>
              {packages
                .filter(pkg => pkg.name.toLowerCase().includes(packageSearchTerm.trim().toLowerCase()))
                .map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} - {formatINR(pkg.finalPrice)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={addPackageToDraft}
              disabled={!selectedPackageId}
              style={{ padding: '0.45rem 0.75rem', background: '#2563EB', color: '#FFFFFF', borderRadius: '4px', fontSize: '12px', fontWeight: 600, opacity: selectedPackageId ? 1 : 0.5 }}
            >
              Add Package
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Apply GST:</span>
              <button
                type="button"
                onClick={() => setDraftApplyGst(!draftApplyGst)}
                style={{
                  padding: '0.45rem 0.75rem',
                  background: draftApplyGst ? '#16A34A' : '#4B5563',
                  color: '#FFFFFF',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {draftApplyGst ? 'GST: Enabled' : 'GST: Disabled'}
              </button>
            </div>
          </div>
        )}

        {/* Invoice Items Table */}
        <table className="invoice-items-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12.5px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #171717', borderBottom: '1px solid #171717' }}>
              <th style={{ width: '4%', padding: '8px' }}>#</th>
              <th style={{ width: '30%', padding: '8px' }}>Description of Service</th>
              <th style={{ width: '9%', padding: '8px' }}>SAC</th>
              <th style={{ width: '9%', padding: '8px', textAlign: 'center' }}>Qty / Unit</th>
              <th style={{ width: '14%', padding: '8px', textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ width: '14%', padding: '8px', textAlign: 'right' }}>Taxable (₹)</th>
              <th style={{ width: '7%', padding: '8px', textAlign: 'center' }}>GST</th>
              <th style={{ width: '13%', padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(editingPricing ? draftLines : invoice.lineItems).map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '8px', color: '#737373' }}>{idx + 1}</td>
                <td style={{ padding: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{item.serviceName}</div>
                  <div style={{ fontSize: '11.5px', color: '#737373' }}>{item.description}</div>
                </td>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.sacCode}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity} {item.billingUnit}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  {editingPricing ? (
                    <PricingSelector
                      item={item}
                      onSelect={(tier) => updateDraftLine(idx, tier)}
                      onCustomChange={(value) => updateDraftLine(idx, 'CUSTOM', value)}
                    />
                  ) : formatINR(item.negotiatedUnitPrice)}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                  {formatINR(item.taxableAmount)}
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{invoice.applyGst !== false ? `${item.gstRate}%` : '—'}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                  {formatINR(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary & Amount in Words */}
        <div className="print-avoid-break" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
              <span style={{ fontWeight: 600 }}>{formatINR(invoice.documentDiscountAmount > 0 ? (invoice.totalLineSubtotal || (invoice.totalTaxableAmount + invoice.documentDiscountAmount)) : invoice.totalTaxableAmount)}</span>
            </div>
            {invoice.documentDiscountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                <span>Discount Amount:</span>
                <span style={{ fontWeight: 600 }}>- {formatINR(invoice.documentDiscountAmount)}</span>
              </div>
            )}
            {invoice.applyGst !== false ? (
              !invoice.isInterState ? (
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
              )
            ) : null}
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
            <table className="payment-history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '4px' }}>
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

        {/* Bank Settlement Section (Optional, only fields with values; omit entirely if empty) */}
        {(() => {
          const rawBank = invoice.bankDetails || {};
          const bName = rawBank.bankName?.trim() || '';
          const bHolder = rawBank.accountHolder?.trim() || '';
          const bNum = rawBank.accountNumber?.trim() || '';
          const bIfsc = rawBank.ifsc?.trim() || '';
          const bUpi = (rawBank.upiVpa || (rawBank as any).upiId)?.trim() || '';
          const hasBank = Boolean(bName || bHolder || bNum || bIfsc || bUpi);

          if (hasBank) {
            return (
              <div className="print-avoid-break" style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: '1rem',
                fontSize: '12px',
                color: '#4B5563',
                lineHeight: '1.6'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ color: '#171717' }}>Electronic Bank Settlement Details:</strong>
                    {bName && <div>Bank: {bName}</div>}
                    {bHolder && <div>Account Name: {bHolder}</div>}
                    {bNum && <div>Current A/C No: {bNum}</div>}
                    {(bIfsc || bUpi) && (
                      <div>
                        {[bIfsc ? `IFSC Code: ${bIfsc}` : null, bUpi ? `UPI: ${bUpi}` : null].filter(Boolean).join(' | ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openEditBankModal}
                    className="no-print"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#2563EB',
                      border: '1px solid #BFDBFE',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit Bank Details
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="no-print" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#737373', fontStyle: 'italic' }}>
                No bank details included on this invoice.
              </span>
              <button
                type="button"
                onClick={openEditBankModal}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#2563EB',
                  border: '1px solid #BFDBFE',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Add Bank Details
              </button>
            </div>
          );
        })()}
      </LetterheadLayout>

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

      {/* Edit Bank Settlement Details Modal */}
      <Modal
        isOpen={showEditBankModal}
        onClose={() => setShowEditBankModal(false)}
        title={`Bank Settlement Details for ${invoice.invoiceNumber}`}
        subtitle="All fields are optional. Leave blank or use saved company bank details."
      >
        <form onSubmit={handleSaveBankDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '12px', color: '#4B5563' }}>
              Autofill options:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleUseSavedCompanyBank}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Use saved company bank details
              </button>
              {(editBankName || editAccountHolder || editAccountNumber || editIfsc || editUpiVpa) && (
                <button
                  type="button"
                  onClick={handleClearEditBank}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Bank Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank Ltd"
              value={editBankName}
              onChange={(e) => setEditBankName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Account Holder Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. HEXNS Mediaworks LLP"
              value={editAccountHolder}
              onChange={(e) => setEditAccountHolder(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Account Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 50200084920194"
                value={editAccountNumber}
                onChange={(e) => setEditAccountNumber(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>IFSC Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. HDFC0000084"
                value={editIfsc}
                onChange={(e) => setEditIfsc(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>UPI ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. hexnsmediaworks@hdfcbank"
              value={editUpiVpa}
              onChange={(e) => setEditUpiVpa(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowEditBankModal(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingBank}
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              {isSavingBank ? 'Saving...' : 'Save Bank Details'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
