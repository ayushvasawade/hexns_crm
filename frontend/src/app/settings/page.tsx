'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  Building, 
  CreditCard, 
  ShieldCheck, 
  Hash, 
  FileText, 
  Save, 
  CheckCircle2,
  Users,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Paperclip
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';

export default function SettingsPage() {
  const { settings, updateSettings } = useCrm();

  const [activeTab, setActiveTab] = useState<'company' | 'bank' | 'sequences' | 'terms' | 'roles'>('company');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Logo & Signature State
  const [logoFileName, setLogoFileName] = useState<string | null>('hexns-logo-black.png');
  const [logoFileSize, setLogoFileSize] = useState<string>('42 KB');
  const [signatureFileName, setSignatureFileName] = useState<string | null>('partner-sign-authorized.png');
  const [signatureFileSize, setSignatureFileSize] = useState<string>('31 KB');

  // Form State
  const [formData, setFormData] = useState({
    legalEntityName: settings.legalEntityName,
    registeredAddress: settings.registeredAddress,
    city: settings.city,
    state: settings.state,
    stateCode: settings.stateCode,
    pinCode: settings.pinCode,
    gstin: settings.gstin,
    pan: settings.pan,
    corporateEmail: settings.corporateEmail,
    corporatePhone: settings.corporatePhone,
    website: settings.website,
    bankName: settings.bank.bankName,
    accountHolder: settings.bank.accountHolder,
    accountNumber: settings.bank.accountNumber,
    ifsc: settings.bank.ifsc,
    branch: settings.bank.branch,
    upiVpa: settings.bank.upiVpa,
    defaultGstRate: settings.defaultGstRate || 18,
    defaultValidityDays: settings.defaultValidityDays || 30,
    defaultPaymentTerms: settings.defaultPaymentTerms || '50% Advance with PO, 50% prior to final asset handover / within 7 days',
    quotationTerms: settings.quotationTerms,
    invoiceStatutoryNote: settings.invoiceStatutoryNote,
    quotationPrefix: settings.quotationPrefix,
    invoicePrefix: settings.invoicePrefix,
    paymentPrefix: settings.paymentPrefix
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      legalEntityName: formData.legalEntityName,
      registeredAddress: formData.registeredAddress,
      city: formData.city,
      state: formData.state,
      stateCode: formData.stateCode,
      pinCode: formData.pinCode,
      gstin: formData.gstin,
      pan: formData.pan,
      corporateEmail: formData.corporateEmail,
      corporatePhone: formData.corporatePhone,
      website: formData.website,
      bank: {
        bankName: formData.bankName,
        accountHolder: formData.accountHolder,
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc,
        branch: formData.branch,
        upiVpa: formData.upiVpa
      },
      defaultGstRate: formData.defaultGstRate,
      defaultValidityDays: formData.defaultValidityDays,
      defaultPaymentTerms: formData.defaultPaymentTerms,
      quotationTerms: formData.quotationTerms,
      invoiceStatutoryNote: formData.invoiceStatutoryNote,
      quotationPrefix: formData.quotationPrefix,
      invoicePrefix: formData.invoicePrefix,
      paymentPrefix: formData.paymentPrefix
    });

    setToastMessage('Settings successfully saved and applied across all modules.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#171717',
          color: '#FFFFFF',
          padding: '0.75rem 1.25rem',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 200,
          fontSize: '13px',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Company Settings & System Preferences
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Configure legal entity profile, bank settlement accounts, invoice sequence prefixes, and permissions.
          </p>
        </div>

        <button 
          onClick={handleSave}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#171717',
            color: '#FFFFFF',
            padding: '0.45rem 1rem',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <Save size={15} />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.25rem' }}>
        {[
          { id: 'company', label: 'Company Profile' },
          { id: 'bank', label: 'Bank Settlement' },
          { id: 'sequences', label: 'Number Sequences' },
          { id: 'terms', label: 'Default Terms & Legal' },
          { id: 'roles', label: 'Roles & Permissions' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '13px',
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#171717' : '#737373',
              borderBottom: activeTab === t.id ? '2px solid #171717' : 'none'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'company' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Statutory Organization Profile</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Legal Entity Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.legalEntityName}
                  onChange={(e) => setFormData({ ...formData, legalEntityName: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Website</label>
                <input 
                  type="text" 
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Registered Office Address</label>
              <input 
                type="text" 
                value={formData.registeredAddress}
                onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>City</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>State</label>
                <input 
                  type="text" 
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>State Code (GST)</label>
                <input 
                  type="text" 
                  value={formData.stateCode}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>PIN Code</label>
                <input 
                  type="text" 
                  value={formData.pinCode}
                  onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>GSTIN *</label>
                <input 
                  type="text" 
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>PAN *</label>
                <input 
                  type="text" 
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Corporate Email</label>
                <input 
                  type="email" 
                  value={formData.corporateEmail}
                  onChange={(e) => setFormData({ ...formData, corporateEmail: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Corporate Phone</label>
                <input 
                  type="text" 
                  value={formData.corporatePhone}
                  onChange={(e) => setFormData({ ...formData, corporatePhone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            {/* Logo and Signature Upload UI */}
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#171717', marginBottom: '4px' }}>
                Brand Assets & Authorized Signatory
              </h3>
              <p style={{ fontSize: '12px', color: '#737373', marginBottom: '1rem' }}>
                Upload high-resolution agency branding and authorized partner signatures for automated placement on print-ready PDFs.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Logo Upload Box */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem', backgroundColor: '#FAFAFA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={15} />
                      <span>Company Logo</span>
                    </span>
                    {logoFileName && (
                      <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: '4px' }}>
                        Active
                      </span>
                    )}
                  </div>

                  {logoFileName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#171717', color: '#FFFFFF', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
                          HEXNS
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#171717' }}>{logoFileName}</div>
                          <div style={{ fontSize: '11px', color: '#737373' }}>{logoFileSize} • High Res Vector / PNG</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLogoFileName(null)}
                        style={{ color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                        title="Remove logo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', border: '2px dashed #D1D5DB', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#FFFFFF' }}>
                      <UploadCloud size={24} color="#6B7280" />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', marginTop: '6px' }}>Click to select company logo</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>PNG, SVG or JPG (Max 2MB)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFileName(file.name);
                            setLogoFileSize(`${Math.round(file.size / 1024)} KB`);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Signature Upload Box */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem', backgroundColor: '#FAFAFA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#171717', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={15} />
                      <span>Authorized Signatory Signature</span>
                    </span>
                    {signatureFileName && (
                      <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: '4px' }}>
                        Active
                      </span>
                    )}
                  </div>

                  {signatureFileName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#F3F4F6', color: '#374151', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', fontSize: '11px', border: '1px solid #E5E7EB' }}>
                          Sign
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#171717' }}>{signatureFileName}</div>
                          <div style={{ fontSize: '11px', color: '#737373' }}>{signatureFileSize} • Transparent PNG Stamp</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSignatureFileName(null)}
                        style={{ color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                        title="Remove signature"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', border: '2px dashed #D1D5DB', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#FFFFFF' }}>
                      <UploadCloud size={24} color="#6B7280" />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', marginTop: '6px' }}>Click to select digital signature</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Transparent PNG recommended (Max 1MB)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSignatureFileName(file.name);
                            setSignatureFileSize(`${Math.round(file.size / 1024)} KB`);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BANK SETTLEMENT */}
        {activeTab === 'bank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Primary Bank Settlement Account</h2>
            <p style={{ fontSize: '13px', color: '#737373' }}>These banking details are displayed on all generated invoices and quotation footers.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Bank Name *</label>
                <input 
                  type="text" 
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Account Beneficiary Name *</label>
                <input 
                  type="text" 
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Current Account Number *</label>
                <input 
                  type="text" 
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>IFSC Code *</label>
                <input 
                  type="text" 
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>UPI VPA ID</label>
                <input 
                  type="text" 
                  value={formData.upiVpa}
                  onChange={(e) => setFormData({ ...formData, upiVpa: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Branch Name & Address</label>
              <input 
                type="text" 
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>
        )}

        {/* TAB 3: NUMBER SEQUENCES */}
        {activeTab === 'sequences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Document Sequence Prefixes</h2>
            <p style={{ fontSize: '13px', color: '#737373' }}>Format: [Prefix][Sequential Number], e.g. HEX/26-27/INV-0047.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Quotation Prefix</label>
                <input 
                  type="text" 
                  value={formData.quotationPrefix}
                  onChange={(e) => setFormData({ ...formData, quotationPrefix: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Tax Invoice Prefix</label>
                <input 
                  type="text" 
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Receipt Prefix</label>
                <input 
                  type="text" 
                  value={formData.paymentPrefix}
                  onChange={(e) => setFormData({ ...formData, paymentPrefix: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DEFAULT TERMS */}
        {activeTab === 'terms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Default Quotation Terms & Financial Policies</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Default GST Rate (%)</label>
                <select
                  value={formData.defaultGstRate}
                  onChange={(e) => setFormData({ ...formData, defaultGstRate: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                >
                  <option value={18}>18% (Standard SAC Services)</option>
                  <option value={12}>12% (Specified Printing / Media)</option>
                  <option value={5}>5% (Transport / Hospitality)</option>
                  <option value={0}>0% (Tax Exempt / SEZ)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Quotation Validity Period (Days)</label>
                <input 
                  type="number" 
                  value={formData.defaultValidityDays}
                  onChange={(e) => setFormData({ ...formData, defaultValidityDays: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Default Payment Terms Clause</label>
              <input 
                type="text" 
                value={formData.defaultPaymentTerms}
                onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Quotation Standard Scope & Legal Terms</label>
              <textarea 
                rows={4}
                value={formData.quotationTerms}
                onChange={(e) => setFormData({ ...formData, quotationTerms: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Invoice Statutory Footnote</label>
              <input 
                type="text" 
                value={formData.invoiceStatutoryNote}
                onChange={(e) => setFormData({ ...formData, invoiceStatutoryNote: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>
        )}

        {/* TAB 5: ROLES & PERMISSIONS */}
        {activeTab === 'roles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#171717' }}>Role-Based Access Control (RBAC) Matrix</h2>
            <p style={{ fontSize: '13px', color: '#737373' }}>Configure operational permissions across finance, sales executives, and leadership.</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>System Capability</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>SuperAdmin</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Finance Manager</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Sales Executive</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Employee</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'View & Create Quotations', sa: true, fin: true, sales: true, emp: false },
                  { name: 'Override Minimum Selling Price Band', sa: true, fin: true, sales: false, emp: false },
                  { name: 'Approve & Issue Tax Invoices', sa: true, fin: true, sales: false, emp: false },
                  { name: 'Log Cash & UTR Settlements', sa: true, fin: true, sales: true, emp: false },
                  { name: 'View Agency Net Profit & Margins', sa: true, fin: true, sales: false, emp: false },
                  { name: 'Access Statutory GSTR-1 Reports', sa: true, fin: true, sales: false, emp: false }
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{row.sa ? '✓' : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{row.fin ? '✓' : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{row.sales ? '✓' : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{row.emp ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <button 
            type="submit"
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#171717',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
}
