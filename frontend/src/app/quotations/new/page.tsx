'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Copy, 
  AlertTriangle, 
  Check, 
  Eye, 
  Printer, 
  Save, 
  FileText,
  UserPlus,
  Layers,
  Info,
  Search,
  Building,
  CheckCircle2,
  X,
  Edit2
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { Client, DocumentLineItem, PriceTier } from '../../../types/crm';
import { formatINR, formatDate, numberToWordsINR } from '../../../lib/formatters';
import { Modal } from '../../../components/ui/Modal';

export default function QuotationBuilderPage() {
  const router = useRouter();
  const { clients, services, packages, settings, addQuotation, addClient } = useCrm();

  const [step, setStep] = useState<number>(1);

  // Stepper 1: Client Selection & Search Auto-Append
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Stepper 2: Quotation Details
  const defaultQuoteNum = `${settings.quotationPrefix}${String(Date.now()).slice(-4)}`;
  const [quotationNumber, setQuotationNumber] = useState(defaultQuoteNum);
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(15);
  const [projectTitle, setProjectTitle] = useState('Digital Brand & Social Media Campaign');
  const [salesExecutive, setSalesExecutive] = useState('Vikram Malhotra');

  // Stepper 3: Line Items (Selected Services & Packages)
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState(services[0]?.id || '');
  const [selectedPackageToAdd, setSelectedPackageToAdd] = useState(packages[0]?.id || '');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState(10000);

  const [lineItems, setLineItems] = useState<DocumentLineItem[]>([
    {
      id: 'li-init-1',
      serviceId: services[0]?.id,
      serviceName: services[0]?.serviceName || 'Instagram Management',
      category: services[0]?.category || 'Social Media Management',
      description: services[0]?.description || 'Complete feed curation and reel production',
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

  // Stepper 4: Discounts and GST
  const [documentDiscountType, setDocumentDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [documentDiscountValue, setDocumentDiscountValue] = useState<number>(0);

  // Stepper 5: Terms & Preview
  const [paymentTerms, setPaymentTerms] = useState('50% Advance + 50% Before Delivery');
  const [deliveryTimeline, setDeliveryTimeline] = useState('30 Days from advance sign-off');
  const [scopeNotes, setScopeNotes] = useState('Includes 2 rounds of creative revisions for each deliverable.');
  const [exclusions, setExclusions] = useState('Third-party ad spends and model fees are payable directly by the client.');
  const [termsAndConditions, setTermsAndConditions] = useState(settings.quotationTerms);
  const [internalNotes, setInternalNotes] = useState('');

  // Quick Client Form Modal State
  const [modalClientName, setModalClientName] = useState('');
  const [modalBrand, setModalBrand] = useState('');
  const [modalContact, setModalContact] = useState('');
  const [modalMobile, setModalMobile] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalGstin, setModalGstin] = useState('');
  const [modalState, setModalState] = useState('Maharashtra');

  // Selected Client Entity
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return clients;
    const q = clientSearchTerm.toLowerCase().trim();
    return clients.filter(c => 
      c.legalEntityName.toLowerCase().includes(q) ||
      c.brandTradeName.toLowerCase().includes(q) ||
      c.primaryContactPerson.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      c.mobile.includes(q)
    );
  }, [clients, clientSearchTerm]);

  // Check if an exact match already exists
  const hasExactClientMatch = useMemo(() => {
    const q = clientSearchTerm.trim().toLowerCase();
    if (!q) return false;
    return clients.some(c => 
      c.legalEntityName.toLowerCase() === q || 
      c.brandTradeName.toLowerCase() === q
    );
  }, [clients, clientSearchTerm]);

  // 1-Click Quick Add & Append Client from search query
  const handleQuickAddAndSelectClient = (nameToUse?: string) => {
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
      assignedAccountLead: salesExecutive,
      defaultPaymentTerms: paymentTerms,
      status: 'Active'
    });

    setSelectedClientId(newClient.id);
    setClientSearchTerm('');
  };

  // Open modal prefilled with search name
  const handleOpenAddClientModalWithSearch = () => {
    const name = clientSearchTerm.trim();
    setModalClientName(name);
    setModalBrand(name);
    setShowAddClientModal(true);
  };

  // Determine intra-state vs inter-state from client Place of Supply
  const isInterState = selectedClient ? selectedClient.stateCode !== '27' : false;
  const validUntilDate = useMemo(() => {
    const d = new Date(quotationDate);
    d.setDate(d.getDate() + validityDays);
    return d.toISOString().split('T')[0];
  }, [quotationDate, validityDays]);

  // Handle adding service
  const handleAddServiceItem = () => {
    const srv = services.find(s => s.id === selectedServiceToAdd);
    if (!srv) return;

    const newItem: DocumentLineItem = {
      id: `li-${Date.now()}`,
      serviceId: srv.id,
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

  // Handle adding package
  const handleAddPackageItem = () => {
    const pkg = packages.find(p => p.id === selectedPackageToAdd);
    if (!pkg) return;

    if (pkg.presentationMode === 'Consolidated') {
      const newItem: DocumentLineItem = {
        id: `li-pkg-${Date.now()}`,
        serviceName: pkg.name,
        category: 'Bundled Package',
        description: pkg.description,
        sacCode: '998311',
        quantity: 1,
        billingUnit: 'Turnkey',
        minPrice: pkg.finalPrice * 0.9,
        defaultPrice: pkg.finalPrice,
        maxPrice: pkg.standardPrice,
        selectedTier: 'DEFAULT',
        negotiatedUnitPrice: pkg.finalPrice,
        isBelowMinWarning: false,
        itemDiscountType: 'fixed',
        itemDiscountValue: 0,
        itemDiscountAmount: 0,
        lineSubtotal: pkg.finalPrice,
        taxableAmount: pkg.finalPrice,
        gstRate: pkg.gstRate,
        taxAmount: Math.round(pkg.finalPrice * (pkg.gstRate / 100)),
        lineTotal: Math.round(pkg.finalPrice * (1 + pkg.gstRate / 100))
      };
      setLineItems(prev => [...prev, newItem]);
    } else {
      // Itemized: Add each item with the first carrying the total fee or proportional
      const itemizedLines: DocumentLineItem[] = pkg.items.map((it, idx) => ({
        id: `li-pkg-${Date.now()}-${idx}`,
        serviceName: `${it.serviceName} (${pkg.name})`,
        category: 'Package Deliverable',
        description: `Deliverable included under ${pkg.name}`,
        sacCode: '998311',
        quantity: it.quantity,
        billingUnit: it.unit,
        minPrice: it.defaultUnitPrice,
        defaultPrice: it.defaultUnitPrice,
        maxPrice: it.defaultUnitPrice,
        selectedTier: 'DEFAULT',
        negotiatedUnitPrice: idx === 0 ? pkg.finalPrice : 0,
        isBelowMinWarning: false,
        itemDiscountType: 'fixed',
        itemDiscountValue: 0,
        itemDiscountAmount: 0,
        lineSubtotal: idx === 0 ? pkg.finalPrice : 0,
        taxableAmount: idx === 0 ? pkg.finalPrice : 0,
        gstRate: pkg.gstRate,
        taxAmount: idx === 0 ? Math.round(pkg.finalPrice * (pkg.gstRate / 100)) : 0,
        lineTotal: idx === 0 ? Math.round(pkg.finalPrice * (1 + pkg.gstRate / 100)) : 0
      }));
      setLineItems(prev => [...prev, ...itemizedLines]);
    }
  };

  // Handle adding custom item
  const handleAddCustomItem = () => {
    if (!customItemName) return;
    const newItem: DocumentLineItem = {
      id: `li-custom-${Date.now()}`,
      serviceName: customItemName,
      category: 'Custom Scope',
      description: 'Custom client negotiated service deliverable',
      sacCode: '998311',
      quantity: 1,
      billingUnit: 'Per Deliverable',
      minPrice: customItemPrice,
      defaultPrice: customItemPrice,
      maxPrice: customItemPrice * 1.5,
      selectedTier: 'CUSTOM',
      negotiatedUnitPrice: customItemPrice,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal: customItemPrice,
      taxableAmount: customItemPrice,
      gstRate: 18,
      taxAmount: Math.round(customItemPrice * 0.18),
      lineTotal: Math.round(customItemPrice * 1.18)
    };
    setLineItems(prev => [...prev, newItem]);
    setCustomItemName('');
  };

  // Tier Quick Picker: MIN, DEFAULT, MAX
  const handleSelectTier = (index: number, tier: PriceTier) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      let newPrice = item.defaultPrice;
      if (tier === 'MIN') newPrice = item.minPrice;
      if (tier === 'MAX') newPrice = item.maxPrice;

      const subtotal = item.quantity * newPrice;
      const discountAmt = item.itemDiscountType === 'percentage' 
        ? (subtotal * item.itemDiscountValue) / 100 
        : item.itemDiscountValue;
      const taxable = Math.max(0, subtotal - discountAmt);
      const tax = Math.round(taxable * (item.gstRate / 100));

      return {
        ...item,
        selectedTier: tier,
        negotiatedUnitPrice: newPrice,
        isBelowMinWarning: newPrice < item.minPrice,
        itemDiscountAmount: discountAmt,
        lineSubtotal: subtotal,
        taxableAmount: taxable,
        taxAmount: tax,
        lineTotal: taxable + tax
      };
    }));
  };

  // Manual Negotiated Price Edit
  const handleNegotiatedPriceChange = (index: number, val: number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      const subtotal = item.quantity * val;
      const discountAmt = item.itemDiscountType === 'percentage' 
        ? (subtotal * item.itemDiscountValue) / 100 
        : item.itemDiscountValue;
      const taxable = Math.max(0, subtotal - discountAmt);
      const tax = Math.round(taxable * (item.gstRate / 100));

      return {
        ...item,
        selectedTier: 'CUSTOM',
        negotiatedUnitPrice: val,
        isBelowMinWarning: val < item.minPrice,
        itemDiscountAmount: discountAmt,
        lineSubtotal: subtotal,
        taxableAmount: taxable,
        taxAmount: tax,
        lineTotal: taxable + tax
      };
    }));
  };

  // Quantity Change
  const handleQuantityChange = (index: number, qty: number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const safeQty = Math.max(1, qty);
      const subtotal = safeQty * item.negotiatedUnitPrice;
      const discountAmt = item.itemDiscountType === 'percentage' 
        ? (subtotal * item.itemDiscountValue) / 100 
        : item.itemDiscountValue;
      const taxable = Math.max(0, subtotal - discountAmt);
      const tax = Math.round(taxable * (item.gstRate / 100));

      return {
        ...item,
        quantity: safeQty,
        itemDiscountAmount: discountAmt,
        lineSubtotal: subtotal,
        taxableAmount: taxable,
        taxAmount: tax,
        lineTotal: taxable + tax
      };
    }));
  };

  // Item Discount Change
  const handleItemDiscountChange = (index: number, type: 'percentage' | 'fixed', val: number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const subtotal = item.quantity * item.negotiatedUnitPrice;
      const discountAmt = type === 'percentage' ? (subtotal * val) / 100 : val;
      const taxable = Math.max(0, subtotal - discountAmt);
      const tax = Math.round(taxable * (item.gstRate / 100));

      return {
        ...item,
        itemDiscountType: type,
        itemDiscountValue: val,
        itemDiscountAmount: discountAmt,
        taxableAmount: taxable,
        taxAmount: tax,
        lineTotal: taxable + tax
      };
    }));
  };

  // Remove Item
  const handleRemoveLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Duplicate Item
  const handleDuplicateLineItem = (index: number) => {
    const it = lineItems[index];
    setLineItems(prev => [...prev, { ...it, id: `li-dup-${Date.now()}` }]);
  };

  // Document Totals Calculations
  const totalLineSubtotal = useMemo(() => {
    return lineItems.reduce((acc, it) => acc + it.lineSubtotal, 0);
  }, [lineItems]);

  const totalItemDiscount = useMemo(() => {
    return lineItems.reduce((acc, it) => acc + it.itemDiscountAmount, 0);
  }, [lineItems]);

  const linesTaxableSum = totalLineSubtotal - totalItemDiscount;

  const documentDiscountAmount = useMemo(() => {
    if (documentDiscountType === 'percentage') {
      return (linesTaxableSum * documentDiscountValue) / 100;
    }
    return documentDiscountValue;
  }, [linesTaxableSum, documentDiscountType, documentDiscountValue]);

  const totalTaxableAmount = Math.max(0, linesTaxableSum - documentDiscountAmount);

  // GST Breakdown
  const totalGst = Math.round(totalTaxableAmount * 0.18);
  const cgstAmount = isInterState ? 0 : Math.round(totalGst / 2);
  const sgstAmount = isInterState ? 0 : Math.round(totalGst / 2);
  const igstAmount = isInterState ? totalGst : 0;
  const grandTotal = totalTaxableAmount + totalGst;

  // Handle Save
  const handleSaveQuotation = (status: 'Draft' | 'Sent') => {
    let clientToUse = selectedClient;
    if (!clientToUse) {
      if (clientSearchTerm.trim()) {
        const rawName = clientSearchTerm.trim();
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
          assignedAccountLead: salesExecutive,
          defaultPaymentTerms: paymentTerms,
          status: 'Active'
        });
        setSelectedClientId(newClient.id);
        clientToUse = newClient;
      } else {
        alert("Please select or type a client name before saving the quotation.");
        setStep(1);
        return;
      }
    }

    if (lineItems.length === 0) {
      alert("Please add at least one service deliverable.");
      return;
    }

    const saved = addQuotation({
      quotationNumber,
      revisionNumber: 1,
      clientId: clientToUse.id,
      clientName: clientToUse.legalEntityName,
      projectTitle,
      quotationDate,
      validUntil: validUntilDate,
      placeOfSupply: clientToUse.placeOfSupply,
      isInterState: clientToUse.stateCode !== '27',
      salesExecutive,
      lineItems,
      documentDiscountType,
      documentDiscountValue,
      totalLineSubtotal,
      totalItemDiscount,
      documentDiscountAmount,
      totalTaxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal,
      paymentTerms,
      deliveryTimeline,
      validityDays,
      scopeNotes,
      exclusions,
      termsAndConditions,
      internalNotes,
      status
    });

    router.push(`/quotations/${saved.id}`);
  };

  // Add Client Modal submission
  const handleModalSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName) return;

    const newC = addClient({
      legalEntityName: modalClientName,
      brandTradeName: modalBrand || modalClientName,
      primaryContactPerson: modalContact || "Account Lead",
      officialPhone: "+91 22 2800 0000",
      mobile: modalMobile || "+91 98000 00000",
      billingEmail: modalEmail || "billing@client.com",
      registeredAddress: "Andheri Commercial Hub",
      city: "Mumbai",
      state: modalState,
      pinCode: "400069",
      gstRegistered: Boolean(modalGstin),
      gstin: modalGstin || "27AABCT9999M1Z8",
      pan: modalGstin ? modalGstin.substring(2, 12) : "AABCT9999M",
      stateCode: modalState === 'Maharashtra' ? '27' : '29',
      placeOfSupply: `${modalState} (${modalState === 'Maharashtra' ? '27' : '29'})`,
      reverseCharge: false,
      taxExempt: false,
      clientSegment: 'One-Off',
      industryCategory: 'General Commerce',
      assignedAccountLead: salesExecutive,
      defaultPaymentTerms: paymentTerms,
      status: 'Active'
    });

    setSelectedClientId(newC.id);
    setShowAddClientModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/quotations" style={{ padding: '6px', border: '1px solid #E5E7EB', borderRadius: '6px', color: '#4B5563', display: 'flex' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
              Quotation Builder
            </h1>
            <p style={{ fontSize: '13px', color: '#737373' }}>
              Create multi-service estimate for {selectedClient?.brandTradeName || 'Client'}.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => handleSaveQuotation('Draft')}
            style={{
              padding: '0.45rem 0.9rem',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: '#171717',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Save size={14} />
            <span>Save Draft</span>
          </button>
          <button 
            onClick={() => handleSaveQuotation('Sent')}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#171717',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Check size={14} />
            <span>Generate & Send</span>
          </button>
        </div>
      </div>

      {/* Stepper Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: '#FFFFFF',
        padding: '0.5rem',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        overflowX: 'auto'
      }}>
        {[
          { num: 1, label: '1. Client' },
          { num: 2, label: '2. Details' },
          { num: 3, label: '3. Services & Pricing' },
          { num: 4, label: '4. Discounts & GST' },
          { num: 5, label: '5. Terms & A4 Preview' }
        ].map(s => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: step === s.num ? 700 : 500,
              backgroundColor: step === s.num ? '#171717' : 'transparent',
              color: step === s.num ? '#FFFFFF' : '#4B5563',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: Client Selection & Search Auto-Append */}
      {step === 1 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Client Entity</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Search existing clients or type a name to automatically add them to this quotation.
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => handleOpenAddClientModalWithSearch()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#171717',
                backgroundColor: '#FFFFFF'
              }}
            >
              <UserPlus size={14} />
              <span>+ Add Client (Full Form)</span>
            </button>
          </div>

          {/* Search Input Bar */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '6px' }}>
              Search or Enter Client Name *
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '12px', color: '#9CA3AF', pointerEvents: 'none', display: 'flex' }}>
                <Search size={16} />
              </div>
              <input 
                type="text"
                placeholder="Type client or brand name (e.g. Acme Media Corp, Tata Motors)..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!hasExactClientMatch && clientSearchTerm.trim()) {
                      handleQuickAddAndSelectClient();
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 2.4rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#171717'
                }}
              />
              {clientSearchTerm && (
                <button 
                  type="button"
                  onClick={() => setClientSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    color: '#9CA3AF',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    padding: '2px'
                  }}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <p style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px' }}>
              💡 If the client does not exist, type their name and press <strong>Enter</strong> or click <strong>Quick Add</strong> to append them automatically.
            </p>
          </div>

          {/* Auto-Append / Not Found Prompt when user types a new client name */}
          {clientSearchTerm.trim() && !hasExactClientMatch && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#FAFAFA',
              border: '1px dashed #D1D5DB',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} style={{ color: '#171717' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#171717' }}>
                    Client &quot;{clientSearchTerm.trim()}&quot; not found in records
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Would you like to add and append this client to your quotation right now?
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickAddAndSelectClient()}
                  style={{
                    padding: '0.45rem 1rem',
                    backgroundColor: '#171717',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} />
                  <span>Quick Add &quot;{clientSearchTerm.trim()}&quot; & Select</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddClientModalWithSearch}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#4B5563',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  Add with Full Details...
                </button>
              </div>
            </div>
          )}

          {/* Client Suggestions List (when typing or searching) */}
          {clientSearchTerm.trim() && filteredClients.length > 0 && (
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF'
            }}>
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                Existing Matching Clients ({filteredClients.length})
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {filteredClients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedClientId(c.id);
                      setClientSearchTerm('');
                    }}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderBottom: '1px solid #F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                      backgroundColor: selectedClientId === c.id ? '#F9FAFB' : '#FFFFFF'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedClientId === c.id ? '#F9FAFB' : '#FFFFFF')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#171717' }}>
                        {c.legalEntityName} {c.brandTradeName && c.brandTradeName !== c.legalEntityName ? `(${c.brandTradeName})` : ''}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                        {c.placeOfSupply} • {c.gstin || 'Unregistered'} • Contact: {c.primaryContactPerson} ({c.mobile})
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: '0.3rem 0.65rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#171717',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Client Card */}
          {selectedClient ? (
            <div style={{
              padding: '1.25rem',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ color: '#15803D' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Selected Client for Quotation
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedClientId('');
                      setClientSearchTerm('');
                    }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '5px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#4B5563',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Search size={12} />
                    <span>Change Client</span>
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Billing Entity</span>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#171717', marginTop: '2px' }}>{selectedClient.legalEntityName}</div>
                  <div style={{ fontSize: '12px', color: '#4B5563' }}>Brand: {selectedClient.brandTradeName}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>GST & Place of Supply</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>{selectedClient.gstin || 'Unregistered'}</div>
                  <div style={{ fontSize: '12px', color: selectedClient.stateCode === '27' ? '#15803D' : '#2563EB', fontWeight: 600 }}>
                    {selectedClient.placeOfSupply} ({selectedClient.stateCode === '27' ? 'Intra-State CGST+SGST' : 'Inter-State IGST'})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Contact & Terms</span>
                  <div style={{ marginTop: '2px', fontWeight: 500 }}>{selectedClient.primaryContactPerson} ({selectedClient.mobile})</div>
                  <div style={{ fontSize: '12px', color: '#4B5563' }}>{selectedClient.defaultPaymentTerms}</div>
                </div>
              </div>
            </div>
          ) : !clientSearchTerm.trim() && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#FAFAFA',
              border: '1px dashed #D1D5DB',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Building size={28} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: '#171717', fontSize: '13.5px' }}>
                {clients.length === 0 ? 'No clients in records yet' : 'No client selected'}
              </p>
              <p style={{ fontSize: '12.5px', color: '#6B7280', maxWidth: '400px', margin: '4px auto 12px' }}>
                Type the client or company name in the search bar above. If it does not exist, it will be automatically appended to your quotation.
              </p>
              {clients.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {clients.slice(0, 4).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClientId(c.id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        border: '1px solid #E5E7EB',
                        borderRadius: '20px',
                        fontSize: '12px',
                        color: '#171717',
                        backgroundColor: '#FFFFFF',
                        fontWeight: 500
                      }}
                    >
                      {c.brandTradeName || c.legalEntityName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => {
                if (selectedClient) {
                  setStep(2);
                } else if (clientSearchTerm.trim()) {
                  handleQuickAddAndSelectClient();
                  setStep(2);
                } else {
                  alert("Please type a client name or select an existing client to proceed.");
                }
              }}
              style={{ padding: '0.55rem 1.35rem', background: '#171717', color: '#FFFFFF', borderRadius: '6px', fontWeight: 600, fontSize: '13.5px' }}
            >
              Next: Quotation Details →
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: Quotation Details */}
      {step === 2 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Quotation Parameters</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Quotation Number</label>
              <input 
                type="text" 
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Quotation Date</label>
              <input 
                type="date" 
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Validity (Days)</label>
              <input 
                type="number" 
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
              <span style={{ fontSize: '11px', color: '#737373' }}>Expires on: {formatDate(validUntilDate)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Project / Campaign Reference *</label>
              <input 
                type="text" 
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Autumn Product Shoot & Performance Ads"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Sales Account Lead</label>
              <input 
                type="text" 
                value={salesExecutive}
                onChange={(e) => setSalesExecutive(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button 
              onClick={() => setStep(1)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}
            >
              ← Back to Client
            </button>
            <button 
              onClick={() => setStep(3)}
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '6px', fontWeight: 600 }}
            >
              Next: Services & Price Tiers →
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: Services & Mandatory Price Tier Quick Selectors */}
      {step === 3 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Service Deliverables & Price Selection</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Quick-pick Min, Default, or Max price. Rates remain editable with margin safety warnings.
              </p>
            </div>
          </div>

          {/* Add Item Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr auto',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '6px'
          }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>
                Pick from 16 FRS Catalogue Verticals
              </label>
              <select 
                value={selectedServiceToAdd}
                onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px', fontSize: '13px' }}
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.category}] {s.serviceName} — Default: {formatINR(s.defaultPrice)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>
                Or Pick Bundled Package
              </label>
              <select 
                value={selectedPackageToAdd}
                onChange={(e) => setSelectedPackageToAdd(e.target.value)}
                style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '2px', fontSize: '13px' }}
              >
                {packages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({formatINR(p.finalPrice)})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={handleAddServiceItem}
                style={{ padding: '0.5rem 0.85rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontSize: '12.5px', fontWeight: 600 }}
              >
                + Add Service
              </button>
              <button 
                type="button" 
                onClick={handleAddPackageItem}
                style={{ padding: '0.5rem 0.85rem', background: '#2563EB', color: '#FFFFFF', borderRadius: '4px', fontSize: '12.5px', fontWeight: 600 }}
              >
                + Add Package
              </button>
            </div>
          </div>

          {/* Line Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {lineItems.map((item, idx) => (
              <div 
                key={item.id}
                style={{
                  padding: '1rem',
                  border: item.isBelowMinWarning ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                  backgroundColor: item.isBelowMinWarning ? '#FFF5F5' : '#FFFFFF',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' }}>
                      {item.category || 'Service'} • SAC {item.sacCode}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>{item.serviceName}</h3>
                    <p style={{ fontSize: '12px', color: '#737373' }}>{item.description}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button 
                      onClick={() => handleDuplicateLineItem(idx)}
                      style={{ padding: '4px', color: '#4B5563', border: '1px solid #E5E7EB', borderRadius: '4px' }}
                      title="Duplicate Line"
                    >
                      <Copy size={13} />
                    </button>
                    <button 
                      onClick={() => handleRemoveLineItem(idx)}
                      style={{ padding: '4px', color: '#DC2626', border: '1px solid #E5E7EB', borderRadius: '4px' }}
                      title="Remove Line"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* MANDATORY PRICE SELECTION CONTROLS */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr 120px 140px 140px',
                  gap: '1rem',
                  alignItems: 'center',
                  backgroundColor: item.isBelowMinWarning ? 'transparent' : '#F9FAFB',
                  padding: '0.75rem',
                  borderRadius: '6px'
                }}>
                  {/* Quick Pick Buttons */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
                      Tier Selector (Quick Pick)
                    </label>
                    <div style={{ display: 'inline-flex', borderRadius: '4px', border: '1px solid #D1D5DB', overflow: 'hidden' }}>
                      <button 
                        type="button"
                        onClick={() => handleSelectTier(idx, 'MIN')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: item.selectedTier === 'MIN' ? '#D97706' : '#FFFFFF',
                          color: item.selectedTier === 'MIN' ? '#FFFFFF' : '#4B5563',
                          borderRight: '1px solid #D1D5DB'
                        }}
                      >
                        Min ({formatINR(item.minPrice)})
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSelectTier(idx, 'DEFAULT')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: item.selectedTier === 'DEFAULT' ? '#171717' : '#FFFFFF',
                          color: item.selectedTier === 'DEFAULT' ? '#FFFFFF' : '#4B5563',
                          borderRight: '1px solid #D1D5DB'
                        }}
                      >
                        Default ({formatINR(item.defaultPrice)})
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSelectTier(idx, 'MAX')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: item.selectedTier === 'MAX' ? '#16A34A' : '#FFFFFF',
                          color: item.selectedTier === 'MAX' ? '#FFFFFF' : '#4B5563'
                        }}
                      >
                        Max ({formatINR(item.maxPrice)})
                      </button>
                    </div>
                  </div>

                  {/* Negotiated Unit Price */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#171717', display: 'block', marginBottom: '3px' }}>
                      Negotiated Unit Price (₹) *
                    </label>
                    <input 
                      type="number"
                      value={item.negotiatedUnitPrice}
                      onChange={(e) => handleNegotiatedPriceChange(idx, Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: item.isBelowMinWarning ? '1px solid #DC2626' : '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>

                  {/* Quantity & Unit */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
                      Qty ({item.billingUnit})
                    </label>
                    <input 
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                    />
                  </div>

                  {/* Item Discount */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '3px' }}>
                      Item Discount (₹)
                    </label>
                    <input 
                      type="number"
                      value={item.itemDiscountValue}
                      onChange={(e) => handleItemDiscountChange(idx, 'fixed', Number(e.target.value))}
                      style={{ width: '100%', padding: '4px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                    />
                  </div>

                  {/* Line Total */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#737373' }}>Taxable: {formatINR(item.taxableAmount)}</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>
                      {formatINR(item.lineTotal)}
                    </div>
                  </div>
                </div>

                {/* Below Min Warning Banner */}
                {item.isBelowMinWarning && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontSize: '12px', fontWeight: 500 }}>
                    <AlertTriangle size={15} />
                    <span>
                      Negotiated rate ({formatINR(item.negotiatedUnitPrice)}) is below the minimum selling price of {formatINR(item.minPrice)}. Manager authorization will be flagged.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button 
              onClick={() => setStep(2)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}
            >
              ← Back to Details
            </button>
            <button 
              onClick={() => setStep(4)}
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '6px', fontWeight: 600 }}
            >
              Next: Discounts & GST →
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: Discounts and GST Calculations */}
      {step === 4 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Document Discounts & GST Computation</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Discount Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid #E5E7EB', paddingRight: '1.5rem' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717' }}>Overall Document Discount</span>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                  <input 
                    type="radio" 
                    name="docDisc" 
                    checked={documentDiscountType === 'fixed'}
                    onChange={() => setDocumentDiscountType('fixed')}
                  />
                  <span>Fixed Amount (₹)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                  <input 
                    type="radio" 
                    name="docDisc" 
                    checked={documentDiscountType === 'percentage'}
                    onChange={() => setDocumentDiscountType('percentage')}
                  />
                  <span>Percentage (%)</span>
                </label>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
                  Discount Value {documentDiscountType === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <input 
                  type="number"
                  value={documentDiscountValue}
                  onChange={(e) => setDocumentDiscountValue(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '6px', fontSize: '12.5px', color: '#4B5563' }}>
                <strong>GST Rules Engine:</strong>
                <p style={{ marginTop: '2px' }}>
                  Company Registered State: <strong>Maharashtra (27)</strong>.<br />
                  Client Place of Supply: <strong>{selectedClient?.placeOfSupply || 'Maharashtra (27)'}</strong>.<br />
                  {isInterState ? (
                    <span style={{ color: '#2563EB', fontWeight: 600 }}>• Applied Tax: IGST @ 18% (Inter-State Trade)</span>
                  ) : (
                    <span style={{ color: '#15803D', fontWeight: 600 }}>• Applied Tax: CGST 9% + SGST 9% (Intra-State Trade)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Live Financial Breakdown Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ color: '#737373' }}>Gross Subtotal:</span>
                <span style={{ fontWeight: 600 }}>{formatINR(totalLineSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ color: '#737373' }}>Item Discounts:</span>
                <span style={{ color: '#DC2626' }}>− {formatINR(totalItemDiscount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ color: '#737373' }}>Document Discount:</span>
                <span style={{ color: '#DC2626' }}>− {formatINR(documentDiscountAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #E5E7EB', fontWeight: 700 }}>
                <span>Taxable Amount (Base):</span>
                <span>{formatINR(totalTaxableAmount)}</span>
              </div>

              {!isInterState ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px', color: '#4B5563' }}>
                    <span>CGST (9%):</span>
                    <span>{formatINR(cgstAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px', color: '#4B5563' }}>
                    <span>SGST (9%):</span>
                    <span>{formatINR(sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px', color: '#2563EB' }}>
                  <span>IGST (18%):</span>
                  <span>{formatINR(igstAmount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #171717', marginTop: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800 }}>Grand Total Payable:</span>
                <span style={{ fontSize: '20px', fontWeight: 800, color: '#171717' }}>{formatINR(grandTotal)}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#737373', textAlign: 'right' }}>
                {numberToWordsINR(grandTotal)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button 
              onClick={() => setStep(3)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}
            >
              ← Back to Pricing
            </button>
            <button 
              onClick={() => setStep(5)}
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '6px', fontWeight: 600 }}
            >
              Next: Review Terms & A4 Preview →
            </button>
          </div>
        </div>
      )}

      {/* SECTION 5: Terms & Client-Facing A4 Preview */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Terms Editor Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Terms & Sign-Off Conditions</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Terms</label>
                <select 
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                >
                  <option>100% Advance</option>
                  <option>50% Advance + 50% Before Delivery</option>
                  <option>50% Advance + 50% After Delivery</option>
                  <option>30% Advance + 70% After Delivery</option>
                  <option>Custom Terms</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Delivery Timeline</label>
                <input 
                  type="text" 
                  value={deliveryTimeline}
                  onChange={(e) => setDeliveryTimeline(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Terms and Conditions</label>
              <textarea 
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Client-Facing Print-Ready A4 Document Preview */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '2.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
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
                  QUOTATION
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px', fontFamily: 'monospace' }}>
                  {quotationNumber}
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>Date: {formatDate(quotationDate)}</div>
                <div style={{ fontSize: '12px', color: '#737373' }}>Valid Until: {formatDate(validUntilDate)}</div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Quotation Prepared For:</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>
                  {selectedClient?.legalEntityName || clientSearchTerm || 'Client Entity'}
                </div>
                <div style={{ color: '#4B5563' }}>Brand: {selectedClient?.brandTradeName || selectedClient?.legalEntityName || 'Brand'}</div>
                <div style={{ color: '#4B5563' }}>{selectedClient?.registeredAddress || 'Registered Office'}, {selectedClient?.city || 'Mumbai'}</div>
                <div style={{ color: '#4B5563' }}>GSTIN: <strong>{selectedClient?.gstin || 'Unregistered'}</strong></div>
                <div style={{ color: '#4B5563' }}>Attn: {selectedClient?.primaryContactPerson || 'Primary Contact'} ({selectedClient?.mobile || '+91 98000 00000'})</div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#737373', textTransform: 'uppercase' }}>Project Reference:</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>{projectTitle}</div>
                <div style={{ color: '#4B5563', marginTop: '4px' }}>Place of Supply: <strong>{selectedClient?.placeOfSupply || 'Maharashtra (27)'}</strong></div>
                <div style={{ color: '#4B5563' }}>Sales Lead: {salesExecutive}</div>
                <div style={{ color: '#4B5563' }}>Payment Terms: {paymentTerms}</div>
              </div>
            </div>

            {/* Deliverables Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #171717', borderBottom: '1px solid #171717' }}>
                  <th style={{ padding: '8px' }}>#</th>
                  <th style={{ padding: '8px' }}>Description of Service</th>
                  <th style={{ padding: '8px' }}>SAC</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Discount</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px', color: '#737373' }}>{idx + 1}</td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{item.serviceName}</div>
                      <div style={{ fontSize: '11.5px', color: '#737373' }}>{item.description}</div>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.sacCode}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity} {item.billingUnit}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatINR(item.negotiatedUnitPrice)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: item.itemDiscountAmount > 0 ? '#DC2626' : '#737373' }}>
                      {item.itemDiscountAmount > 0 ? `−${formatINR(item.itemDiscountAmount)}` : '—'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                      {formatINR(item.taxableAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ maxWidth: '420px', fontSize: '12px', color: '#4B5563' }}>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#171717' }}>Terms & Exclusions:</span>
                <p style={{ marginTop: '2px', whiteSpace: 'pre-line' }}>{termsAndConditions}</p>
                <div style={{ marginTop: '6px' }}><strong>Exclusions:</strong> {exclusions}</div>
              </div>

              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Taxable Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(totalTaxableAmount)}</span>
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
                  <span style={{ fontWeight: 800 }}>Total Payable:</span>
                  <span style={{ fontWeight: 800, fontSize: '16px' }}>{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Bank & Signatures */}
            <div style={{
              borderTop: '1px solid #E5E7EB',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '12px'
            }}>
              <div>
                <strong>Bank Settlement Account:</strong><br />
                A/C Holder: {settings.bank.accountHolder}<br />
                Bank: {settings.bank.bankName} | A/C: {settings.bank.accountNumber}<br />
                IFSC: {settings.bank.ifsc} | UPI: {settings.bank.upiVpa}
              </div>

              <div style={{ textAlign: 'center', minWidth: '160px' }}>
                <div style={{ height: '40px', borderBottom: '1px dashed #737373', marginBottom: '4px' }} />
                <span>Authorized Signatory</span><br />
                <strong style={{ fontSize: '11px' }}>{settings.legalEntityName}</strong>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button 
              onClick={() => setStep(4)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}
            >
              ← Back to Discounts
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => window.print()}
                style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Printer size={14} />
                <span>Print Document</span>
              </button>
              <button 
                onClick={() => handleSaveQuotation('Sent')}
                style={{ padding: '0.5rem 1.5rem', background: '#171717', color: '#FFFFFF', borderRadius: '6px', fontWeight: 700 }}
              >
                Finalize & Save Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title="Add Client Entity"
        subtitle="Data will be automatically preserved in this quotation."
      >
        <form onSubmit={handleModalSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Legal Entity Name *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Acme Consumer Retail LLP"
              value={modalClientName}
              onChange={(e) => setModalClientName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Brand Name</label>
              <input 
                type="text" 
                placeholder="Acme"
                value={modalBrand}
                onChange={(e) => setModalBrand(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Contact Person</label>
              <input 
                type="text" 
                placeholder="Ramesh Pillai"
                value={modalContact}
                onChange={(e) => setModalContact(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Mobile Phone</label>
              <input 
                type="text" 
                placeholder="+91 98200 00000"
                value={modalMobile}
                onChange={(e) => setModalMobile(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>State (Place of Supply)</label>
              <select 
                value={modalState}
                onChange={(e) => setModalState(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value="Maharashtra">Maharashtra (27 - Intra-State)</option>
                <option value="Karnataka">Karnataka (29 - Inter-State)</option>
                <option value="Gujarat">Gujarat (24 - Inter-State)</option>
                <option value="Delhi">Delhi (07 - Inter-State)</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>GSTIN</label>
            <input 
              type="text" 
              maxLength={15}
              placeholder="27AABCA1234M1Z5"
              value={modalGstin}
              onChange={(e) => setModalGstin(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowAddClientModal(false)}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Add & Select Client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
