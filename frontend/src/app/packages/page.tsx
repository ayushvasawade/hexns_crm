'use client';

import React, { useState } from 'react';
import { 
  PackageCheck, 
  Search, 
  Plus, 
  Check, 
  Copy, 
  Edit, 
  Eye, 
  Layers,
  ArrowRight,
  Trash2,
  Download
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { Package, PackageItem } from '../../types/crm';
import { formatINR } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function PackagesPage() {
  const { packages, services, addPackage, updatePackage, deletePackage, duplicatePackage } = useCrm();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [previewPackage, setPreviewPackage] = useState<Package | null>(null);
  const [deleteConfirmPkg, setDeleteConfirmPkg] = useState<Package | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [presentationMode, setPresentationMode] = useState<'Consolidated' | 'Itemized'>('Itemized');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [items, setItems] = useState<PackageItem[]>([
    {
      serviceId: services[0]?.id || 's1',
      serviceName: services[0]?.serviceName || 'Social Media Management',
      quantity: 1,
      unit: 'Per Month',
      defaultUnitPrice: 42000
    }
  ]);
  const [packageDiscount, setPackageDiscount] = useState(5000);

  const standardPrice = items.reduce((acc, it) => acc + (it.quantity * it.defaultUnitPrice), 0);
  const finalPrice = Math.max(0, standardPrice - packageDiscount);

  const handleOpenAddModal = () => {
    setEditingPackageId(null);
    setName('');
    setDescription('');
    setPresentationMode('Itemized');
    setItems([
      {
        serviceId: services[0]?.id || 's1',
        serviceName: services[0]?.serviceName || 'Social Media Management',
        quantity: 1,
        unit: 'Per Month',
        defaultUnitPrice: 42000
      }
    ]);
    setPackageDiscount(5000);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (pkg: Package) => {
    setEditingPackageId(pkg.id);
    setName(pkg.name);
    setDescription(pkg.description);
    setPresentationMode(pkg.presentationMode);
    setItems([...pkg.items]);
    setPackageDiscount(pkg.packageDiscount);
    setIsAddModalOpen(true);
  };

  const handleAddItem = () => {
    const srv = services.find(s => s.id === selectedServiceId);
    if (!srv) return;
    setItems(prev => [
      ...prev,
      {
        serviceId: srv.id,
        serviceName: srv.serviceName,
        quantity: 1,
        unit: srv.billingUnit,
        defaultUnitPrice: srv.defaultPrice
      }
    ]);
  };

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, quantity: Math.max(1, quantity) } : item));
  };

  const handleUpdateItemUnit = (index: number, unit: string) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, unit } : item));
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || items.length === 0) return;

    try {
      if (editingPackageId) {
        await updatePackage(editingPackageId, {
          name,
          description,
          items,
          standardPrice,
          packageDiscount,
          finalPrice,
          gstRate: 18,
          presentationMode
        });
      } else {
        await addPackage({
          name,
          description,
          items,
          standardPrice,
          packageDiscount,
          finalPrice,
          gstRate: 18,
          presentationMode,
          status: 'Active'
        });
      }

      setIsAddModalOpen(false);
      setEditingPackageId(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to save package');
    }
  };

  const handleDuplicate = async (pkg: Package) => {
    try {
      await duplicatePackage(pkg.id);
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate package');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmPkg) return;
    try {
      await deletePackage(deleteConfirmPkg.id);
      setDeleteConfirmPkg(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete package');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Package ID', 'Package Name', 'Description', 'Deliverables Count', 'Standard Price', 'Discount', 'Final Price', 'Presentation Mode', 'Status'];
    const rows = filteredPackages.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.description.replace(/"/g, '""')}"`,
      p.items.length,
      p.standardPrice,
      p.packageDiscount,
      p.finalPrice,
      p.presentationMode,
      p.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HEXNS_Packages_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>
            Service Packages & Bundles
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '2px' }}>
            Curate multi-deliverable packages with Consolidated or Itemized quotation displays.
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
            <span>+ Create Package</span>
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
          placeholder="Search packages by name or deliverable..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%' }}
        />
      </div>

      {/* Packages Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {filteredPackages.map(pkg => (
          <div 
            key={pkg.id}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: pkg.presentationMode === 'Consolidated' ? '#F3F4F6' : '#EFF6FF',
                    color: pkg.presentationMode === 'Consolidated' ? '#374151' : '#1D4ED8'
                  }}>
                    {pkg.presentationMode} Mode
                  </span>
                  {pkg.duration && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#92400E'
                    }}>
                      {pkg.duration}
                    </span>
                  )}
                </div>
                <Badge status={pkg.status} />
              </div>

              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#171717', marginTop: '8px' }}>
                {pkg.name}
              </h2>
              <p style={{ fontSize: '12.5px', color: '#737373', marginTop: '4px', minHeight: '36px' }}>
                {pkg.description}
              </p>

              {/* Scope & Items */}
              {pkg.scope && (
                <div style={{ marginTop: '0.5rem', padding: '0.45rem 0.65rem', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '12px' }}>
                  <strong style={{ color: '#374151' }}>Scope: </strong>
                  <span style={{ color: '#4B5563' }}>{pkg.scope}</span>
                </div>
              )}

              {pkg.items.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>
                    Included Deliverables ({pkg.items.length})
                  </span>
                  {pkg.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px dashed #F3F4F6' }}>
                      <span>• {it.quantity}x {it.serviceName} ({it.unit})</span>
                      <span style={{ color: '#737373' }}>{formatINR(it.defaultUnitPrice * it.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Footer */}
            <div style={{
              borderTop: '1px solid #E5E7EB',
              paddingTop: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '11.5px' }}>
                  <span style={{ color: '#737373' }}>
                    Base: <strong style={{ color: '#171717' }}>{formatINR(pkg.standardPrice)}</strong>
                  </span>
                  {pkg.minPrice !== undefined && (
                    <span style={{ color: '#B45309' }}>
                      Min: <strong style={{ color: '#B45309' }}>{formatINR(pkg.minPrice)}</strong>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#171717', marginTop: '2px' }}>
                  {formatINR(pkg.finalPrice)} <span style={{ fontSize: '12px', fontWeight: 400, color: '#737373' }}>+ 18% GST</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button 
                  onClick={() => setPreviewPackage(pkg)}
                  style={{
                    padding: '0.35rem 0.6rem',
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
                  <span>Preview</span>
                </button>
                <button 
                  onClick={() => handleOpenEditModal(pkg)}
                  style={{ padding: '0.35rem 0.5rem', color: '#2563EB', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                  title="Edit Package"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDuplicate(pkg)}
                  style={{ padding: '0.35rem 0.5rem', color: '#4B5563', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                  title="Duplicate Package"
                >
                  <Copy size={14} />
                </button>
                <button 
                  onClick={() => setDeleteConfirmPkg(pkg)}
                  style={{ padding: '0.35rem 0.5rem', color: '#DC2626', border: '1px solid #E5E7EB', borderRadius: '4px', backgroundColor: '#FFFFFF' }}
                  title="Delete Package"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Package Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPackageId(null);
        }}
        title={editingPackageId ? "Edit Service Package" : "Create Service Package"}
        subtitle="Bundle deliverables with bundled discount pricing."
        maxWidth="680px"
      >
        <form onSubmit={handleSavePackage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Package Name *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. D2C Brand Growth Accelerate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Description</label>
            <textarea 
              rows={2}
              placeholder="Package purpose and timeline..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Quotation Presentation Mode</label>
              <select 
                value={presentationMode}
                onChange={(e) => setPresentationMode(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              >
                <option value="Itemized">Itemized (List deliverables with zeroed line prices)</option>
                <option value="Consolidated">Consolidated (Single lump-sum deliverable line)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>Package Discount (₹)</label>
              <input 
                type="number" 
                value={packageDiscount}
                onChange={(e) => setPackageDiscount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '4px', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Add Services to Package */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#F9FAFB' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#171717' }}>Add Deliverable Items</span>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px' }}>
              <select 
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                style={{ flex: 1, padding: '0.45rem', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '12.5px' }}
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.serviceName} ({formatINR(s.defaultPrice)})</option>
                ))}
              </select>
              <button 
                type="button" 
                onClick={handleAddItem}
                style={{ padding: '0.45rem 0.75rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
              >
                + Add Item
              </button>
            </div>

            {/* Added list with quantity and unit controls */}
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '8px 10px', borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12.5px', gap: '8px' }}>
                  <div style={{ flex: 1, fontWeight: 500 }}>
                    {it.serviceName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#737373' }}>Qty:</label>
                    <input 
                      type="number" 
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleUpdateItemQuantity(idx, parseInt(e.target.value) || 1)}
                      style={{ width: '48px', padding: '2px 4px', border: '1px solid #E5E7EB', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }}
                    />
                    <input 
                      type="text" 
                      value={it.unit}
                      onChange={(e) => handleUpdateItemUnit(idx, e.target.value)}
                      style={{ width: '90px', padding: '2px 4px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11.5px' }}
                    />
                    <span style={{ fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>
                      {formatINR(it.defaultUnitPrice * it.quantity)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveItem(idx)} 
                      style={{ color: '#EF4444', marginLeft: '4px', padding: '2px 6px', fontSize: '14px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      title="Remove Item"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '1px solid #E5E7EB' }}>
            <div>
              <span style={{ fontSize: '11.5px', color: '#737373' }}>Total Deliverables: {items.length}</span>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>Final Price: {formatINR(finalPrice)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPackageId(null);
                }}
                style={{ padding: '0.5rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ padding: '0.5rem 1.25rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontWeight: 600 }}
              >
                {editingPackageId ? "Update Package" : "Save Package"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmPkg && (
        <Modal
          isOpen={Boolean(deleteConfirmPkg)}
          onClose={() => setDeleteConfirmPkg(null)}
          title="Delete Service Package"
          subtitle="This will permanently delete this package bundle."
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '13px', color: '#374151' }}>
              Are you sure you want to delete <strong>{deleteConfirmPkg.name}</strong>? Existing quotations referencing this package will not be impacted.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmPkg(null)}
                style={{ padding: '0.45rem 1rem', border: '1px solid #E5E7EB', borderRadius: '4px', background: '#FFFFFF', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{ padding: '0.45rem 1rem', background: '#DC2626', color: '#FFFFFF', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}
              >
                Delete Package
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Package Preview Modal */}
      {previewPackage && (
        <Modal
          isOpen={Boolean(previewPackage)}
          onClose={() => setPreviewPackage(null)}
          title={`Package Preview: ${previewPackage.name}`}
          subtitle={`Quotation Rendering: ${previewPackage.presentationMode} Mode`}
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '13px', color: '#4B5563' }}>{previewPackage.description}</p>
            
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontWeight: 600, fontSize: '12px' }}>
                Quotation Line Appearance ({previewPackage.presentationMode})
              </div>
              {previewPackage.presentationMode === 'Consolidated' ? (
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <div>
                    <strong>{previewPackage.name}</strong>
                    <div style={{ fontSize: '11.5px', color: '#737373' }}>Lump-sum turnkey delivery package</div>
                  </div>
                  <strong style={{ fontSize: '15px' }}>{formatINR(previewPackage.finalPrice)}</strong>
                </div>
              ) : (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {previewPackage.items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span>{it.quantity}x {it.serviceName} ({it.unit})</span>
                      <span style={{ color: '#737373' }}>Included in Package</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px' }}>
                    <span>Total Package Fee:</span>
                    <span>{formatINR(previewPackage.finalPrice)}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
              <button 
                onClick={() => setPreviewPackage(null)}
                style={{ padding: '0.45rem 1rem', background: '#171717', color: '#FFFFFF', borderRadius: '4px', fontSize: '13px' }}
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
