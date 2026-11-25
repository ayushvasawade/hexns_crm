'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  FileText,
  UserPlus
} from 'lucide-react';
import { useCrm } from '../../../context/CrmContext';
import { DocumentLineItem } from '../../../types/crm';
import { formatINR } from '../../../lib/formatters';
import { PricingSelector } from '../../../components/document/PricingSelector';
import { ServiceAutocomplete } from '../../../components/document/ServiceAutocomplete';
import { Modal } from '../../../components/ui/Modal';

const SERVICE_CATEGORIES = [
  'Other / Custom Services',
  'Social Media Management',
  'Reels & Video Content',
  'Photography',
  'Videography & Production',
  'Video Editing',
  'Graphic Design',
  'Branding',
  'Packaging & Product Design',
  'Meta Ads / Performance Marketing',
  'Google Ads',
  'Content Writing',
  'AI Services',
  'Website & Digital',
  'Marketing Strategy',
  'Influencer & Creator Marketing',
  'Events & Launches',
];

const BILLING_UNITS = [
  'Per Deliverable',
  'Per Month',
  'Per Video',
  'Per Hour',
  'Per Post',
  'Per Project',
  'Per Unit',
  'Per Day',
  'Per Campaign',
];

export default function NewInvoicePage() {
  const router = useRouter();
  const { clients, services, packages, quotations, settings, isLoading, addInvoice, addClient, updateClient, addService } = useCrm();

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Client Address & Contact No State
  const [clientContactNo, setClientContactNo] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientBrand, setClientBrand] = useState('');

  // Add Client Modal State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [modalClientName, setModalClientName] = useState('');
  const [modalBrand, setModalBrand] = useState('');
  const [modalContact, setModalContact] = useState('');
  const [modalMobile, setModalMobile] = useState('');
  const [modalAddress, setModalAddress] = useState('');
  const [modalCity, setModalCity] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalGstin, setModalGstin] = useState('');
  const [modalState, setModalState] = useState('Maharashtra');

  // Discount state
  const [discountType, setDiscountType] = useState<'' | 'percentage' | 'fixed'>('');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applyGst, setApplyGst] = useState<boolean>(true);

  const nextInvNum = `${settings.invoicePrefix}${String(Date.now()).slice(-4)}`;
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvNum);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [projectTitle, setProjectTitle] = useState('Brand Retainer & Content Production');
  const [notes, setNotes] = useState('Payment due within 15 days of invoice issue.');

  // Bank details state (optional, blank by default)
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiVpa, setUpiVpa] = useState('');

  const handleUseSavedBank = () => {
    if (settings.bank) {
      setBankName(settings.bank.bankName || '');
      setAccountHolder(settings.bank.accountHolder || '');
      setAccountNumber(settings.bank.accountNumber || '');
      setIfsc(settings.bank.ifsc || '');
      setUpiVpa(settings.bank.upiVpa || '');
    }
  };

  const handleClearBank = () => {
    setBankName('');
    setAccountHolder('');
    setAccountNumber('');
    setIfsc('');
    setUpiVpa('');
  };

  const client = clients.find(c => c.id === selectedClientId) || null;
  const isInterState = client ? client.stateCode !== '27' : false;

  useEffect(() => {
    if (client) {
      setClientContactNo(client.mobile || client.officialPhone || '');
      setClientAddress(client.registeredAddress || '');
      setClientBrand(client.brandTradeName || '');
    } else {
      setClientContactNo('');
      setClientAddress('');
      setClientBrand('');
    }
  }, [selectedClientId, client]);

  const handleQuickAddClient = async (nameToUse?: string) => {
    const rawName = (nameToUse || clientSearchTerm).trim();
    if (!rawName) return;

    try {
      const newClient = await addClient({
        legalEntityName: rawName,
        brandTradeName: rawName,
        primaryContactPerson: '',
        officialPhone: '',
        mobile: '',
        billingEmail: '',
        registeredAddress: '',
        city: '',
        state: 'Maharashtra',
        stateCode: '27',
        pinCode: '',
        gstRegistered: false,
        gstin: '',
        pan: '',
        placeOfSupply: 'Maharashtra (27)',
        reverseCharge: false,
        taxExempt: false,
        clientSegment: 'One-Off',
        industryCategory: 'General Business',
        assignedAccountLead: 'Vikram Malhotra',
        defaultPaymentTerms: 'Net 15',
        status: 'Active'
      });

      setSelectedClientId(newClient.id);
      setClientSearchTerm('');
    } catch (err: any) {
      alert(err?.message || 'Failed to create client');
    }
  };

  const handleModalSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;

    try {
      const newClient = await addClient({
        legalEntityName: modalClientName.trim(),
        brandTradeName: modalBrand.trim() || modalClientName.trim(),
        primaryContactPerson: modalContact.trim(),
        officialPhone: '',
        mobile: modalMobile.trim(),
        billingEmail: modalEmail.trim(),
        registeredAddress: modalAddress.trim(),
        city: modalCity.trim(),
        state: modalState,
        stateCode: modalState === 'Maharashtra' ? '27' : '29',
        pinCode: '',
        gstRegistered: Boolean(modalGstin.trim()),
        gstin: modalGstin.trim(),
        pan: modalGstin.trim().length >= 12 ? modalGstin.trim().substring(2, 12) : '',
        placeOfSupply: `${modalState} (${modalState === 'Maharashtra' ? '27' : '29'})`,
        reverseCharge: false,
        taxExempt: false,
        clientSegment: 'One-Off',
        industryCategory: 'General Business',
        assignedAccountLead: 'Vikram Malhotra',
        defaultPaymentTerms: 'Net 15',
        status: 'Active'
      });

      setSelectedClientId(newClient.id);
      setClientContactNo(modalMobile.trim());
      setClientAddress(modalAddress.trim());
      setClientBrand(modalBrand.trim() || modalClientName.trim());
      setShowAddClientModal(false);
      setModalClientName('');
      setModalBrand('');
      setModalContact('');
      setModalMobile('');
      setModalAddress('');
      setModalCity('');
      setModalEmail('');
      setModalGstin('');
    } catch (err: any) {
      alert(err?.message || 'Failed to create client');
    }
  };

  // Line items
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>([]);

  const createServiceLineItem = (
    service: typeof services[number],
    quantity = 1,
    negotiatedUnitPrice = service.defaultPrice > 0 ? service.defaultPrice : service.minPrice
  ): DocumentLineItem => {
    const lineSubtotal = quantity * negotiatedUnitPrice;
    const tax = Math.round(lineSubtotal * (service.gstRate / 100));
    const selectedTier = service.defaultPrice > 0 ? 'DEFAULT' : service.minPrice > 0 ? 'MIN' : 'CUSTOM';

    return {
      id: `ili-${Date.now()}-${service.id}`,
      serviceId: String(service.id),
      serviceName: service.serviceName,
      category: service.category,
      description: service.description,
      sacCode: service.sacCode,
      quantity,
      billingUnit: service.billingUnit,
      minPrice: service.minPrice,
      defaultPrice: service.defaultPrice,
      maxPrice: service.maxPrice,
      selectedTier,
      negotiatedUnitPrice,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal,
      taxableAmount: lineSubtotal,
      gstRate: service.gstRate,
      taxAmount: tax,
      lineTotal: lineSubtotal + tax,
    };
  };

  const createPackageLineItem = (pkg: typeof packages[number]): DocumentLineItem => {
    const minPrice = pkg.minPrice ?? 0;
    const selectedTier: 'DEFAULT' | 'MIN' | 'CUSTOM' =
      pkg.finalPrice > 0 ? 'DEFAULT' : minPrice > 0 ? 'MIN' : 'CUSTOM';
    const negotiatedUnitPrice = pkg.finalPrice > 0 ? pkg.finalPrice : minPrice;
    const lineSubtotal = negotiatedUnitPrice;
    const taxAmount = Math.round(lineSubtotal * (pkg.gstRate / 100));

    return {
      id: `pkg-${Date.now()}-${pkg.id}`,
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
      negotiatedUnitPrice,
      isBelowMinWarning: false,
      itemDiscountType: 'fixed',
      itemDiscountValue: 0,
      itemDiscountAmount: 0,
      lineSubtotal,
      taxableAmount: lineSubtotal,
      gstRate: pkg.gstRate,
      taxAmount,
      lineTotal: lineSubtotal + taxAmount,
    };
  };

  // Handle Quotation Import
  const handleImportQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    const q = quotations.find(quote => quote.id === quoteId);
    if (!q) return;

    setSelectedClientId(q.clientId);
    setProjectTitle(q.projectTitle);
    setLineItems([...q.lineItems]);
    setNotes(`Billed against agreed quotation ${q.quotationNumber}.`);
    if (q.applyGst !== undefined) {
      setApplyGst(q.applyGst);
    }
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

  const handleAddOtherService = (initialName = '') => {
    const newItem: DocumentLineItem = {
      id: `other-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serviceId: '__OTHER__',
      isOther: true,
      saveToCatalogue: false,
      isSavedToCatalogue: false,
      serviceName: initialName,
      category: 'Other / Custom Services',
      description: '',
      sacCode: '998311',
      quantity: 1,
      billingUnit: 'Per Deliverable',
      minPrice: 0,
      defaultPrice: 0,
      maxPrice: 0,
      selectedTier: 'CUSTOM',
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

  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);

  const handleSaveLineItemToCatalogue = async (index: number) => {
    const item = lineItems[index];
    if (!item) return;
    if (!item.serviceName.trim()) {
      alert("Please enter a service name before saving to the catalogue.");
      return;
    }
    try {
      setSavingServiceId(item.id);
      const created = await addService({
        serviceName: item.serviceName.trim(),
        category: item.category || 'Other / Custom Services',
        description: item.description || '',
        billingUnit: item.billingUnit || 'Per Deliverable',
        sacCode: item.sacCode || '998311',
        minPrice: item.negotiatedUnitPrice > 0 ? item.negotiatedUnitPrice : 0,
        defaultPrice: item.negotiatedUnitPrice > 0 ? item.negotiatedUnitPrice : 0,
        maxPrice: item.negotiatedUnitPrice > 0 ? Math.round(item.negotiatedUnitPrice * 1.5) : 0,
        internalCostPrice: 0,
        gstRate: item.gstRate || 18,
        status: 'Active',
      });

      setLineItems(prev => prev.map((it, i) => i === index ? {
        ...it,
        serviceId: created.id,
        isOther: false,
        saveToCatalogue: false,
        isSavedToCatalogue: true
      } : it));
      alert(`Service "${created.serviceName}" has been added to your service catalogue!`);
    } catch (err: any) {
      alert(err?.message || 'Failed to save service to catalogue');
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleAddService = (serviceId: string) => {
    const service = services.find(item => String(item.id) === String(serviceId));
    if (!service) return;
    setLineItems(prev => [...prev, createServiceLineItem(service)]);
  };

  const handleAddPackage = () => {
    const pkg = packages.find(item => item.id === selectedPackageId);
    if (!pkg) return;

    if (lineItems.some(item => item.packageId === pkg.id)) {
      alert(`Package "${pkg.name}" has already been added.`);
      setSelectedPackageId('');
      return;
    }

    setLineItems(prev => [...prev, createPackageLineItem(pkg)]);
    setSelectedPackageId('');
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    if (serviceId === '__OTHER__') {
      setLineItems(prev => prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          serviceId: '__OTHER__',
          isOther: true,
          saveToCatalogue: false,
          isSavedToCatalogue: false,
          category: item.category || 'Other / Custom Services',
          billingUnit: item.billingUnit || 'Per Deliverable',
          minPrice: 0,
          defaultPrice: 0,
          maxPrice: 0,
          selectedTier: 'CUSTOM',
        };
      }));
      return;
    }

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
        isOther: false,
        saveToCatalogue: false,
        isSavedToCatalogue: false,
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

  if (applyGst) {
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
  }

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
            primaryContactPerson: '',
            officialPhone: '',
            mobile: clientContactNo || '',
            billingEmail: '',
            registeredAddress: clientAddress || '',
            city: '',
            state: 'Maharashtra',
            stateCode: '27',
            pinCode: '',
            gstRegistered: false,
            gstin: '',
            pan: '',
            placeOfSupply: 'Maharashtra (27)',
            reverseCharge: false,
            taxExempt: false,
            clientSegment: 'One-Off',
            industryCategory: 'General Business',
            assignedAccountLead: 'Vikram Malhotra',
            defaultPaymentTerms: 'Net 15',
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
      // Auto-save any custom line items marked with saveToCatalogue
      const processedLines = [...lineItems];
      for (let i = 0; i < processedLines.length; i++) {
        const item = processedLines[i];
        if (item.saveToCatalogue && !item.isSavedToCatalogue && item.serviceName.trim()) {
          try {
            const created = await addService({
              serviceName: item.serviceName.trim(),
              category: item.category || 'Other / Custom Services',
              description: item.description || '',
              billingUnit: item.billingUnit || 'Per Deliverable',
              sacCode: item.sacCode || '998311',
              minPrice: item.negotiatedUnitPrice > 0 ? item.negotiatedUnitPrice : 0,
              defaultPrice: item.negotiatedUnitPrice > 0 ? item.negotiatedUnitPrice : 0,
              maxPrice: item.negotiatedUnitPrice > 0 ? Math.round(item.negotiatedUnitPrice * 1.5) : 0,
              internalCostPrice: 0,
              gstRate: item.gstRate || 18,
              status: 'Active',
            });
            processedLines[i] = {
              ...item,
              serviceId: created.id,
              isOther: false,
              saveToCatalogue: false,
              isSavedToCatalogue: true
            };
          } catch (saveErr) {
            console.error('Failed to auto-save custom service:', saveErr);
          }
        }
      }

      const newInv = await addInvoice({
        invoiceNumber,
        quotationId: selectedQuoteId || undefined,
        clientId: clientToUse.id,
        clientName: clientToUse.legalEntityName,
        clientAddress: clientAddress.trim(),
        clientPhone: clientContactNo.trim(),
        brandName: clientBrand.trim() || clientToUse.brandTradeName,
        projectTitle,
        invoiceDate,
        dueDate,
        placeOfSupply: clientToUse.placeOfSupply,
        isInterState: clientToUse.stateCode !== '27',
        applyGst,
        lineItems: processedLines,
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
        bankDetails: {
          bankName: bankName.trim(),
          accountHolder: accountHolder.trim(),
          accountNumber: accountNumber.trim(),
          ifsc: ifsc.trim(),
          branch: '',
          upiVpa: upiVpa.trim(),
        }
      });

      if (clientToUse && (
        clientContactNo.trim() !== (clientToUse.mobile || '') ||
        clientAddress.trim() !== (clientToUse.registeredAddress || '') ||
        clientBrand.trim() !== (clientToUse.brandTradeName || '')
      )) {
        try {
          await updateClient(clientToUse.id, {
            registeredAddress: clientAddress.trim(),
            mobile: clientContactNo.trim(),
            brandTradeName: clientBrand.trim() || clientToUse.legalEntityName,
          });
        } catch (e) {
          console.error('Failed to sync client profile:', e);
        }
      }

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

        {/* Client Selection & Information Card */}
        <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Client / Brand Information
            </span>
            <button
              type="button"
              onClick={() => {
                setModalClientName(clientSearchTerm.trim());
                setModalBrand(clientSearchTerm.trim());
                setShowAddClientModal(true);
              }}
              style={{
                padding: '0.35rem 0.65rem',
                border: '1px solid #D1D5DB',
                borderRadius: '5px',
                fontSize: '11.5px',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                color: '#171717',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <UserPlus size={13} />
              <span>Add New Client</span>
            </button>
          </div>

          {client ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Billing Entity & Brand</span>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#171717', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{client.legalEntityName}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClientId('')}
                    style={{ border: 'none', background: 'transparent', color: '#2563EB', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Change Client
                  </button>
                </div>
                <div style={{ marginTop: '6px' }}>
                  <label style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Brand Name:</label>
                  <input
                    type="text"
                    value={clientBrand}
                    onChange={(e) => setClientBrand(e.target.value)}
                    placeholder="Brand Name"
                    style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Contact Number</span>
                <input
                  type="text"
                  value={clientContactNo}
                  onChange={(e) => setClientContactNo(e.target.value)}
                  placeholder="Contact No / Phone (leave blank if none)"
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', marginTop: '2px' }}
                />
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>GST & Place of Supply</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px', marginTop: '1px' }}>
                    {client.gstin || 'Unregistered'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: client.stateCode === '27' ? '#15803D' : '#2563EB', fontWeight: 600 }}>
                    {client.placeOfSupply}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Address (Leave blank if none)</span>
                <textarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Client registered address (leave blank if none)"
                  rows={3}
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12px', marginTop: '2px', resize: 'vertical' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Select Client Entity</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontSize: '12.5px' }}
                >
                  <option value="">-- Choose Existing Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.legalEntityName} {c.brandTradeName ? `(${c.brandTradeName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Or Quick Add by Name</label>
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
                    style={{ padding: '0.45rem 0.75rem', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}
                  >
                    Quick Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#171717', textTransform: 'uppercase' }}>
              Invoice Line Deliverables
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => handleAddOtherService()}
                style={{
                  padding: '0.35rem 0.75rem',
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} />
                <span>+ Add Other / Custom Service</span>
              </button>
              <button 
                type="button" 
                onClick={handleAddLine}
                style={{ padding: '0.35rem 0.75rem', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add Line Item
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <ServiceAutocomplete
              services={services}
              isLoading={isLoading}
              onSelect={(service) => handleAddService(service.id)}
              onSelectOther={(customName) => handleAddOtherService(customName)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              style={{ flex: 1, padding: '0.45rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
            >
              <option value="">Add a package or retainer…</option>
              {packages.map(pkg => (
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
                <th style={{ padding: '8px', textAlign: 'left' }}>Service / Package</th>
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
                    {item.packageId ? (
                      <>
                        <div style={{ fontWeight: 700, color: '#171717' }}>{item.serviceName}</div>
                        {item.description && (
                          <div style={{ marginTop: '3px', fontSize: '11.5px', color: '#737373' }}>{item.description}</div>
                        )}
                      </>
                    ) : (item.isOther || item.serviceId === '__OTHER__') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '1px 6px' }}>
                            ✨ Other / Custom Service
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, isOther: false, serviceId: '' } : it));
                            }}
                            style={{ fontSize: '11px', color: '#6B7280', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            Select from catalogue instead
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Enter service name (e.g. Influencer Collaboration Shoot) *"
                            value={item.serviceName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, serviceName: val } : it));
                            }}
                            style={{ width: '100%', padding: '5px 8px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '12.5px', fontWeight: 600 }}
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Deliverable description or scope notes (optional)"
                            value={item.description || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, description: val } : it));
                            }}
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11.5px', color: '#4B5563' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10.5px', color: '#6B7280', marginBottom: '2px' }}>Category</label>
                            <select
                              value={item.category || 'Other / Custom Services'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, category: val } : it));
                              }}
                              style={{ width: '100%', padding: '3px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11.5px' }}
                            >
                              {SERVICE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '10.5px', color: '#6B7280', marginBottom: '2px' }}>Billing Unit</label>
                            <select
                              value={item.billingUnit || 'Per Deliverable'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, billingUnit: val } : it));
                              }}
                              style={{ width: '100%', padding: '3px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11.5px' }}
                            >
                              {BILLING_UNITS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#374151', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(item.saveToCatalogue)}
                              disabled={item.isSavedToCatalogue}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, saveToCatalogue: checked } : it));
                              }}
                            />
                            <span>Save to service catalogue</span>
                          </label>
                          {item.isSavedToCatalogue ? (
                            <span style={{ fontSize: '11px', color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                              <Check size={12} /> Saved in catalogue
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={savingServiceId === item.id || !item.serviceName.trim()}
                              onClick={() => handleSaveLineItemToCatalogue(idx)}
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '4px',
                                color: '#1D4ED8',
                                cursor: item.serviceName.trim() ? 'pointer' : 'not-allowed',
                                opacity: item.serviceName.trim() ? 1 : 0.6
                              }}
                            >
                              {savingServiceId === item.id ? 'Saving...' : '+ Save to Catalogue Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <select
                        value={item.serviceId || ''}
                        onChange={(e) => handleServiceChange(idx, e.target.value)}
                        style={{ width: '100%', padding: '4px 6px', border: '1px solid #E5E7EB', borderRadius: '4px', fontWeight: 600 }}
                      >
                        <option value="">-- Choose a service --</option>
                        <option value="__OTHER__">✨ Other / Custom Service (Not in list)</option>
                        {services.map(service => {
                          const isZeroRate = service.defaultPrice === 0 && service.minPrice === 0;
                          return (
                            <option key={service.id} value={service.id}>
                              [{service.category}] {service.serviceName} {isZeroRate ? '— Custom rate required' : `— ${formatINR(service.defaultPrice)}`}
                            </option>
                          );
                        })}
                      </select>
                    )}
                    {item.billingUnit && !item.isOther && item.serviceId !== '__OTHER__' && (
                      <div style={{ fontSize: '11px', color: '#737373', marginTop: '3px' }}>{item.billingUnit}</div>
                    )}

                    {!item.isOther && item.serviceId !== '__OTHER__' && item.defaultPrice === 0 && item.minPrice === 0 && (
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
                    {(item.isOther || item.serviceId === '__OTHER__') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>₹</span>
                          <input
                            type="number"
                            min={0}
                            value={item.negotiatedUnitPrice || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              handlePriceChange(idx, val);
                            }}
                            style={{ width: '90px', padding: '4px 6px', border: '1px solid #D1D5DB', borderRadius: '4px', textAlign: 'right', fontWeight: 700 }}
                          />
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#6B7280' }}>Rate per {item.billingUnit || 'item'}</span>
                      </div>
                    ) : (
                      <PricingSelector
                        item={item}
                        onSelect={(tier) => {
                          const price = tier === 'MIN' ? item.minPrice : tier === 'DEFAULT' ? item.defaultPrice : item.negotiatedUnitPrice;
                          handlePriceChange(idx, price);
                          setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, selectedTier: tier } : it));
                        }}
                        onCustomChange={(value) => handlePriceChange(idx, value)}
                      />
                    )}
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

        {/* Settlement & Totals Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem' }}>
          {/* Left Column: Bank Settlement Details (Optional) & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Bank Details Section */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: '1rem',
              backgroundColor: '#F9FAFB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#171717' }}>
                    Bank Settlement Details (Optional)
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                    Leave blank to omit from the invoice, or customize remittance details.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleUseSavedBank}
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
                  {(bankName || accountHolder || accountNumber || ifsc || upiVpa) && (
                    <button
                      type="button"
                      onClick={handleClearBank}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563' }}>Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank Ltd"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px', marginTop: '2px', backgroundColor: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563' }}>Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HEXNS Mediaworks LLP"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px', marginTop: '2px', backgroundColor: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563' }}>Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50200084920194"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px', marginTop: '2px', backgroundColor: '#FFFFFF', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563' }}>IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0000084"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px', marginTop: '2px', backgroundColor: '#FFFFFF', fontFamily: 'monospace' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563' }}>UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. hexnsmediaworks@hdfcbank"
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px', marginTop: '2px', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>
            </div>

            {/* Terms / Notes */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Terms / Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12px', marginTop: '4px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Right Column: Totals Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
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

            {/* Apply GST Toggle Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#374151' }}>Apply GST:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setApplyGst(true)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: applyGst ? '1px solid #16A34A' : '1px solid #D1D5DB',
                    backgroundColor: applyGst ? '#DCFCE7' : '#FFFFFF',
                    color: applyGst ? '#15803D' : '#6B7280',
                    cursor: 'pointer'
                  }}
                >
                  Yes (18%)
                </button>
                <button
                  type="button"
                  onClick={() => setApplyGst(false)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: !applyGst ? '1px solid #4B5563' : '1px solid #D1D5DB',
                    backgroundColor: !applyGst ? '#F3F4F6' : '#FFFFFF',
                    color: !applyGst ? '#1F2937' : '#6B7280',
                    cursor: 'pointer'
                  }}
                >
                  No (0%)
                </button>
              </div>
            </div>

            {applyGst && (
              !isInterState ? (
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
              )
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #171717', paddingTop: '6px', marginTop: '4px' }}>
              <span style={{ fontWeight: 800 }}>Invoice Grand Total:</span>
              <span style={{ fontWeight: 800, fontSize: '17px' }}>{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Client Entity Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title="Add Client Entity"
        subtitle="The client will be created and selected for this invoice."
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
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Brand Name (Optional)</label>
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
                placeholder="Primary Contact"
                value={modalContact}
                onChange={(e) => setModalContact(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Contact / Mobile Phone (Optional - leave blank if none)</label>
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
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Registered Address (Optional - leave blank if none)</label>
            <textarea 
              rows={2}
              placeholder="Enter client address if available (otherwise leave blank)"
              value={modalAddress}
              onChange={(e) => setModalAddress(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>City (Optional)</label>
              <input 
                type="text" 
                placeholder="Kolhapur / Mumbai"
                value={modalCity}
                onChange={(e) => setModalCity(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>GSTIN (Optional)</label>
              <input 
                type="text" 
                maxLength={15}
                placeholder="27AABCA1234M1Z5"
                value={modalGstin}
                onChange={(e) => setModalGstin(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Billing Email (Optional)</label>
            <input 
              type="email" 
              placeholder="billing@client.com"
              value={modalEmail}
              onChange={(e) => setModalEmail(e.target.value)}
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
              style={{ padding: '0.5rem 1.25rem', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Save & Select Client
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
