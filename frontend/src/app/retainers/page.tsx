'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Repeat, 
  Search, 
  Plus, 
  Calendar, 
  Check, 
  Clock, 
  Eye, 
  Building,
  DollarSign,
  Edit,
  Play,
  Pause,
  Trash2,
  Download
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { Retainer, RetainerFrequency } from '../../types/crm';
import { formatINR, formatDate } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function RetainersPage() {
  const { retainers, clients, services, addRetainer, updateRetainer, deleteRetainer } = useCrm();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRetainerId, setEditingRetainerId] = useState<string | null>(null);
  const [previewRetainer, setPreviewRetainer] = useState<Retainer | null>(null);
  const [deleteConfirmRet, setDeleteConfirmRet] = useState<Retainer | null>(null);

  // Form State
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [retainerName, setRetainerName] = useState('');
  const [recurringAmount, setRecurringAmount] = useState(75000);
  const [frequency, setFrequency] = useState<RetainerFrequency>('Monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  const [nextBillingDate, setNextBillingDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [autoGenerate, setAutoGenerate] = useState(true);

  // Total MRR
  const totalMrr = retainers
    .filter(r => r.status === 'Active')
    .reduce((acc, r) => acc + (r.frequency === 'Monthly' ? r.recurringAmount : r.recurringAmount / 3), 0);

  const handleOpenAddModal = () => {
    setEditingRetainerId(null);
    setClientId(clients[0]?.id || '');
    setRetainerName('');
    setRecurringAmount(75000);
    setFrequency('Monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
    setNextBillingDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setAutoGenerate(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (ret: Retainer) => {
    setEditingRetainerId(ret.id);
    setClientId(ret.clientId);
    setRetainerName(ret.retainerName);
    setRecurringAmount(ret.recurringAmount);
    setFrequency(ret.frequency);
    setStartDate(ret.startDate);
    setExpiryDate(ret.expiryDate);
    setNextBillingDate(ret.nextBillingDate);
    setAutoGenerate(ret.autoGenerateInvoice);
    setIsAddModalOpen(true);
  };

  const handleSaveRetainer = (e: React.FormEvent) => {
    e.preventDefault();
    const cl = clients.find(c => c.id === clientId);
    if (!cl || !retainerName) return;

    if (editingRetainerId) {
      updateRetainer(editingRetainerId, {
        retainerName,
        clientId: cl.id,
        clientName: cl.legalEntityName,
        recurringAmount,
        frequency,
        startDate,
        expiryDate,
        nextBillingDate,
        autoGenerateInvoice: autoGenerate
      });
    } else {
      addRetainer({
        retainerName,
        clientId: cl.id,
        clientName: cl.legalEntityName,
        includedServices: ["Instagram Management", "Facebook Management", "4x Reel Shoot + Edit"],
        recurringAmount,
        frequency,
        startDate,
        expiryDate,
        nextBillingDate,
        autoGenerateInvoice: autoGenerate,
        status: 'Active'
      });
    }

    setIsAddModalOpen(false);
    setEditingRetainerId(null);
  };

  const handleToggleStatus = (ret: Retainer) => {
    const nextStatus = ret.status === 'Active' ? 'Paused' : 'Active';
    updateRetainer(ret.id, { status: nextStatus });
  };

  const handleDelete = () => {
    if (!deleteConfirmRet) return;
    deleteRetainer(deleteConfirmRet.id);
    setDeleteConfirmRet(null);
  };

  const handleExportCSV = () => {
    const headers = ['Retainer ID', 'Contract Name', 'Client Name', 'Recurring Amount (INR)', 'Frequency', 'Start Date', 'Expiry Date', 'Next Billing Date', 'Auto Generate Invoice', 'Status'];
    const rows = filteredRetainers.map(r => [
      r.id,
      `"${r.retainerName.replace(/"/g, '""')}"`,
      `"${r.clientName.replace(/"/g, '""')}"`,
      r.recurringAmount,
      r.frequency,
      r.startDate,
      r.expiryDate,
      r.nextBillingDate,
      r.autoGenerateInvoice ? 'Yes' : 'No',
      r.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HEXNS_Retainers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRetainers = retainers.filter(r => 
    r.retainerName.toLowerCase().includes(search.toLowerCase()) ||
    r.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Recurring Retainer Contracts
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Active Monthly Recurring Revenue (MRR): <strong style={{ color: '#15803D' }}>{formatINR(totalMrr)}</strong> / month across {retainers.filter(r => r.status === 'Active').length} active client retainers.
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
            onClick={handleOpenAddModal}
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
            <span>+ New Retainer</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: '#FFFFFF',
        padding: '0.65rem 1rem',
        border: '1px solid #E5E7EB',
        borderRadius: '8px'
      }}>
        <Search size={15} color="#9CA3AF" />
        <input 
          type="text" 
          placeholder="Search retainers by contract name or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
        />
      </div>

      {/* Retainers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {filteredRetainers.map(ret => (
          <div 
            key={ret.id}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8'
                }}>
                  {ret.frequency} Billing
                </span>
                <Badge status={ret.status} />
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#171717', marginTop: '8px' }}>
                {ret.retainerName}
              </h2>
              <div style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500, marginTop: '2px' }}>
                Client: <strong>{ret.clientName}</strong>
              </div>

              {/* Deliverables */}
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#737373', textTransform: 'uppercase' }}>
                  Contract Deliverables
                </span>
                {ret.includedServices.map((srv, idx) => (
                  <span key={idx} style={{ fontSize: '12px', color: '#4B5563' }}>• {srv}</span>
                ))}
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '12px', color: '#4B5563', backgroundColor: '#F9FAFB', padding: '0.5rem', borderRadius: '4px' }}>
                <div>Next Billing: <strong>{formatDate(ret.nextBillingDate)}</strong></div>
                <div>Expiry: {formatDate(ret.expiryDate)}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid #E5E7EB',
              paddingTop: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#737373' }}>Recurring Billing Amount</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#171717' }}>
                  {formatINR(ret.recurringAmount)} <span style={{ fontSize: '12px', fontWeight: 400, color: '#737373' }}>/ {ret.frequency.toLowerCase()}</span>
                </div>
              </div>              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button 
                  onClick={() => setPreviewRetainer(ret)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151'
                  }}
                >
                  <Eye size={13} />
                  <span>Draft Preview</span>
                </button>
                <button 
                  onClick={() => handleToggleStatus(ret)}
                  style={{
                    padding: '0.35rem 0.5rem',
                    color: ret.status === 'Active' ? '#D97706' : '#15803D',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF'
                  }}
                  title={ret.status === 'Active' ? 'Pause Retainer' : 'Resume Retainer'}
                >
                  {ret.status === 'Active' ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button 
                  onClick={() => handleOpenEditModal(ret)}
                  style={{ padding: '0.35rem 0.5rem', color: '#2563EB', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                  title="Edit Retainer"
                >
                  <Edit size={13} />
                </button>
                <button 
                  onClick={() => setDeleteConfirmRet(ret)}
                  style={{ padding: '0.35rem 0.5rem', color: '#DC2626', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                  title="Delete Retainer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Retainer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRetainerId(null);
        }}
        title={editingRetainerId ? "Edit Retainer Contract" : "Create Recurring Retainer Contract"}
        subtitle="Establish automated retainer billing for client accounts."
      >
        <form onSubmit={handleSaveRetainer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Client Entity *</label>
            <select 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            >
              {clients.length === 0 && <option value="">No clients registered yet (Add a client first)</option>}
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.legalEntityName} ({c.brandTradeName})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Retainer Contract Title *</label>
            <input 
              type="text"
              required
              placeholder="e.g. Monthly Omnichannel Social & Reel Production"
              value={retainerName}
              onChange={(e) => setRetainerName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Recurring Amount (₹) *</label>
              <input 
                type="number"
                required
                value={recurringAmount}
                onChange={(e) => setRecurringAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Billing Frequency</label>
              <select 
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Semi-Annual">Semi-Annual</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Contract Start Date</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Next Invoice Date</label>
              <input 
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
            />
            <span>Automatically generate draft invoice on next billing date</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingRetainerId(null);
              }}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
            >
              {editingRetainerId ? "Update Retainer" : "Create Retainer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Retainer Confirmation Modal */}
      {deleteConfirmRet && (
        <Modal
          isOpen={Boolean(deleteConfirmRet)}
          onClose={() => setDeleteConfirmRet(null)}
          title="Delete Retainer Contract"
          subtitle="This will permanently delete this retainer contract."
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '13px', color: '#374151' }}>
              Are you sure you want to delete retainer <strong>{deleteConfirmRet.retainerName}</strong> for client <strong>{deleteConfirmRet.clientName}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmRet(null)}
                style={{ padding: '0.45rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{ padding: '0.45rem 1rem', background: '#DC2626', color: '#FFFFFF', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}
              >
                Delete Retainer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Retainer Draft Preview Modal */}
      {previewRetainer && (
        <Modal
          isOpen={Boolean(previewRetainer)}
          onClose={() => setPreviewRetainer(null)}
          title={`Recurring Invoice Draft Preview: ${previewRetainer.retainerName}`}
          subtitle={`Client: ${previewRetainer.clientName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '13px' }}>
            <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
              <div><strong>Recurring Deliverables:</strong></div>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '4px', color: '#4B5563' }}>
                {previewRetainer.includedServices.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <div style={{ marginTop: '0.5rem' }}>
                Recurring Base Amount: <strong>{formatINR(previewRetainer.recurringAmount)}</strong><br />
                Applicable 18% GST: <strong>{formatINR(Math.round(previewRetainer.recurringAmount * 0.18))}</strong><br />
                Total Monthly Payable: <strong>{formatINR(Math.round(previewRetainer.recurringAmount * 1.18))}</strong>
              </div>
            </div>

            <p style={{ color: '#737373', fontSize: '12px' }}>
              Note: This is a frontend demonstration draft preview. On live production servers, cron workers automatically instantiate these invoice drafts on the 1st of each billing cycle.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button 
                onClick={() => setPreviewRetainer(null)}
                style={{ padding: '0.45rem 1rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
