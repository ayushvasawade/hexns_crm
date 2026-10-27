'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Copy, 
  Archive, 
  ExternalLink,
  Mail,
  Phone,
  Building,
  CheckCircle,
  FileText,
  CreditCard,
  X,
  RotateCcw,
  Download
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { Client } from '../../types/crm';
import { formatINR, formatDate } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function ClientsPage() {
  const { clients, quotations, invoices, payments, addClient, updateClient, archiveClient, restoreClient } = useCrm();

  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotations' | 'invoices' | 'payments' | 'rates' | 'activity'>('overview');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    legalEntityName: '',
    brandTradeName: '',
    primaryContactPerson: '',
    officialPhone: '',
    mobile: '',
    billingEmail: '',
    registeredAddress: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pinCode: '400001',
    gstRegistered: true,
    gstin: '',
    pan: '',
    placeOfSupply: 'Maharashtra (27)',
    reverseCharge: false,
    taxExempt: false,
    taxExemptReason: '',
    clientSegment: 'Retainer' as 'Retainer' | 'One-Off',
    industryCategory: 'Retail & E-commerce',
    assignedAccountLead: 'Vikram Malhotra',
    internalNotes: '',
    defaultPaymentTerms: '50% Advance + 50% Before Delivery',
    status: 'Active' as 'Active' | 'Archived'
  });

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      c.legalEntityName.toLowerCase().includes(search.toLowerCase()) ||
      c.brandTradeName.toLowerCase().includes(search.toLowerCase()) ||
      c.primaryContactPerson.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      c.gstin.toLowerCase().includes(search.toLowerCase());

    const matchesSegment = segmentFilter === 'All' || c.clientSegment === segmentFilter;
    const matchesState = stateFilter === 'All' || c.state === stateFilter;
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

    return matchesSearch && matchesSegment && matchesState && matchesStatus;
  });

  const handleStateChange = (stateName: string) => {
    const code = stateName === 'Maharashtra' ? '27' : stateName === 'Karnataka' ? '29' : stateName === 'Gujarat' ? '24' : '07';
    setFormData(prev => ({
      ...prev,
      state: stateName,
      stateCode: code,
      placeOfSupply: `${stateName} (${code})`
    }));
  };

  const handleGstinChange = (gst: string) => {
    const upper = gst.toUpperCase();
    const pan = upper.length >= 12 ? upper.substring(2, 12) : '';
    setFormData(prev => ({
      ...prev,
      gstin: upper,
      pan: pan || prev.pan
    }));
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalEntityName) return;

    try {
      await addClient({
        ...formData,
        status: 'Active'
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save client');
    }
  };

  const openClientDetail = (client: Client) => {
    setSelectedClient(client);
    setActiveTab('overview');
  };

  // Client calculations for detail view
  const clientInvoices = selectedClient ? invoices.filter(i => i.clientId === selectedClient.id) : [];
  const clientQuotes = selectedClient ? quotations.filter(q => q.clientId === selectedClient.id) : [];
  const clientPayments = selectedClient ? payments.filter(p => p.clientId === selectedClient.id) : [];

  const totalBilled = clientInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const totalReceived = clientInvoices.reduce((acc, i) => acc + i.amountPaid, 0);
  const totalOutstanding = clientInvoices.reduce((acc, i) => acc + i.balanceDue, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Client Management
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Manage client master directory, GST credentials, credit terms and financial accounts.
          </p>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
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
          <span>+ Add Client</span>
        </button>
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
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={15} color="#9CA3AF" />
          <input 
            type="text" 
            placeholder="Search by company, brand, contact, phone, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select 
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px' }}
          >
            <option value="All">All Segments</option>
            <option value="Retainer">Retainer</option>
            <option value="One-Off">One-Off</option>
          </select>

          <select 
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px' }}
          >
            <option value="All">All States</option>
            <option value="Maharashtra">Maharashtra (27)</option>
            <option value="Karnataka">Karnataka (29)</option>
            <option value="Gujarat">Gujarat (24)</option>
            <option value="Delhi">Delhi (07)</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12.5px' }}
          >
            <option value="Active">Active Only</option>
            <option value="Archived">Archived</option>
            <option value="All">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
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
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Client Entity</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Primary Contact</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>GSTIN / PAN</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>State / Place of Supply</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Segment</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '0.65rem 1rem', fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr 
                  key={client.id}
                  style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.1s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div 
                      onClick={() => openClientDetail(client)} 
                      style={{ fontWeight: 600, color: '#171717', cursor: 'pointer' }}
                    >
                      {client.legalEntityName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#737373' }}>
                      Brand: <span style={{ color: '#171717', fontWeight: 500 }}>{client.brandTradeName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 500 }}>{client.primaryContactPerson}</div>
                    <div style={{ fontSize: '11.5px', color: '#737373' }}>{client.mobile}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                      {client.gstin || 'Unregistered'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#737373' }}>PAN: {client.pan}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div>{client.placeOfSupply}</div>
                    <div style={{ fontSize: '11.5px', color: client.stateCode === '27' ? '#15803D' : '#2563EB' }}>
                      {client.stateCode === '27' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      backgroundColor: client.clientSegment === 'Retainer' ? '#EFF6FF' : '#F3F4F6',
                      color: client.clientSegment === 'Retainer' ? '#1D4ED8' : '#374151',
                      fontWeight: 600
                    }}>
                      {client.clientSegment}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <Badge status={client.status} />
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button 
                        onClick={() => openClientDetail(client)}
                        title="View Client 360"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const dup = await addClient({
                              ...client,
                              legalEntityName: `${client.legalEntityName} (Copy)`,
                              brandTradeName: `${client.brandTradeName} (Copy)`
                            });
                            openClientDetail(dup);
                          } catch (err: any) {
                            alert(err?.message || 'Failed to duplicate client');
                          }
                        }}
                        title="Duplicate Client"
                        style={{ padding: '4px', color: '#4B5563', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <Copy size={15} />
                      </button>
                      {client.status === 'Archived' ? (
                        <button 
                          onClick={() => restoreClient(client.id)}
                          title="Restore Client"
                          style={{ padding: '4px', color: '#15803D', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        >
                          <RotateCcw size={15} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => archiveClient(client.id)}
                          title="Archive Client"
                          style={{ padding: '4px', color: '#EF4444', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        >
                          <Archive size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#737373' }}>
                    No clients found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Client"
        subtitle="Complete client entity registration for billing, GST and contracts."
        maxWidth="680px"
      >
        <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Legal Entity Name *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Apex Consumer Brands Pvt Ltd"
                value={formData.legalEntityName}
                onChange={(e) => setFormData({ ...formData, legalEntityName: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Brand / Trade Name</label>
              <input 
                type="text" 
                placeholder="e.g. Apex Living"
                value={formData.brandTradeName}
                onChange={(e) => setFormData({ ...formData, brandTradeName: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Primary Contact</label>
              <input 
                type="text" 
                placeholder="Ramesh Pillai"
                value={formData.primaryContactPerson}
                onChange={(e) => setFormData({ ...formData, primaryContactPerson: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Mobile Phone *</label>
              <input 
                type="text" 
                required
                placeholder="+91 98200 11223"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Billing Email *</label>
              <input 
                type="email" 
                required
                placeholder="accounts@apex.com"
                value={formData.billingEmail}
                onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Registered Office Address</label>
            <input 
              type="text" 
              placeholder="Suite 501, Business Hub, S.V. Road"
              value={formData.registeredAddress}
              onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
              <select 
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value="Maharashtra">Maharashtra (27)</option>
                <option value="Karnataka">Karnataka (29)</option>
                <option value="Gujarat">Gujarat (24)</option>
                <option value="Delhi">Delhi (07)</option>
              </select>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>GSTIN (15 Alphanumeric)</label>
              <input 
                type="text" 
                maxLength={15}
                placeholder="27AABCT9921M1Z4"
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>PAN</label>
              <input 
                type="text" 
                maxLength={10}
                placeholder="AABCT9921M"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Client Segment</label>
              <select 
                value={formData.clientSegment}
                onChange={(e) => setFormData({ ...formData, clientSegment: e.target.value as any })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value="Retainer">Monthly Retainer</option>
                <option value="One-Off">One-Off Project</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Payment Terms</label>
              <select 
                value={formData.defaultPaymentTerms}
                onChange={(e) => setFormData({ ...formData, defaultPaymentTerms: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option>50% Advance + 50% Before Delivery</option>
                <option>100% Advance</option>
                <option>50% Advance + 50% After Delivery</option>
                <option>30% Advance + 70% After Delivery</option>
              </select>
            </div>
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
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              Register Client
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Detail Drawer / Modal */}
      {selectedClient && (
        <Modal
          isOpen={Boolean(selectedClient)}
          onClose={() => setSelectedClient(null)}
          title={selectedClient.legalEntityName}
          subtitle={`Brand: ${selectedClient.brandTradeName} | Client ID: ${selectedClient.id}`}
          maxWidth="750px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Financial Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11.5px', color: '#737373' }}>Total Billed</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#171717' }}>{formatINR(totalBilled)}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11.5px', color: '#737373' }}>Total Received</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803D' }}>{formatINR(totalReceived)}</div>
              </div>
              <div style={{ padding: '0.75rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF' }}>
                <span style={{ fontSize: '11.5px', color: '#737373' }}>Outstanding Balance</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: totalOutstanding > 0 ? '#DC2626' : '#171717' }}>
                  {formatINR(totalOutstanding)}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.25rem' }}>
              {(['overview', 'quotations', 'invoices', 'payments'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '13px',
                    fontWeight: activeTab === tab ? 600 : 500,
                    color: activeTab === tab ? '#171717' : '#737373',
                    borderBottom: activeTab === tab ? '2px solid #171717' : 'none',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '13px' }}>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Contact Information</span>
                  <div style={{ marginTop: '4px' }}><strong>Contact Person:</strong> {selectedClient.primaryContactPerson}</div>
                  <div><strong>Mobile:</strong> {selectedClient.mobile}</div>
                  <div><strong>Email:</strong> {selectedClient.billingEmail}</div>
                  <div><strong>Office Phone:</strong> {selectedClient.officialPhone}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Tax & GST Specs</span>
                  <div style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {selectedClient.gstin || 'None'}</div>
                  <div><strong>PAN:</strong> {selectedClient.pan}</div>
                  <div><strong>Place of Supply:</strong> {selectedClient.placeOfSupply}</div>
                  <div><strong>Payment Terms:</strong> {selectedClient.defaultPaymentTerms}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '11.5px', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Registered Address</span>
                  <div style={{ marginTop: '2px' }}>
                    {selectedClient.registeredAddress}, {selectedClient.city}, {selectedClient.state} — {selectedClient.pinCode}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'quotations' && (
              <div>
                <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '6px' }}>Quote #</th>
                      <th style={{ padding: '6px' }}>Date</th>
                      <th style={{ padding: '6px' }}>Project</th>
                      <th style={{ padding: '6px' }}>Amount</th>
                      <th style={{ padding: '6px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientQuotes.map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{q.quotationNumber}</td>
                        <td style={{ padding: '6px' }}>{formatDate(q.quotationDate)}</td>
                        <td style={{ padding: '6px' }}>{q.projectTitle}</td>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{formatINR(q.grandTotal)}</td>
                        <td style={{ padding: '6px' }}><Badge status={q.status} /></td>
                      </tr>
                    ))}
                    {clientQuotes.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#737373' }}>No quotations generated yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div>
                <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '6px' }}>Invoice #</th>
                      <th style={{ padding: '6px' }}>Date</th>
                      <th style={{ padding: '6px' }}>Total</th>
                      <th style={{ padding: '6px' }}>Balance Due</th>
                      <th style={{ padding: '6px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '6px' }}>{formatDate(inv.invoiceDate)}</td>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{formatINR(inv.grandTotal)}</td>
                        <td style={{ padding: '6px', color: inv.balanceDue > 0 ? '#DC2626' : '#15803D' }}>{formatINR(inv.balanceDue)}</td>
                        <td style={{ padding: '6px' }}><Badge status={inv.status} /></td>
                      </tr>
                    ))}
                    {clientInvoices.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#737373' }}>No invoices billed yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'payments' && (
              <div>
                <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '6px' }}>Receipt #</th>
                      <th style={{ padding: '6px' }}>Date</th>
                      <th style={{ padding: '6px' }}>Invoice</th>
                      <th style={{ padding: '6px' }}>Amount</th>
                      <th style={{ padding: '6px' }}>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPayments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{p.paymentNumber}</td>
                        <td style={{ padding: '6px' }}>{formatDate(p.paymentDate)}</td>
                        <td style={{ padding: '6px' }}>{p.invoiceNumber}</td>
                        <td style={{ padding: '6px', fontWeight: 600, color: '#15803D' }}>{formatINR(p.amount)}</td>
                        <td style={{ padding: '6px' }}>{p.paymentMode}</td>
                      </tr>
                    ))}
                    {clientPayments.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: '#737373' }}>No payments recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'rates' && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#171717' }}>Client Tier Rate Card Agreement</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    Agreed billing discount: <strong>{selectedClient.clientSegment === 'Retainer' ? '10% Retainer Partner Discount' : 'Standard Rate Card'}</strong> • Default Terms: <strong>{selectedClient.defaultPaymentTerms}</strong>
                  </div>
                </div>

                <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ padding: '6px' }}>Service Vertical</th>
                      <th style={{ padding: '6px' }}>Standard Base Rate</th>
                      <th style={{ padding: '6px' }}>Client Agreed Rate</th>
                      <th style={{ padding: '6px' }}>GST Treatment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>Social Media Management (Cross-Platform)</td>
                      <td style={{ padding: '8px 6px', color: '#6B7280' }}>₹42,000 / mo</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: '#15803D' }}>
                        {selectedClient.clientSegment === 'Retainer' ? '₹37,800 / mo' : '₹42,000 / mo'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{selectedClient.stateCode === '27' ? 'CGST+SGST 18%' : 'IGST 18%'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>Commercial & Cinematic Reels Shoot</td>
                      <td style={{ padding: '8px 6px', color: '#6B7280' }}>₹18,000 / reel</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: '#15803D' }}>
                        {selectedClient.clientSegment === 'Retainer' ? '₹16,200 / reel' : '₹18,000 / reel'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{selectedClient.stateCode === '27' ? 'CGST+SGST 18%' : 'IGST 18%'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>Full-Day Studio Video Production</td>
                      <td style={{ padding: '8px 6px', color: '#6B7280' }}>₹85,000 / day</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: '#15803D' }}>
                        {selectedClient.clientSegment === 'Retainer' ? '₹76,500 / day' : '₹85,000 / day'}
                      </td>
                      <td style={{ padding: '8px 6px' }}>{selectedClient.stateCode === '27' ? 'CGST+SGST 18%' : 'IGST 18%'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'activity' && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#15803D', marginTop: '6px' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#171717' }}>Client Entity Profile Created</div>
                      <div style={{ fontSize: '11.5px', color: '#737373' }}>
                        Registered on {formatDate(selectedClient.createdAt || new Date().toISOString().slice(0, 10))} • Place of Supply: {selectedClient.placeOfSupply}
                      </div>
                    </div>
                  </div>

                  {clientQuotes.map(q => (
                    <div key={q.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', marginTop: '6px' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#171717' }}>Quotation {q.quotationNumber} Generated</div>
                        <div style={{ fontSize: '11.5px', color: '#737373' }}>
                          {formatDate(q.quotationDate)} • Grand Total: {formatINR(q.grandTotal)} • Status: {q.status}
                        </div>
                      </div>
                    </div>
                  ))}

                  {clientInvoices.map(inv => (
                    <div key={inv.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7C3AED', marginTop: '6px' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#171717' }}>Tax Invoice {inv.invoiceNumber} Issued</div>
                        <div style={{ fontSize: '11.5px', color: '#737373' }}>
                          {formatDate(inv.invoiceDate)} • Balance Due: {formatINR(inv.balanceDue)} • Status: {inv.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
