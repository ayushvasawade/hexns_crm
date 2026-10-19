'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  FileText,
  Search,
  Building,
  CheckCircle2,
  X
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { DocumentLineItem } from '../../../types/crm';
import { formatINR, formatDate, numberToWordsINR } from '../../../lib/formatters';

export default function NewInvoicePage() {
  const router = useRouter();
  const { clients, services, quotations, settings, addInvoice, addClient } = useCrm();

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');

  const nextInvNum = `${settings.invoicePrefix}${String(Date.now()).slice(-4)}`;
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvNum);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [projectTitle, setProjectTitle] = useState('Brand Retainer & Content Production');
  const [notes, setNotes] = useState('Payment due within 15 days of invoice issue.');

  const client = clients.find(c => c.id === selectedClientId) || null;
  const isInterState = client ? client.stateCode !== '27' : false;

  const handleQuickAddClient = (nameToUse?: string) => {
    const rawName = (nameToUse || clientSearchTerm).trim();
    if (!rawName) return;

    const newClient = addClient({
      legalEntityName: rawName,
      brandTradeName: rawName,
      primaryContactPerson: 'Primary Contact',
      officialPhone: '+91 22 2800 0000',
      mobile: '+91 98000 00000',
      billingEmail: `accounts@${rawName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`,
      registeredAddress: 'Commercial Suite, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pinCode: '400001',
      gstRegistered: false,
      gstin: '',
      pan: '',
      placeOfSupply: 'Maharashtra (27)',
      reverseCharge: false,
      taxExempt: false,
      clientSegment: 'One-Off',
      industryCategory: 'General Business',
      assignedAccountLead: 'Vikram Malhotra',
      defaultPaymentTerms: '50% Advance + 50% Before Delivery',
      status: 'Active'
    });

    setSelectedClientId(newClient.id);
    setClientSearchTerm('');
  };

  // Line items
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>([
    {
      id: 'ili-1',
      serviceName: services[0]?.serviceName || 'Social Media Management',
      category: services[0]?.category,
      description: services[0]?.description || 'Service deliverables',
      sacCode: services[0]?.sacCode || '998311',
      quantity: 1,
      billingUnit: services[0]?.billingUnit || 'Per Month',
      minPrice: services[0]?.minPrice || 20000,
      defaultPrice: services[0]?.defaultPrice || 28000,
      maxPrice: services[0]?.maxPrice || 40000,
      selectedTier: 'DEFAULT',
      negotiatedUnitPrice: services[0]?.defaultPrice || 28000,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal: services[0]?.defaultPrice || 28000,
      taxableAmount: services[0]?.defaultPrice || 28000,
      gstRate: 18,
      taxAmount: Math.round((services[0]?.defaultPrice || 28000) * 0.18),
      lineTotal: Math.round((services[0]?.defaultPrice || 28000) * 1.18)
    }
  ]);

  // Handle Quotation Import
  const handleImportQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    const q = quotations.find(quote => quote.id === quoteId);
    if (!q) return;

    setSelectedClientId(q.clientId);
    setProjectTitle(q.projectTitle);
    setLineItems([...q.lineItems]);
    setNotes(`Billed against agreed quotation ${q.quotationNumber}.`);
  };

  // Add line item
  const handleAddLine = () => {
    const srv = services[0];
    const newItem: DocumentLineItem = {
      id: `ili-${Date.now()}`,
      serviceName: srv.serviceName,
      category: srv.category,
      description: srv.description,
      sacCode: srv.sacCode,
      quantity: 1,
      billingUnit: srv.billingUnit,
      minPrice: srv.minPrice,
      defaultPrice: srv.defaultPrice,
      maxPrice: srv.maxPrice,
      selectedTier: 'DEFAULT',
      negotiatedUnitPrice: srv.defaultPrice,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal: srv.defaultPrice,
      taxableAmount: srv.defaultPrice,
      gstRate: srv.gstRate,
      taxAmount: Math.round(srv.defaultPrice * (srv.gstRate / 100)),
      lineTotal: Math.round(srv.defaultPrice * (1 + srv.gstRate / 100))
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const handlePriceChange = (index: number, val: number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const subtotal = item.quantity * val;
      const tax = Math.round(subtotal * (item.gstRate / 100));
      return {
        ...item,
        negotiatedUnitPrice: val,
        lineSubtotal: subtotal,
        taxableAmount: subtotal,
        taxAmount: tax,
        lineTotal: subtotal + tax
      };
    }));
  };

  const handleRemoveLine = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Totals
  const totalTaxable = lineItems.reduce((acc, it) => acc + it.taxableAmount, 0);
  const totalGst = Math.round(totalTaxable * 0.18);
  const cgstAmount = isInterState ? 0 : Math.round(totalGst / 2);
  const sgstAmount = isInterState ? 0 : Math.round(totalGst / 2);
  const igstAmount = isInterState ? totalGst : 0;
  const grandTotal = totalTaxable + totalGst;

  const handleCreateInvoice = () => {
    let clientToUse = client;
    if (!clientToUse) {
      if (clientSearchTerm.trim()) {
        const rawName = clientSearchTerm.trim();
        const newC = addClient({
          legalEntityName: rawName,
          brandTradeName: rawName,
          primaryContactPerson: 'Primary Contact',
          officialPhone: '+91 22 2800 0000',
          mobile: '+91 98000 00000',
          billingEmail: `accounts@${rawName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`,
          registeredAddress: 'Commercial Suite, Mumbai',
          city: 'Mumbai',
          state: 'Maharashtra',
          stateCode: '27',
          pinCode: '400001',
          gstRegistered: false,
          gstin: '',
          pan: '',
          placeOfSupply: 'Maharashtra (27)',
          reverseCharge: false,
          taxExempt: false,
          clientSegment: 'One-Off',
          industryCategory: 'General Business',
          assignedAccountLead: 'Vikram Malhotra',
          defaultPaymentTerms: '50% Advance + 50% Before Delivery',
          status: 'Active'
        });
        setSelectedClientId(newC.id);
        clientToUse = newC;
      } else {
        alert("Please select or enter a client name before generating the invoice.");
        return;
      }
    }

    if (lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    const newInv = addInvoice({
      invoiceNumber,
      quotationId: selectedQuoteId || undefined,
      clientId: clientToUse.id,
      clientName: clientToUse.legalEntityName,
      projectTitle,
      invoiceDate,
      dueDate,
      placeOfSupply: clientToUse.placeOfSupply,
      isInterState: clientToUse.stateCode !== '27',
      lineItems,
      documentDiscountType: 'fixed',
      documentDiscountValue: 0,
      totalLineSubtotal: totalTaxable,
      totalItemDiscount: 0,
      documentDiscountAmount: 0,
      totalTaxableAmount: totalTaxable,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
      amountPaid: 0,
      balanceDue: grandTotal,
      status: 'Sent',
      notes,
      bankDetails: settings.bank
    });

    router.push(`/invoices/${newInv.id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/invoices" style={{ padding: '6px', border: '1px solid #E5E7EB', borderRadius: '6px', color: '#4B5563', display: 'flex' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717' }}>Create Tax Invoice</h1>
            <p style={{ fontSize: '13px', color: '#737373' }}>Generate official legal tax invoice or import from an accepted quotation.</p>
          </div>
        </div>

        <button 
          onClick={handleCreateInvoice}
          style={{
            padding: '0.5rem 1.25rem',
            backgroundColor: '#171717',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Check size={14} />
          <span>Generate Tax Invoice</span>
        </button>
      </div>

      {/* Main Container */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Import from Quote Banner */}
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px' }}>
            <FileText size={16} color="#2563EB" />
            <span>Optional: Autofill from an accepted quotation</span>
          </div>
          <select 
            value={selectedQuoteId}
            onChange={(e) => handleImportQuote(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
          >
            <option value="">-- Choose Quotation --</option>
            {quotations.map(q => (
              <option key={q.id} value={q.id}>{q.quotationNumber} — {q.clientName} ({formatINR(q.grandTotal)})</option>
            ))}
          </select>
        </div>

        {/* Invoice Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Client Entity *</label>
            {client ? (
              <div style={{
                marginTop: '4px',
                padding: '0.45rem 0.65rem',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                backgroundColor: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#171717', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {client.legalEntityName}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClientId('')}
                  style={{ border: 'none', background: 'transparent', color: '#6B7280', cursor: 'pointer', padding: '2px' }}
                  title="Change client"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <input 
                  type="text"
                  placeholder="Type client name..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddClient();
                    }
                  }}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
                />
                <button
                  type="button"
                  onClick={() => handleQuickAddClient()}
                  style={{ padding: '0.45rem 0.65rem', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Invoice Number *</label>
            <input 
              type="text" 
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Invoice Date</label>
            <input 
              type="date" 
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Due Date</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Project / Campaign Reference</label>
          <input 
            type="text" 
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
          />
        </div>

        {/* Deliverables Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#171717', textTransform: 'uppercase' }}>
              Invoice Line Deliverables
            </span>
            <button 
              type="button" 
              onClick={handleAddLine}
              style={{ padding: '0.35rem 0.75rem', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
            >
              + Add Line Item
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Service Deliverable</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>SAC</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px' }}>
                    <input 
                      type="text"
                      value={item.serviceName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, serviceName: val } : it));
                      }}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', fontWeight: 600 }}
                    />
                  </td>
                  <td style={{ padding: '8px', width: '90px' }}>
                    <input 
                      type="text"
                      value={item.sacCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, sacCode: val } : it));
                      }}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', fontFamily: 'monospace' }}
                    />
                  </td>
                  <td style={{ padding: '8px', width: '70px', textAlign: 'center' }}>
                    <input 
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty, lineSubtotal: qty * it.negotiatedUnitPrice, taxableAmount: qty * it.negotiatedUnitPrice } : it));
                      }}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '8px', width: '140px', textAlign: 'right' }}>
                    <input 
                      type="number"
                      value={item.negotiatedUnitPrice}
                      onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', textAlign: 'right', fontWeight: 600 }}
                    />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                    {formatINR(item.taxableAmount)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', width: '40px' }}>
                    <button type="button" onClick={() => handleRemoveLine(idx)} style={{ color: '#DC2626' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(totalTaxable)}</span>
            </div>
            {!isInterState ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                  <span>CGST (9%):</span>
                  <span>{formatINR(cgstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                  <span>SGST (9%):</span>
                  <span>{formatINR(sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563EB' }}>
                <span>IGST (18%):</span>
                <span>{formatINR(igstAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #171717', paddingTop: '6px', marginTop: '4px' }}>
              <span style={{ fontWeight: 800 }}>Invoice Grand Total:</span>
              <span style={{ fontWeight: 800, fontSize: '17px' }}>{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
