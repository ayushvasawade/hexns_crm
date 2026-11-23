'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Download
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { 
  formatINR, 
  formatDate, 
  formatDateDDMMYYYY, 
  formatNumberWithDecimals, 
  formatIndianRupeesInWords 
} from '../../../lib/formatters';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { generateInvoicePDF } from '../../../lib/exportUtils';
import { PricingSelector } from '../../../components/document/PricingSelector';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

      {/* Printable Tax Invoice Container Styled Strictly After Hexns Media Reference (Image 1 & Image 2) */}
      <div 
        className="a4-document-container invoice-printable-sheet" 
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
          maxWidth: '840px',
          margin: '0 auto',
          overflow: 'hidden',
          fontFamily: 'inherit',
          color: '#171717',
        }}
      >
        {/* IMAGE 1: Top Blue Header Block */}
        <div style={{
          backgroundColor: '#2B7DA8',
          color: '#FFFFFF',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {invoice.applyGst === false ? 'INVOICE' : 'TAX INVOICE'}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px', fontFamily: 'monospace' }}>
              #{invoice.invoiceNumber}
            </div>
            {invoice.quotationNumber && (
              <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                Ref Quote: {invoice.quotationNumber}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: '1.45' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.01em', marginBottom: '3px' }}>
              Hexns Media
            </div>
            <div>1, 3rd Floor , Abhove Gadre Eye Care</div>
            <div>New Shau Puri</div>
            <div>Kolhapur Maharashtra 416001</div>
            <div>India</div>
            <div style={{ fontWeight: 700, marginTop: '4px', fontSize: '12.5px' }}>
              GSTIN 27AASFH6542G1Z0
            </div>
            <div>admin@hexnsmedia.com</div>
          </div>
        </div>

        {/* IMAGE 2: Top Right Balance Due Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '0.9rem 1.75rem 0.25rem 1.75rem',
        }}>
          <div style={{ color: '#2B7DA8', fontSize: '15.5px', fontWeight: 800, letterSpacing: '0.02em' }}>
            BALANCE DUE {formatNumberWithDecimals(invoice.balanceDue)}
          </div>
        </div>

        {/* IMAGE 2: Client Info & Invoice Meta Table */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '1.5rem',
          padding: '0.5rem 1.75rem 1rem 1.75rem',
          fontSize: '13px',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#171717' }}>
              {invoice.clientName}
            </div>
            {invoice.clientGstin && (
              <div style={{ fontSize: '12.5px', color: '#4B5563', marginTop: '2px' }}>
                GSTIN {invoice.clientGstin}
              </div>
            )}
            <div style={{ fontSize: '12.5px', color: '#171717', marginTop: '1.25rem' }}>
              Place Of Supply: {invoice.placeOfSupply || 'Maharashtra (27)'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 14px 2px 0', color: '#6B7280', textAlign: 'left' }}>Invoice#</td>
                  <td style={{ padding: '2px 0', fontWeight: 600, color: '#171717', textAlign: 'right', fontFamily: 'monospace' }}>
                    {invoice.invoiceNumber}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '2px 14px 2px 0', color: '#6B7280', textAlign: 'left' }}>Invoice Date</td>
                  <td style={{ padding: '2px 0', fontWeight: 500, color: '#171717', textAlign: 'right' }}>
                    {formatDateDDMMYYYY(invoice.invoiceDate)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '2px 14px 2px 0', color: '#6B7280', textAlign: 'left' }}>Terms</td>
                  <td style={{ padding: '2px 0', fontWeight: 500, color: '#171717', textAlign: 'right' }}>
                    {invoice.paymentTerms || settings.defaultPaymentTerms || 'Net 15'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '2px 14px 2px 0', color: '#6B7280', textAlign: 'left' }}>Due Date</td>
                  <td style={{ padding: '2px 0', fontWeight: 500, color: '#171717', textAlign: 'right' }}>
                    {formatDateDDMMYYYY(invoice.dueDate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing edit bar (non-printed) */}
        {editingPricing && (
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0 1.75rem 1rem 1.75rem', padding: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', flexWrap: 'wrap' }}>
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

        {/* IMAGE 2: Invoice Items Table with Cyan/Blue headers */}
        <div style={{ padding: '0 1.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #D1D5DB' }}>
                <th style={{ width: '5%', padding: '10px 4px', textAlign: 'left', color: '#2B7DA8', fontWeight: 700, fontSize: '11px' }}>#</th>
                <th style={{ width: '40%', padding: '10px 8px', textAlign: 'left', color: '#2B7DA8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>ITEM & DESCRIPTION</th>
                <th style={{ width: '14%', padding: '10px 8px', textAlign: 'center', color: '#2B7DA8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>HSN/SAC</th>
                {invoice.applyGst !== false && (
                  !invoice.isInterState ? (
                    <>
                      <th style={{ width: '12%', padding: '10px 8px', textAlign: 'right', color: '#2B7DA8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>CGST</th>
                      <th style={{ width: '12%', padding: '10px 8px', textAlign: 'right', color: '#2B7DA8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>SGST</th>
                    </>
                  ) : (
                    <th style={{ width: '24%', padding: '10px 8px', textAlign: 'right', color: '#2B7DA8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>IGST</th>
                  )
                )}
                <th style={{ width: '17%', padding: '10px 8px', textAlign: 'right', color: '#2B7DA8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {(editingPricing ? draftLines : invoice.lineItems).map((item, idx) => {
                const itemTaxable = item.taxableAmount || (item.quantity * item.negotiatedUnitPrice);
                const itemRate = item.gstRate ?? 18;
                const itemTotalTax = (invoice.applyGst !== false && draftApplyGst) ? Math.round(itemTaxable * (itemRate / 100)) : 0;
                const itemHalfTax = Math.round(itemTotalTax / 2);
                const itemOtherHalfTax = itemTotalTax - itemHalfTax;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 4px', verticalAlign: 'top', color: '#171717' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: '#171717', fontSize: '13px' }}>{item.serviceName}</div>
                      {item.description && (
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', whiteSpace: 'pre-line' }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'center', fontFamily: 'monospace', color: '#334155' }}>
                      {item.sacCode || '998311'}
                    </td>
                    {invoice.applyGst !== false && (
                      !invoice.isInterState ? (
                        <>
                          <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right' }}>
                            <div style={{ fontWeight: 500, color: '#171717' }}>{formatNumberWithDecimals(itemHalfTax)}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '1px' }}>{itemRate / 2}%</div>
                          </td>
                          <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right' }}>
                            <div style={{ fontWeight: 500, color: '#171717' }}>{formatNumberWithDecimals(itemOtherHalfTax)}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '1px' }}>{itemRate / 2}%</div>
                          </td>
                        </>
                      ) : (
                        <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right' }}>
                          <div style={{ fontWeight: 500, color: '#171717' }}>{formatNumberWithDecimals(itemTotalTax)}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '1px' }}>{itemRate}%</div>
                        </td>
                      )
                    )}
                    <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#171717' }}>{formatNumberWithDecimals(itemTaxable)}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                        {item.quantity}.00 {item.billingUnit || '1'} x {formatNumberWithDecimals(item.negotiatedUnitPrice)}
                      </div>
                      {editingPricing && (
                        <div className="no-print" style={{ marginTop: '4px' }}>
                          <PricingSelector
                            item={item}
                            onSelect={(tier) => updateDraftLine(idx, tier)}
                            onCustomChange={(value) => updateDraftLine(idx, 'CUSTOM', value)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* IMAGE 2: Shaded Light Blue Container with Thanks note and Summary */}
        <div style={{ padding: '0 1.75rem', marginTop: '1.25rem' }}>
          <div style={{
            backgroundColor: '#F0F6F9',
            borderRadius: '4px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '2rem',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}>
            <div style={{ fontSize: '13px', color: '#171717', maxWidth: '380px' }}>
              <div style={{ fontWeight: 500 }}>Thanks for your business.</div>
              {invoice.notes && (
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '8px', lineHeight: '1.5' }}>
                  {invoice.notes}
                </div>
              )}
            </div>

            <div style={{ width: '270px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 0', color: '#475569' }}>Sub Total</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, color: '#171717' }}>
                      {formatNumberWithDecimals(invoice.documentDiscountAmount > 0 ? (invoice.totalLineSubtotal || (invoice.totalTaxableAmount + invoice.documentDiscountAmount)) : invoice.totalTaxableAmount)}
                    </td>
                  </tr>
                  {invoice.documentDiscountAmount > 0 && (
                    <tr>
                      <td style={{ padding: '3px 0', color: '#DC2626' }}>Discount</td>
                      <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, color: '#DC2626' }}>
                        - {formatNumberWithDecimals(invoice.documentDiscountAmount)}
                      </td>
                    </tr>
                  )}
                  {invoice.applyGst !== false && (
                    !invoice.isInterState ? (
                      <>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#475569' }}>CGST9 (9%)</td>
                          <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, color: '#171717' }}>
                            {formatNumberWithDecimals(invoice.cgstAmount)}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '3px 0', color: '#475569' }}>SGST9 (9%)</td>
                          <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, color: '#171717' }}>
                            {formatNumberWithDecimals(invoice.sgstAmount)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td style={{ padding: '3px 0', color: '#475569' }}>IGST18 (18%)</td>
                        <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 600, color: '#171717' }}>
                          {formatNumberWithDecimals(invoice.igstAmount)}
                        </td>
                      </tr>
                    )
                  )}
                  <tr style={{ borderTop: '1px solid #CBD5E1' }}>
                    <td style={{ padding: '6px 0 3px 0', fontWeight: 700, color: '#171717' }}>Total</td>
                    <td style={{ padding: '6px 0 3px 0', textAlign: 'right', fontWeight: 800, color: '#171717', fontSize: '13.5px' }}>
                      {formatNumberWithDecimals(invoice.grandTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#2B7DA8', fontWeight: 700, fontSize: '14px' }}>Balance Due</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', color: '#2B7DA8', fontWeight: 800, fontSize: '16px' }}>
                      {formatNumberWithDecimals(invoice.balanceDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* IMAGE 2: Total in Words (Right Aligned, Bold Italic) */}
        <div style={{
          padding: '1rem 1.75rem 0.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: '12.5px',
        }}>
          <div>
            <span style={{ color: '#171717' }}>Total In Words: </span>
            <strong style={{ fontStyle: 'italic', color: '#171717' }}>
              {formatIndianRupeesInWords(invoice.grandTotal)}
            </strong>
          </div>
        </div>

        {/* IMAGE 2: Authorized Signature */}
        <div style={{
          padding: '2.5rem 1.75rem 1.5rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div style={{ fontSize: '12.5px', color: '#475569' }}>
            Authorized Signature <span style={{ display: 'inline-block', width: '220px', borderBottom: '1.5px solid #171717', marginLeft: '6px', verticalAlign: 'middle' }}></span>
          </div>
        </div>

        {/* Optional Bank Settlement Details */}
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
              <div style={{
                borderTop: '1px solid #E2E8F0',
                padding: '1rem 1.75rem',
                fontSize: '11.5px',
                color: '#64748B',
                lineHeight: '1.6',
                backgroundColor: '#FAFAFA'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#171717' }}>Electronic Bank Settlement: </strong>
                    {[bName ? `Bank: ${bName}` : null, bHolder ? `A/C Name: ${bHolder}` : null, bNum ? `A/C No: ${bNum}` : null, bIfsc ? `IFSC: ${bIfsc}` : null, bUpi ? `UPI: ${bUpi}` : null].filter(Boolean).join(' | ')}
                  </div>
                  <button
                    type="button"
                    onClick={openEditBankModal}
                    className="no-print"
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#2563EB',
                      border: '1px solid #BFDBFE',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit Bank
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Settlement History Table (if payments recorded) */}
        {invoicePayments.length > 0 && (
          <div style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 1.75rem', backgroundColor: '#FAFAFA' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Recorded Settlement Receipts
            </span>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', marginTop: '4px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '4px 6px', textAlign: 'left' }}>Receipt #</th>
                  <th style={{ padding: '4px 6px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '4px 6px', textAlign: 'left' }}>Mode</th>
                  <th style={{ padding: '4px 6px', textAlign: 'left' }}>Reference / UTR</th>
                  <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {invoicePayments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '4px 6px', fontWeight: 600 }}>{p.paymentNumber}</td>
                    <td style={{ padding: '4px 6px' }}>{formatDateDDMMYYYY(p.paymentDate)}</td>
                    <td style={{ padding: '4px 6px' }}>{p.paymentMode}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>{p.transactionReference}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
