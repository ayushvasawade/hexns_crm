'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Trash2, 
  Check, 
  FileText,
  X
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { DocumentLineItem } from '../../../types/crm';
import { formatINR } from '../../../lib/formatters';
import { PricingSelector } from '../../../components/document/PricingSelector';

export default function NewInvoicePage() {
  const router = useRouter();
  const { clients, services, packages, quotations, settings, addInvoice, addClient } = useCrm();

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Discount state
  const [discountType, setDiscountType] = useState<'' | 'percentage' | 'fixed'>('');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const nextInvNum = `${settings.invoicePrefix}${String(Date.now()).slice(-4)}`;
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvNum);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [projectTitle, setProjectTitle] = useState('Brand Retainer & Content Production');
  const [notes, setNotes] = useState('Payment due within 15 days of invoice issue.');

  const client = clients.find(c => c.id === selectedClientId) || null;
  const isInterState = client ? client.stateCode !== '27' : false;

  const handleQuickAddClient = async (nameToUse?: string) => {
    const rawName = (nameToUse || clientSearchTerm).trim();
    if (!rawName) return;

    try {
      const newClient = await addClient({
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
    } catch (err: any) {
      alert(err?.message || 'Failed to create client');
    }
  };

  // Line items
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>([]);

  const filteredServices = services.filter(service => {
    const query = serviceSearchTerm.trim().toLowerCase();
    return !query ||
      service.serviceName.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query);
  });
  const filteredPackages = packages.filter(pkg => {
    const query = serviceSearchTerm.trim().toLowerCase();
    return !query || pkg.name.toLowerCase().includes(query) || 'package'.includes(query);
  });

  // Handle Quotation Import
  const handleImportQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    const q = quotations.find(quote => quote.id === quoteId);
    if (!q) return;

    setSelectedClientId(q.clientId);
    setProjectTitle(q.projectTitle);
    setLineItems([...q.lineItems]);
    setNotes(`Billed against agreed quotation ${q.quotationNumber}.`);
    if (q.documentDiscountType && q.documentDiscountValue > 0) {
      setDiscountType(q.documentDiscountType);
      setDiscountValue(q.documentDiscountValue);
    } else {
      setDiscountType('');
      setDiscountValue(0);
    }
  };

  // Add line item
  const handleAddLine = () => {
    const newItem: DocumentLineItem = {
      id: `ili-${Date.now()}`,
      serviceName: '',
      category: '',
      description: '',
      sacCode: '',
      quantity: 1,
      billingUnit: '',
      minPrice: 0,
      defaultPrice: 0,
      maxPrice: 0,
      selectedTier: 'DEFAULT',
      negotiatedUnitPrice: 0,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal: 0,
      taxableAmount: 0,
      gstRate: 18,
      taxAmount: 0,
      lineTotal: 0
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const handleAddPackage = () => {
    const pkg = packages.find(item => item.id === selectedPackageId);
    if (!pkg) return;
    const unitPrice = pkg.finalPrice;
    const tax = Math.round(unitPrice * (pkg.gstRate / 100));
    setLineItems(prev => [...prev, {
      id: `pkg-${Date.now()}`,
      serviceName: pkg.name,
      category: 'Package',
      packageId: pkg.id,
      description: pkg.description,
      sacCode: '998311',
      quantity: 1,
      billingUnit: pkg.duration || 'Package',
      minPrice: pkg.minPrice ?? 0,
      defaultPrice: pkg.finalPrice,
      maxPrice: pkg.standardPrice,
      selectedTier: 'DEFAULT',
      negotiatedUnitPrice: unitPrice,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal: unitPrice,
      taxableAmount: unitPrice,
      gstRate: pkg.gstRate,
      taxAmount: tax,
      lineTotal: unitPrice + tax,
    }]);
    setSelectedPackageId('');
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = services.find(item => item.id === serviceId);
    if (!service) return;

    const selectedTier: 'DEFAULT' | 'MIN' | 'CUSTOM' = service.defaultPrice > 0 ? 'DEFAULT' : service.minPrice > 0 ? 'MIN' : 'CUSTOM';
    const unitPrice = service.defaultPrice > 0 ? service.defaultPrice : service.minPrice;

    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const subtotal = item.quantity * unitPrice;
      const tax = Math.round(subtotal * (service.gstRate / 100));
      return {
        ...item,
        serviceId: service.id,
        serviceName: service.serviceName,
        category: service.category,
        description: service.description,
        sacCode: service.sacCode,
        billingUnit: service.billingUnit,
        minPrice: service.minPrice,
        defaultPrice: service.defaultPrice,
        maxPrice: service.maxPrice,
        selectedTier,
        negotiatedUnitPrice: unitPrice,
        isBelowMinWarning: false,
        gstRate: service.gstRate,
        lineSubtotal: subtotal,
        taxableAmount: subtotal,
        taxAmount: tax,
        lineTotal: subtotal + tax
      };
    }));
  };

  const handlePriceChange = (index: number, val: number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const subtotal = item.quantity * val;
      const tax = Math.round(subtotal * (item.gstRate / 100));
      return {
        ...item,
        negotiatedUnitPrice: val,
        selectedTier: 'CUSTOM',
        isBelowMinWarning: item.minPrice > 0 && val < item.minPrice,
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

  // Totals & Discount Calculations
  const subtotal = lineItems.reduce((acc, it) => acc + (it.lineSubtotal || (it.quantity * it.negotiatedUnitPrice)), 0);

  let discountError = '';
  if (discountType === 'percentage') {
    if (discountValue < 0 || discountValue > 100) {
      discountError = 'Percentage must be between 0 and 100';
    }
  } else if (discountType === 'fixed') {
    if (discountValue < 0) {
      discountError = 'Discount value cannot be negative';
    } else if (discountValue > subtotal) {
      discountError = 'Fixed discount cannot exceed the applicable subtotal';
    }
  }

  let calculatedDiscountAmount = 0;
  if (!discountError && discountType === 'percentage' && discountValue > 0) {
    calculatedDiscountAmount = Math.round((subtotal * discountValue) / 100);
  } else if (!discountError && discountType === 'fixed' && discountValue > 0) {
    calculatedDiscountAmount = Math.min(subtotal, discountValue);
  }

  const netTaxableAmount = Math.max(0, subtotal - calculatedDiscountAmount);

  // Proportional GST calculation across lines to match backend rules
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGst = 0;

  lineItems.forEach(line => {
    const lineSubtotal = line.lineSubtotal || (line.quantity * line.negotiatedUnitPrice);
    const allocatedDiscount = subtotal > 0 ? (calculatedDiscountAmount * lineSubtotal) / subtotal : 0;
    const adjustedTaxable = Math.max(0, lineSubtotal - allocatedDiscount);
    const rate = line.gstRate ?? 18;
    const tax = Math.round((adjustedTaxable * rate) / 100);
    totalGst += tax;
    if (isInterState) {
      igstAmount += tax;
    } else {
      const half = Math.round(tax / 2);
      cgstAmount += half;
      sgstAmount += (tax - half);
    }
  });

  const grandTotal = netTaxableAmount + totalGst;

  const handleCreateInvoice = async () => {
    let clientToUse = client;
    if (!clientToUse) {
      if (clientSearchTerm.trim()) {
        const rawName = clientSearchTerm.trim();
        try {
          const newC = await addClient({
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
        } catch (err: any) {
          alert(err?.message || 'Failed to auto-create client');
          return;
        }
      } else {
        alert("Please select or enter a client name before generating the invoice.");
        return;
      }
    }

    if (lineItems.length === 0 || lineItems.some(item => !item.serviceName.trim())) {
      alert("Please select a service or package for every line item.");
      return;
    }

    const unpricedItem = lineItems.find(it => it.negotiatedUnitPrice <= 0);
    if (unpricedItem) {
      alert(`Please enter a valid rate (> ₹0) for "${unpricedItem.serviceName || 'all line items'}". Custom rate is required.`);
      return;
    }

    if (discountError) {
      alert(discountError);
      return;
    }

    try {
      const newInv = await addInvoice({
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
        documentDiscountType: discountType || 'percentage',
        documentDiscountValue: discountType ? discountValue : 0,
        totalLineSubtotal: subtotal,
        totalItemDiscount: 0,
        documentDiscountAmount: calculatedDiscountAmount,
        totalTaxableAmount: netTaxableAmount,
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
    } catch (err: any) {
      alert(err?.message || 'Failed to create invoice');
    }
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
          <input
            type="search"
            placeholder="Search services by name or category..."
            value={serviceSearchTerm}
            onChange={(e) => setServiceSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px', marginBottom: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              style={{ flex: 1, padding: '0.45rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
            >
              <option value="">Add a package or retainer…</option>
              {filteredPackages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>[Package] {pkg.name} — {formatINR(pkg.finalPrice)}</option>
              ))}
            </select>
            <button type="button" onClick={handleAddPackage} disabled={!selectedPackageId} style={{ padding: '0.45rem 0.75rem', background: '#2563EB', color: '#FFFFFF', borderRadius: '4px', fontSize: '12px', fontWeight: 600, opacity: selectedPackageId ? 1 : 0.5 }}>
              Add Package
            </button>
          </div>
          {services.length === 0 && <div style={{ fontSize: '12px', color: '#B45309' }}>Services are still loading or unavailable.</div>}

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
                    <select
                      value={item.serviceId || ''}
                      onChange={(e) => handleServiceChange(idx, e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', fontWeight: 600 }}
                    >
                      <option value="">-- Choose a service --</option>
                      {filteredServices.map(service => {
                        const isZeroRate = service.defaultPrice === 0 && service.minPrice === 0;
                        return (
                          <option key={service.id} value={service.id}>
                            [{service.category}] {service.serviceName} {isZeroRate ? '— Custom rate required' : `— ${formatINR(service.defaultPrice)}`}
                          </option>
                        );
                      })}
                    </select>
                    {item.billingUnit && <div style={{ fontSize: '11px', color: '#737373', marginTop: '3px' }}>{item.billingUnit}</div>}
                    {item.defaultPrice === 0 && item.minPrice === 0 && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '3px', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>
                        Custom rate required
                      </div>
                    )}
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
                        setLineItems(prev => prev.map((it, i) => {
                          if (i !== idx) return it;
                          const lineSubtotal = qty * it.negotiatedUnitPrice;
                          const taxAmount = Math.round(lineSubtotal * (it.gstRate / 100));
                          return {
                            ...it,
                            quantity: qty,
                            lineSubtotal,
                            taxableAmount: lineSubtotal,
                            taxAmount,
                            lineTotal: lineSubtotal + taxAmount
                          };
                        }));
                      }}
                      style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '8px', width: '140px', textAlign: 'right' }}>
                    <PricingSelector
                      item={item}
                      onSelect={(tier) => {
                        const price = tier === 'MIN' ? item.minPrice : tier === 'DEFAULT' ? item.defaultPrice : item.negotiatedUnitPrice;
                        handlePriceChange(idx, price);
                        setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, selectedTier: tier } : it));
                      }}
                      onCustomChange={(value) => handlePriceChange(idx, value)}
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
          <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Taxable Subtotal:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(subtotal)}</span>
            </div>

            {/* Discount Control Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#374151' }}>Discount:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <select
                  value={discountType}
                  onChange={(e) => {
                    const nextType = e.target.value as '' | 'percentage' | 'fixed';
                    setDiscountType(nextType);
                    if (!nextType) setDiscountValue(0);
                  }}
                  style={{
                    padding: '3px 6px',
                    fontSize: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    color: '#171717'
                  }}
                >
                  <option value="">- Select Type -</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>

                {discountType !== '' && (
                  <>
                    <input
                      type="number"
                      min={0}
                      max={discountType === 'percentage' ? 100 : subtotal}
                      placeholder={discountType === 'percentage' ? '%' : '₹'}
                      value={discountValue === 0 ? '' : discountValue}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === '' ? 0 : Number(raw);
                        setDiscountValue(val < 0 ? 0 : val);
                      }}
                      style={{
                        width: '75px',
                        padding: '3px 6px',
                        fontSize: '12px',
                        border: discountError ? '1px solid #DC2626' : '1px solid #D1D5DB',
                        borderRadius: '4px',
                        textAlign: 'right',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    <button
                      type="button"
                      title="Reset discount"
                      onClick={() => {
                        setDiscountType('');
                        setDiscountValue(0);
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        color: '#6B7280',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        background: '#F9FAFB',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Validation warning if applicable */}
            {discountError && (
              <div style={{ fontSize: '11.5px', color: '#DC2626', textAlign: 'right' }}>
                {discountError}
              </div>
            )}

            {/* Discount Amount Row */}
            {calculatedDiscountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#DC2626' }}>
                <span>Discount Amount:</span>
                <span style={{ fontWeight: 600 }}>- {formatINR(calculatedDiscountAmount)}</span>
              </div>
            )}

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
